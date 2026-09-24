import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Calculator, Download, Loader2, Plus, WalletCards } from "lucide-react";
import { money, type PayrollRecord } from "@/lib/hrData";
import { insertErpRow, listErpRows } from "@/lib/erpData";

const OT_RATE = 500;
/** Field Atlas: payroll is a calculation sheet—explicit inputs, visible arithmetic, decisive net result. */
export default function Payroll() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void (async () => {
      try {
        const [employeeRows, payrollRows] = await Promise.all([
          listErpRows<any>(
            "employees",
            "id,full_name,department,basic_salary,daily_wage,bank_name,bank_branch_code,bank_account_number,bank_account_name"
          ),
          listErpRows<any>(
            "payroll",
            "id,employee_id,workspace,period_start,days_worked,basic_salary,allowances,deductions,net_salary,status"
          ),
        ]);
        setEmployees(
          employeeRows.map(row => ({
            id: row.id,
            name: row.full_name,
            company_id: row.department || "Unassigned",
            basic_salary: Number(row.basic_salary) || 0,
            bank_name: row.bank_name,
            branch_code: row.bank_branch_code,
            account_number: row.bank_account_number,
            account_name: row.bank_account_name,
          }))
        );
        setRecords(
          payrollRows.map(row => ({
            id: row.id,
            employee_id: row.employee_id,
            company_id: row.workspace || "Unassigned",
            work_days: Number(row.days_worked) || 0,
            ot_hours: 0,
            advances: Number(row.deductions) || 0,
            basic_salary: Number(row.basic_salary) || 0,
            net_salary: Number(row.net_salary) || 0,
            processed_at: row.period_start,
          }))
        );
      } catch (cause) {
        toast.error(
          cause instanceof Error
            ? cause.message
            : "Payroll could not be loaded from Supabase."
        );
      }
    })();
  }, []);
  const [form, setForm] = useState({
    employee_id: "",
    company_id: "",
    work_days: "26",
    ot_hours: "0",
    advances: "0",
  });
  const selectedEmployee = employees.find(
    employee => employee.id === form.employee_id
  );
  const basicSalary = Number(selectedEmployee?.basic_salary ?? 0);
  const otHours = Number(form.ot_hours) || 0;
  const advances = Number(form.advances) || 0;
  const netSalary = useMemo(
    () => basicSalary + otHours * OT_RATE - advances,
    [basicSalary, otHours, advances]
  );
  const companyName = (id: string) => id || "—";
  const employeeName = (id: string) =>
    employees.find(employee => employee.id === id)?.name ?? "Unknown employee";
  const exportBankTransferCsv = () => {
    const headers = [
      "Employee Name",
      "Bank Name",
      "Branch Name / Code",
      "Account Name",
      "Account Number",
      "Net Salary (LKR)",
      "Payment Reference",
    ];
    const rows = records.map(record => {
      const employee = employees.find(item => item.id === record.employee_id);
      return [
        employee?.name ?? "",
        employee?.bank_name ?? "Bank details pending",
        employee?.branch_code ?? "",
        employee?.account_name ?? employee?.name ?? "",
        employee?.account_number ?? "",
        String(record.net_salary),
        `Salary payment - ${record.processed_at}`,
      ];
    });
    const csv = [headers, ...rows]
      .map(row =>
        row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `field-atlas-payroll-bank-transfer-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${records.length} salary payments in LKR.`);
  };

  const setEmployee = (id: string) => {
    const employee = employees.find(item => item.id === id);
    setForm({
      ...form,
      employee_id: id,
      company_id: employee?.company_id ?? "",
    });
  };
  const savePayroll = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.employee_id || !form.company_id)
      return toast.error("Select an employee and company first.");
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const row = await insertErpRow<any>(
        "payroll",
        {
          employee_id: form.employee_id,
          workspace: form.company_id,
          period_start: today,
          period_end: today,
          days_worked: Number(form.work_days) || 0,
          basic_salary: basicSalary,
          allowances: otHours * OT_RATE,
          deductions: advances,
          status: "Approved",
        },
        "id,employee_id,workspace,period_start,days_worked,basic_salary,allowances,deductions,net_salary,status"
      );
      setRecords(current => [
        {
          id: row.id,
          employee_id: row.employee_id,
          company_id: row.workspace,
          work_days: Number(row.days_worked),
          ot_hours: otHours,
          advances: Number(row.deductions),
          basic_salary: Number(row.basic_salary),
          net_salary: Number(row.net_salary),
          processed_at: row.period_start,
        },
        ...current,
      ]);
      setForm({
        employee_id: "",
        company_id: "",
        work_days: "26",
        ot_hours: "0",
        advances: "0",
      });
      toast.success("Payroll record saved to Supabase.");
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Payroll could not be saved to Supabase."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative overflow-hidden px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="relative mx-auto max-w-[1440px]">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow">People index / 06</p>
            <h2 className="mt-4 font-display text-[36px] font-extrabold tracking-[-0.06em] sm:text-[46px]">
              Payroll calculator
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#627A88]">
              Process a monthly salary snapshot using the current employee
              record, overtime at{" "}
              <strong className="text-[#19364D]">
                {OT_RATE.toLocaleString()} / hour
              </strong>
              , and advances already paid. All employee and payroll records are
              loaded from and saved to Supabase.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-end">
            <button
              type="button"
              onClick={exportBankTransferCsv}
              className="flex items-center gap-2 rounded-xl border border-[#D9E2E7] bg-white px-4 py-3 text-xs font-extrabold text-[#476174] transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <Download size={15} /> Export Bank Transfer CSV
            </button>
            <Link
              href="/payroll/settlement"
              className="flex items-center gap-2 rounded-xl bg-[#0066CC] px-4 py-3 text-xs font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#0052A5]"
            >
              <WalletCards size={15} /> Final settlement
            </Link>
            <Link
              href="/employees"
              className="flex items-center gap-2 rounded-xl border border-[#D9E2E7] bg-white px-4 py-3 text-xs font-extrabold text-[#476174] transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <Plus size={16} /> Manage employees
            </Link>
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <form onSubmit={savePayroll} className="atlas-panel p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow">New calculation</p>
                <h3 className="mt-2 font-display text-xl font-extrabold tracking-[-0.04em]">
                  Process salary
                </h3>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#FFF6E2] text-[#A27726]">
                <Calculator size={18} />
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <SelectField
                label="Employee"
                value={form.employee_id}
                onChange={setEmployee}
                options={employees.map(employee => ({
                  value: employee.id,
                  label: `${employee.name} · ${money(employee.basic_salary)}`,
                }))}
                placeholder="Select employee"
              />
              <SelectField
                label="Company"
                value={form.company_id}
                onChange={value => setForm({ ...form, company_id: value })}
                options={Array.from(
                  new Set(employees.map(employee => employee.company_id))
                ).map(company => ({ value: company, label: company }))}
                placeholder="Select company"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Work days"
                  value={form.work_days}
                  onChange={value => setForm({ ...form, work_days: value })}
                />
                <NumberField
                  label="OT hours"
                  value={form.ot_hours}
                  onChange={value => setForm({ ...form, ot_hours: value })}
                />
                <NumberField
                  label="Advances"
                  value={form.advances}
                  onChange={value => setForm({ ...form, advances: value })}
                />
              </div>
            </div>
            <div className="mt-6 border-t border-[#E2E9ED] pt-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#78909D]">
                    Net salary
                  </p>
                  <p
                    className={`mt-1 font-display text-[34px] font-extrabold tracking-[-0.06em] ${netSalary < 0 ? "text-[#A35749]" : "text-[#10263D]"}`}
                  >
                    {money(netSalary)}
                  </p>
                </div>
                <p className="text-right text-[10px] font-bold leading-5 text-[#78909D]">
                  Basic {money(basicSalary)}
                  <br />+ OT {money(otHours * OT_RATE)}
                  <br />− Advances {money(advances)}
                </p>
              </div>
            </div>
            <button
              disabled={saving || !selectedEmployee}
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#10263D] text-sm font-extrabold text-white transition hover:bg-[#193B57] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />} Save
              processed salary
            </button>
          </form>
          <section className="atlas-panel overflow-hidden">
            <div className="flex items-start justify-between border-b border-[#E2E9ED] px-5 py-5 sm:px-6">
              <div>
                <p className="eyebrow">Payroll ledger</p>
                <h3 className="mt-2 font-display text-xl font-extrabold tracking-[-0.04em]">
                  Processed records{" "}
                  <span className="ml-1 text-sm font-semibold text-[#8CA0AB]">
                    · {records.length}
                  </span>
                </h3>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#EAF3F8] text-[#34647F]">
                <WalletCards size={18} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead className="bg-[#F7FAFB] text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#8CA0AB]">
                  <tr>
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Company</th>
                    <th className="px-6 py-3">Bank payout</th>
                    <th className="px-6 py-3">Work / OT</th>
                    <th className="px-6 py-3">Advances</th>
                    <th className="px-6 py-3 text-right">Net salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E9ED]">
                  {records.map(record => (
                    <tr
                      key={record.id}
                      className="transition hover:bg-[#F7FAFB]"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-extrabold text-[#19364D]">
                          {employeeName(record.employee_id)}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8CA0AB]">
                          {record.processed_at}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#627A88]">
                        {companyName(record.company_id)}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#627A88]">
                        <span className="font-extrabold text-[#19364D]">
                          {employees.find(
                            item => item.id === record.employee_id
                          )?.bank_name || "Bank pending"}
                        </span>
                        <br />
                        {employees.find(item => item.id === record.employee_id)
                          ?.branch_code || "—"}{" "}
                        ·{" "}
                        {employees.find(item => item.id === record.employee_id)
                          ?.account_number || "—"}
                        <br />
                        <span className="text-[10px]">
                          {employees.find(
                            item => item.id === record.employee_id
                          )?.account_name ||
                            employees.find(
                              item => item.id === record.employee_id
                            )?.name ||
                            "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#627A88]">
                        {record.work_days} days · {record.ot_hours} hrs
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#A35749]">
                        {money(record.advances)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-extrabold text-[#19364D]">
                        {money(record.net_salary)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#78909D]">
        {label}
      </span>
      <select
        required
        value={value}
        onChange={event => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-[#D9E2E7] bg-white px-3 text-sm font-semibold text-[#19364D] outline-none focus:border-[#E5A83B]"
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#78909D]">
        {label}
      </span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={event => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-[#D9E2E7] bg-white px-3 text-sm font-semibold text-[#19364D] outline-none focus:border-[#E5A83B]"
      />
    </label>
  );
}
