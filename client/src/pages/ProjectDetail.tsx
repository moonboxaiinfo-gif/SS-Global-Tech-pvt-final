import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CircleDollarSign,
  FilePlus2,
  Loader2,
  Plus,
  ReceiptText,
  WalletCards,
  X,
} from "lucide-react";
import { companyName } from "@/lib/projectData";
import { initialEmployees } from "@/lib/hrData";
import { saveLaborAllocation } from "@/lib/payrollSync";

import { insertErpRow, listErpRows, updateErpRow } from "@/lib/erpData";
import {
  expenseCategories,
  initialProjectExpenses,
  initialProjects,
  money,
  projectSpend,
  settlementStatus,
  balanceDue,
  amountReceived,
  projectStatuses,
  type ExpenseCategory,
  type Project,
  type ProjectExpense,
  type ProjectPayment,
  type ProjectStatus,
} from "@/lib/projectData";

/** SS Global Project Costing: advances, balance receipts, cash flow, spend, and P&L stay synchronized in one view. */
export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [expenses, setExpenses] = useState<ProjectExpense[]>([]);
  const [showExpense, setShowExpense] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "Materials" as ExpenseCategory,
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    vendor: "",
    employeeId: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    method: "Bank transfer",
    note: "",
  });
  useEffect(() => {
    void (async () => {
      try {
        const [rows, expenseRows] = await Promise.all([
          listErpRows<any>(
            "projects",
            "id,workspace,source,project_name,description,customer_name,customer_phone,location,target_start_date,deadline,status,agreed_price,customer_advance_paid,budget"
          ),
          listErpRows<any>(
            "project_expenses",
            "id,project_id,category,amount,description,expense_date,payment_method"
          ),
        ]);
        const row = rows.find(item => item.id === id);
        if (row)
          setProject({
            id: row.id,
            name: row.project_name,
            companyId: row.workspace || "solar",
            businessField: row.workspace || "solar",
            customer: row.customer_name,
            customerPhone: row.customer_phone || "",
            description: row.description || "",
            location: row.location || "",
            status: row.status,
            budget: Number(row.budget) || 0,
            contractValue: Number(row.agreed_price) || 0,
            advanceReceived: Number(row.customer_advance_paid) || 0,
            balancePayments: [],
            startDate: row.target_start_date || "",
            targetDate: row.deadline || "",
            progress: 0,
            partner: row.source === "Direct" ? undefined : row.source,
          });
        setExpenses(
          expenseRows
            .filter(item => item.project_id === id)
            .map(item => ({
              id: item.id,
              projectId: item.project_id,
              category: item.category,
              amount: Number(item.amount) || 0,
              description: item.description || "",
              date: item.expense_date,
              vendor: item.payment_method || "",
            }))
        );
      } catch (cause) {
        toast.error(
          cause instanceof Error
            ? cause.message
            : "Project detail could not be loaded from Supabase."
        );
      }
    })();
  }, [id]);
  const projectExpenses = useMemo(
    () =>
      project
        ? expenses.filter(expense => expense.projectId === project.id)
        : [],
    [expenses, project?.id]
  );
  const material = projectExpenses
    .filter(item => item.category === "Materials")
    .reduce((sum, item) => sum + item.amount, 0);
  const labour = projectExpenses
    .filter(item => item.category === "Labour")
    .reduce((sum, item) => sum + item.amount, 0);
  const other = projectExpenses
    .filter(item => !["Materials", "Labour"].includes(item.category))
    .reduce((sum, item) => sum + item.amount, 0);
  const spent = material + labour + other;
  const received = project ? amountReceived(project) : 0;
  const outstanding = project ? balanceDue(project) : 0;
  const profit = project ? project.contractValue - spent : 0;
  const margin = project?.contractValue
    ? (profit / project.contractValue) * 100
    : 0;
  const spendPct = project?.budget
    ? Math.min(100, Math.round((spent / project.budget) * 100))
    : 0;
  const updateStatus = async (status: ProjectStatus) => {
    if (!project) return;
    try {
      await updateErpRow("projects", project.id, { status });
      setProject({ ...project, status });
      toast.success(`Project status changed to ${status} in Supabase.`);
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Project status could not be saved."
      );
    }
  };
  const recordPayment = (event: FormEvent) => {
    event.preventDefault();
    if (!project) return;
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0 || amount > outstanding)
      return toast.error(`Enter a payment up to ${money(outstanding)}.`);
    setSaving(true);
    const payment: ProjectPayment = {
      id: `pay-${Date.now()}`,
      projectId: project.id,
      amount,
      date: paymentForm.date,
      method: paymentForm.method,
      note: paymentForm.note || "Balance settlement",
    };
    insertErpRow<{ id: string }>(
      "bank_transactions",
      {
        workspace: companyName(project.companyId),
        transaction_type: "Income",
        account_name:
          payment.method === "Cash" ? "Cash in Hand" : "Bank Account",
        transaction_date: payment.date,
        amount,
        category: "Project balance payment",
        description: payment.note,
        project_id: project.id,
      },
      "id"
    )
      .then(() => toast.success("Balance receipt synced to Supabase."))
      .catch(() =>
        toast.warning(
          "Receipt saved locally; remote project payment sync is unavailable."
        )
      );
    setProject(current =>
      current
        ? { ...current, balancePayments: [...current.balancePayments, payment] }
        : current
    );
    setPaymentForm({
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      method: "Bank transfer",
      note: "",
    });
    setShowPayment(false);
    setSaving(false);
  };
  const saveExpense = (event: FormEvent) => {
    event.preventDefault();
    if (!project) return;
    if (
      !expenseForm.description.trim() ||
      !expenseForm.amount ||
      !expenseForm.vendor.trim()
    )
      return toast.error("Add a description, vendor, and amount.");
    if (
      expenseForm.category === "Labour" &&
      (!expenseForm.employeeId || expenseForm.employeeId === "unassigned")
    )
      return toast.error(
        "Select the employee receiving this labor allocation."
      );
    setSaving(true);
    const expenseId = `exp-${Date.now()}`;
    const amount = Number(expenseForm.amount);
    const expense = {
      id: expenseId,
      projectId: project.id,
      category: expenseForm.category,
      description: expenseForm.description.trim(),
      amount,
      date: expenseForm.date,
      vendor: expenseForm.vendor.trim(),
      employeeId:
        expenseForm.category === "Labour"
          ? expenseForm.employeeId || undefined
          : undefined,
    };
    insertErpRow<{ id: string }>(
      "project_expenses",
      {
        project_id: project.id,
        employee_id:
          expense.employeeId && !expense.employeeId.startsWith("emp-")
            ? expense.employeeId
            : null,
        workspace: companyName(project.companyId),
        category: expense.category,
        amount,
        description: `${expense.description} · ${expense.vendor}`,
        expense_date: expense.date,
        payment_method: "Cash",
      },
      "id"
    )
      .then(() => toast.success("Expense synced to Supabase."))
      .catch(() =>
        toast.warning(
          "Expense saved locally; remote project expense sync is unavailable."
        )
      );
    setExpenses(current => [expense, ...current]);
    if (expense.category === "Labour" && expense.employeeId) {
      saveLaborAllocation({
        id: `labor-${expenseId}`,
        projectId: project.id,
        employeeId: expense.employeeId,
        amount,
        date: expense.date,
        note: expense.description,
      });
    }
    setExpenseForm({
      category: "Materials",
      description: "",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      vendor: "",
      employeeId: "",
    });
    setShowExpense(false);
    setSaving(false);
  };
  if (!project)
    return (
      <div className="relative overflow-hidden px-5 pb-12 pt-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-xs font-extrabold text-[#627A88] hover:text-[#0066CC]"
          >
            <ArrowLeft size={15} /> Back to projects
          </Link>
          <section className="atlas-panel mt-6 p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#FBEFEB] text-[#A35749]">
              <BriefcaseBusiness size={22} />
            </div>
            <h2 className="mt-5 font-display text-2xl font-extrabold text-[#0F172A]">
              Project not found
            </h2>
            <p className="mt-3 text-sm font-semibold text-[#627A88]">
              This project may have been removed or is not available in the
              current local workspace.
            </p>
            <Link
              href="/projects"
              className="mt-5 inline-flex rounded-xl bg-[#0066CC] px-4 py-3 text-xs font-extrabold text-white"
            >
              Return to projects
            </Link>
          </section>
        </div>
      </div>
    );
  return (
    <div className="relative overflow-hidden px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="relative mx-auto max-w-[1440px]">
        <Link
          href="/projects"
          className="mb-6 inline-flex items-center gap-2 text-xs font-extrabold text-[#627A88] transition hover:text-[#0066CC]"
        >
          <ArrowLeft size={15} /> Back to projects
        </Link>
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <p className="eyebrow text-[#0052A5]">
                Project costing / {project.id}
              </p>
              <StatusBadge status={project.status} />
              <SettlementBadge status={settlementStatus(project)} />
              <select
                aria-label="Project Status"
                value={project.status}
                onChange={event =>
                  updateStatus(event.target.value as ProjectStatus)
                }
                className="field-input h-8 w-auto min-w-32 px-2 py-1 text-[10px] font-extrabold"
              >
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
            <h2 className="max-w-3xl font-display text-[36px] font-extrabold tracking-[-0.06em] text-[#0F172A] sm:text-[46px]">
              {project.name}
            </h2>
            <p className="mt-3 text-sm font-semibold text-[#627A88]">
              {project.customer} · {companyName(project.companyId)}
              {project.partner ? ` · ${project.partner}` : ""} ·{" "}
              {project.startDate} → {project.targetDate}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowPayment(true)}
              disabled={!outstanding}
              className="flex items-center gap-2 rounded-xl bg-[#0066CC] px-4 py-3 text-xs font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#0052A5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} /> Record balance payment
            </button>
            <button
              onClick={() => setShowExpense(true)}
              className="flex items-center gap-2 rounded-xl border border-[#BFD5E8] bg-white px-4 py-3 text-xs font-extrabold text-[#0052A5] transition hover:bg-[#EAF3F8]"
            >
              <FilePlus2 size={16} /> Log expense
            </button>
          </div>
        </div>
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            label="Total project value"
            value={money(project.contractValue)}
            icon={CircleDollarSign}
            tone="blue"
          />
          <Metric
            label="Advance received"
            value={money(project.advanceReceived)}
            icon={WalletCards}
            tone="amber"
          />
          <Metric
            label="Balance received"
            value={money(received - project.advanceReceived)}
            icon={ReceiptText}
            tone="green"
          />
          <Metric
            label="Outstanding balance"
            value={money(outstanding)}
            icon={CircleDollarSign}
            tone={outstanding ? "coral" : "green"}
          />
          <Metric
            label="Cash flow net"
            value={money(received - spent)}
            icon={CircleDollarSign}
            tone="blue"
          />
        </div>
        <section className="atlas-panel mb-6 overflow-hidden">
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <p className="eyebrow">Final balance reconciliation</p>
              <h3 className="mt-2 font-display text-xl font-extrabold text-[#0F172A] ">
                {settlementStatus(project)}{" "}
                <span className="text-sm font-semibold text-[#6B7280]">
                  · {money(outstanding)} still due
                </span>
              </h3>
              <div className="mt-5 h-4 overflow-hidden rounded-full bg-[#E8EEF1]">
                <div
                  className="h-full rounded-full bg-[#0066CC] transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((received / project.contractValue) * 100))}%`,
                  }}
                />
              </div>
              <div className="mt-3 flex justify-between text-[10px] font-extrabold uppercase tracking-[.12em] text-[#8CA0AB]">
                <span>Received {money(received)}</span>
                <span>Contract {money(project.contractValue)}</span>
              </div>
            </div>
            <div className="rounded-xl bg-[#F4F9FD] p-5 ">
              <p className="field-label">Project cash flow</p>
              <p className="mt-2 text-2xl font-extrabold text-[#0066CC]">
                {money(received - spent)}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#627A88]">
                Receipts less logged project expenses
              </p>
            </div>
          </div>
        </section>
        <section className="atlas-panel mb-6 overflow-hidden">
          <div className="flex flex-col justify-between gap-4 border-b border-[#E5E7EB] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <p className="eyebrow">Budget control</p>
              <h3 className="mt-2 font-display text-xl font-extrabold text-[#0F172A] ">
                Actual spent vs allocated budget
              </h3>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-display text-xl font-extrabold text-[#0F172A] ">
                {money(spent)}{" "}
                <span className="text-sm font-semibold text-[#8CA0AB]">
                  / {money(project.budget)}
                </span>
              </p>
              <p
                className={`mt-1 text-[11px] font-extrabold ${spendPct > 90 ? "text-[#A35749]" : "text-[#0066CC]"}`}
              >
                {spendPct}% of budget committed
              </p>
            </div>
          </div>
          <div className="px-5 py-5 sm:px-6">
            <div className="relative h-4 overflow-hidden rounded-full bg-[#E8EEF1]">
              <div
                className={`h-full rounded-full transition-all ${spendPct > 90 ? "bg-[#C57B67]" : "bg-[#0066CC]"}`}
                style={{ width: `${spendPct}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between text-[10px] font-extrabold uppercase tracking-[.12em] text-[#8CA0AB]">
              <span>0</span>
              <span>
                Remaining {money(Math.max(0, project.budget - spent))}
              </span>
              <span>Budget</span>
            </div>
          </div>
        </section>
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            label="Material cost"
            value={money(material)}
            icon={BriefcaseBusiness}
            tone="amber"
          />
          <Metric
            label="Labour / OT"
            value={money(labour)}
            icon={WalletCards}
            tone="green"
          />
          <Metric
            label="Other expenses"
            value={money(other)}
            icon={ReceiptText}
            tone="coral"
          />
          <Metric
            label="Profit / loss"
            value={money(profit)}
            icon={CircleDollarSign}
            tone={profit < 0 ? "coral" : "blue"}
          />
          <Metric
            label="Profit margin"
            value={`${margin.toFixed(1)}%`}
            icon={CircleDollarSign}
            tone={margin < 0 ? "coral" : "blue"}
          />
        </div>
        <section className="atlas-panel mb-6 overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[#E5E7EB] px-5 py-5 sm:px-6">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#EAF3F8] text-[#0066CC]">
              <ReceiptText size={16} />
            </span>
            <div>
              <p className="eyebrow">Cash receipts</p>
              <h3 className="mt-1 font-display text-xl font-extrabold text-[#0F172A] ">
                Balance payment history · {project.balancePayments.length}{" "}
                entries
              </h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead className="bg-[#F8FAFC] text-[10px] font-extrabold uppercase tracking-[.14em] text-[#6B7280]">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Note</th>
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {project.balancePayments.map(payment => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 text-xs font-semibold text-[#627A88]">
                      {payment.date}
                    </td>
                    <td className="px-6 py-4 text-sm font-extrabold text-[#0F172A] ">
                      {payment.note}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-[#627A88]">
                      {payment.method}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-extrabold text-emerald-600">
                      {money(payment.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="atlas-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-5 sm:px-6">
            <div>
              <p className="eyebrow">Cost register</p>
              <h3 className="mt-1 font-display text-xl font-extrabold text-[#0F172A] ">
                Expense log · {projectExpenses.length} entries
              </h3>
            </div>
            <p className="hidden text-xs font-semibold text-[#78909D] sm:block">
              Profit / loss = project value − actual spent
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-[#F8FAFC] text-[10px] font-extrabold uppercase tracking-[.15em] text-[#6B7280]">
                <tr>
                  <th className="px-6 py-3">Expense</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Vendor</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {projectExpenses.map(expense => (
                  <tr
                    key={expense.id}
                    className="transition hover:bg-[#F8FAFC] "
                  >
                    <td className="px-6 py-4 text-sm font-extrabold text-[#0F172A] ">
                      {expense.description}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-[#F1F5F7] px-2.5 py-1 text-[10px] font-extrabold text-[#627A88]">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-[#627A88]">
                      {expense.vendor}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-[#627A88]">
                      {expense.date}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-extrabold text-[#0F172A] ">
                      {money(expense.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        {showPayment && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-[#0F172A]/50 p-5 backdrop-blur-sm">
            <form
              onSubmit={recordPayment}
              className="w-full max-w-lg rounded-2xl border border-[#D9E2E7] bg-white p-6 shadow-2xl "
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow">Project receipt</p>
                  <h3 className="mt-2 font-display text-2xl font-extrabold text-[#0F172A] ">
                    Record balance payment
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[#627A88]">
                    Outstanding balance: {money(outstanding)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPayment(false)}
                  className="rounded-lg p-2 text-[#78909D] hover:bg-[#F1F5F7]"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Payment amount (LKR)"
                  type="number"
                  value={paymentForm.amount}
                  onChange={value =>
                    setPaymentForm({ ...paymentForm, amount: value })
                  }
                  placeholder={String(outstanding)}
                  required
                />
                <Field
                  label="Receipt date"
                  type="date"
                  value={paymentForm.date}
                  onChange={value =>
                    setPaymentForm({ ...paymentForm, date: value })
                  }
                  required
                />
                <Select
                  label="Payment method"
                  value={paymentForm.method}
                  onChange={value =>
                    setPaymentForm({ ...paymentForm, method: value })
                  }
                  options={["Bank transfer", "Cash", "Cheque", "Card"].map(
                    value => ({ value, label: value })
                  )}
                />
                <Field
                  label="Reference / note"
                  value={paymentForm.note}
                  onChange={value =>
                    setPaymentForm({ ...paymentForm, note: value })
                  }
                  placeholder="e.g. Final release"
                />
              </div>
              <button
                disabled={saving}
                className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0066CC] text-sm font-extrabold text-white disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />} Save
                payment to ledger
              </button>
            </form>
          </div>
        )}
        {showExpense && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-[#0F172A]/50 p-5 backdrop-blur-sm">
            <form
              onSubmit={saveExpense}
              className="w-full max-w-lg rounded-2xl border border-[#D9E2E7] bg-white p-6 shadow-2xl "
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow">Project cost entry</p>
                  <h3 className="mt-2 font-display text-2xl font-extrabold text-[#0F172A] ">
                    Log expense
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExpense(false)}
                  className="rounded-lg p-2 text-[#78909D] hover:bg-[#F1F5F7]"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Select
                  label="Category"
                  value={expenseForm.category}
                  onChange={value =>
                    setExpenseForm({
                      ...expenseForm,
                      category: value as ExpenseCategory,
                    })
                  }
                  options={expenseCategories.map(category => ({
                    value: category,
                    label: category,
                  }))}
                />
                {expenseForm.category === "Labour" && (
                  <Select
                    label="Employee salary ledger"
                    value={expenseForm.employeeId}
                    onChange={value =>
                      setExpenseForm({ ...expenseForm, employeeId: value })
                    }
                    options={[
                      { value: "unassigned", label: "Select employee" },
                      ...initialEmployees
                        .filter(employee => employee.status === "Active")
                        .map(employee => ({
                          value: employee.id,
                          label: `${employee.name} · ${money(employee.daily_wage)}/day`,
                        })),
                    ]}
                  />
                )}
                <Field
                  label="Amount (LKR)"
                  type="number"
                  value={expenseForm.amount}
                  onChange={value =>
                    setExpenseForm({ ...expenseForm, amount: value })
                  }
                  placeholder="e.g. 25000"
                  required
                />
                <Field
                  label="Description"
                  value={expenseForm.description}
                  onChange={value =>
                    setExpenseForm({ ...expenseForm, description: value })
                  }
                  placeholder="e.g. July installation labor"
                  required
                />
                <Field
                  label="Vendor / payee"
                  value={expenseForm.vendor}
                  onChange={value =>
                    setExpenseForm({ ...expenseForm, vendor: value })
                  }
                  placeholder="e.g. Field team"
                  required
                />
                <Field
                  label="Date"
                  type="date"
                  value={expenseForm.date}
                  onChange={value =>
                    setExpenseForm({ ...expenseForm, date: value })
                  }
                  required
                />
              </div>
              <button
                disabled={saving}
                className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#10263D] text-sm font-extrabold text-white disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />} Save
                expense
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof CircleDollarSign;
  tone: "blue" | "amber" | "green" | "coral";
}) {
  const styles = {
    blue: "bg-[#EAF3F8] text-[#0066CC]",
    amber: "bg-[#FFF6E2] text-[#9A6A13]",
    green: "bg-[#EDF6EF] text-[#4D775D]",
    coral: "bg-[#FBEFEB] text-[#A35749]",
  };
  return (
    <div className="atlas-panel p-4">
      <div className="flex items-center gap-2">
        <div
          className={`grid h-8 w-8 place-items-center rounded-lg ${styles[tone]}`}
        >
          <Icon size={15} />
        </div>
        <p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#78909D]">
          {label}
        </p>
      </div>
      <p className="mt-4 font-display text-xl font-extrabold tracking-[-.05em] text-[#0F172A] ">
        {value}
      </p>
    </div>
  );
}
function StatusBadge({ status }: { status: ProjectStatus }) {
  const classes = {
    Planning: "bg-[#EAF3F8] text-[#34647F]",
    "In Progress": "bg-[#FFF6E2] text-[#9A6A13]",
    Completed: "bg-[#EDF6EF] text-[#4D775D]",
    "On Hold": "bg-[#FBEFEB] text-[#A35749]",
  };
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${classes[status]}`}
    >
      {status}
    </span>
  );
}
function SettlementBadge({ status }: { status: string }) {
  const classes =
    status === "Fully Settled"
      ? "bg-[#EDF6EF] text-[#4D775D]"
      : status === "Partially Settled"
        ? "bg-[#FFF6E2] text-[#9A6A13]"
        : "bg-[#EAF3F8] text-[#34647F]";
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${classes}`}
    >
      {status}
    </span>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        required={required}
        min={type === "number" ? 0 : undefined}
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="field-input"
      />
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="field-input"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
