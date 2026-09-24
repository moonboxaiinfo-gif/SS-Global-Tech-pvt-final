import { FormEvent, useEffect, useMemo, useState } from "react";
import { useBusinessField } from "@/contexts/BusinessFieldContext";
import { Link } from "wouter";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  CircleDollarSign,
  FilePlus2,
  Landmark,
  Plus,
  ReceiptText,
  TrendingUp,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  cashPosition,
  monthlyTrend,
  projectProfitability,
  receivableItems,
  currency,
  fieldMetrics,
  businessFieldChart,
  emptyFieldMetrics,
} from "@/lib/accountingData";
import { useNotifications } from "@/contexts/NotificationContext";
import { listErpRows } from "@/lib/erpData";
import { toast } from "sonner";

/** SS Global dashboard: essential cash signals first, soft chart language second, and every action one click away. */
export default function Home() {
  const [period, setPeriod] = useState("This month");
  const [showReminder, setShowReminder] = useState(false);
  const [live, setLive] = useState({
    cash: 0,
    bank: 0,
    revenue: 0,
    expenses: 0,
    projects: 0,
    employees: 0,
    receivables: 0,
    trend: [] as {
      month: string;
      sales: number;
      expenses: number;
      cashFlow: number;
    }[],
  });
  const [reminderForm, setReminderForm] = useState({
    note: "",
    dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    assignee: "Manager",
  });
  const { addReminder } = useNotifications();
  useEffect(() => {
    void (async () => {
      try {
        const [accounts, entries, invoices, projects, employees] =
          await Promise.all([
            listErpRows<any>(
              "finance_accounts",
              "id,account_type,opening_balance"
            ),
            listErpRows<any>(
              "finance_entries",
              "account_id,direction,amount,entry_date"
            ),
            listErpRows<any>("invoices", "amount,status,issue_date,due_date"),
            listErpRows<any>("projects", "id,status"),
            listErpRows<any>("employees", "id"),
          ]);
        const balances = accounts.map(
          account =>
            Number(account.opening_balance || 0) +
            entries
              .filter(entry => entry.account_id === account.id)
              .reduce(
                (sum, entry) =>
                  sum +
                  (entry.direction === "In"
                    ? Number(entry.amount)
                    : -Number(entry.amount)),
                0
              )
        );
        const income = entries
          .filter(entry => entry.direction === "In")
          .reduce((sum, entry) => sum + Number(entry.amount), 0);
        const expense = entries
          .filter(entry => entry.direction === "Out")
          .reduce((sum, entry) => sum + Number(entry.amount), 0);
        const grouped = entries.reduce<
          Record<
            string,
            { month: string; sales: number; expenses: number; cashFlow: number }
          >
        >((map, entry) => {
          const month = String(entry.entry_date || "").slice(0, 7) || "Current";
          map[month] ??= { month, sales: 0, expenses: 0, cashFlow: 0 };
          const amount = Number(entry.amount) || 0;
          if (entry.direction === "In") map[month].sales += amount;
          else map[month].expenses += amount;
          map[month].cashFlow += entry.direction === "In" ? amount : -amount;
          return map;
        }, {});
        setLive({
          cash: balances
            .filter((_, index) => accounts[index]?.account_type === "Cash")
            .reduce((sum, value) => sum + value, 0),
          bank: balances
            .filter((_, index) => accounts[index]?.account_type === "Bank")
            .reduce((sum, value) => sum + value, 0),
          revenue:
            income ||
            invoices.reduce((sum, item) => sum + Number(item.amount || 0), 0),
          expenses: expense,
          projects: projects.length,
          employees: employees.length,
          receivables: invoices
            .filter(item => item.status !== "Paid")
            .reduce((sum, item) => sum + Number(item.amount || 0), 0),
          trend: Object.values(grouped)
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-6),
        });
      } catch (cause) {
        toast.error(
          cause instanceof Error
            ? cause.message
            : "Dashboard data could not be loaded from Supabase."
        );
      }
    })();
  }, []);
  const saveReminder = (event: FormEvent) => {
    event.preventDefault();
    if (!reminderForm.note.trim() || !reminderForm.dueDate) return;
    addReminder({
      note: reminderForm.note.trim(),
      dueDate: reminderForm.dueDate,
      assignee: reminderForm.assignee,
    });
    setReminderForm({
      note: "",
      dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      assignee: "Manager",
    });
    setShowReminder(false);
  };
  const { fieldId, field } = useBusinessField();
  const scopedMetrics =
    fieldId === "all"
      ? {
          revenue: businessFieldChart.reduce(
            (sum, item) => sum + item.revenue,
            0
          ),
          profit: businessFieldChart.reduce(
            (sum, item) => sum + item.profit,
            0
          ),
          projects: businessFieldChart.reduce(
            (sum, item) => sum + item.projects,
            0
          ),
          cash: businessFieldChart.reduce((sum, item) => sum + item.cash, 0),
          employees: businessFieldChart.reduce(
            (sum, item) => sum + item.employees,
            0
          ),
          pendingPayroll: businessFieldChart.reduce(
            (sum, item) => sum + item.pendingPayroll,
            0
          ),
          expenses: businessFieldChart.reduce(
            (sum, item) => sum + item.expenses,
            0
          ),
        }
      : (fieldMetrics[fieldId] ?? emptyFieldMetrics);
  const netCash =
    fieldId === "all"
      ? live.bank + live.cash
      : (scopedMetrics?.cash ?? live.cash + live.bank);
  const cards = useMemo(
    () => [
      {
        label: "Total net cash balance",
        value: currency(netCash),
        note: "Bank + petty cash",
        icon: Landmark,
        tone: "blue",
      },
      {
        label: "Pending payments to receive",
        value: currency(
          fieldId === "all"
            ? live.receivables
            : Math.round(scopedMetrics.revenue * 0.32)
        ),
        note:
          fieldId === "all"
            ? "Customers + sub-contract claims"
            : `${field.label} receivables`,
        icon: ReceiptText,
        tone: "silver",
      },
      {
        label: "Active projects",
        value: String(
          fieldId === "all" ? live.projects : scopedMetrics.projects
        ),
        note:
          fieldId === "all"
            ? "Direct + sub-contract work"
            : `${field.label} projects`,
        icon: BriefcaseBusiness,
        tone: "green",
      },
      {
        label: "This month net profit",
        value: currency(
          fieldId === "all"
            ? live.revenue - live.expenses
            : scopedMetrics.profit
        ),
        note:
          fieldId === "all"
            ? "Across all active workspaces"
            : `After ${field.label} expenses`,
        icon: TrendingUp,
        tone: "navy",
      },
    ],
    [netCash, fieldId, field.label, scopedMetrics]
  );
  const comparisonData =
    fieldId === "all"
      ? [
          {
            name: "Live ledger",
            revenue: live.revenue,
            profit: live.revenue - live.expenses,
          },
        ]
      : projectProfitability.map(item => ({
          name: item.name,
          margin: item.margin,
        }));
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F1F5F7] px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="pointer-events-none absolute right-0 top-0 h-[420px] w-[620px] bg-[radial-gradient(circle_at_top_right,rgba(0,102,204,.10),transparent_64%)]" />
      <div className="relative mx-auto max-w-[1440px]">
        <section className="dashboard-enter mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="mb-4 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.22em] text-[#0052A5]">
              <span className="h-px w-8 bg-[#0066CC]" />
              SS Global / Finance cockpit
            </div>
            <p className="font-display text-xl font-extrabold tracking-[-.04em] text-[#0F172A] dark:text-[#d4b470] sm:text-2xl">
              Hi Shashitha <span aria-hidden="true">👋</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-[#627A88] ">
              Welcome back to SS Global Tech Enterprises Management System
            </p>
            <h2 className="mt-5 max-w-[700px] font-display text-[34px] font-extrabold leading-[1.04] tracking-[-.06em] text-[#0F172A] sm:text-[50px]">
              The numbers that move
              <br />
              <span className="text-[#6B7280]">the business forward.</span>
            </h2>
            <p className="mt-4 max-w-[580px] text-sm leading-6 text-[#627A88] ">
              {fieldId === "all"
                ? "One calm read across all active workspaces."
                : `A focused read of ${field.label} operations.`}{" "}
              Cash, projects, people, and profit in one place.
            </p>
          </div>
          <div
            className="flex rounded-xl border border-[#D9E2E7] bg-white/90 p-1 shadow-[0_8px_24px_rgba(15,23,42,.05)] 
"
          >
            {["This month", "Quarter", "Year to date"].map(option => (
              <button
                key={option}
                onClick={() => setPeriod(option)}
                className={`rounded-lg px-3 py-2 text-[11px] font-bold transition hover:-translate-y-0.5 ${period === option ? "bg-[#1E3A5F] text-white shadow-sm dark:bg-[#d4b470] dark:text-gray-900" : "text-[#64748B] hover:bg-[#E2E8F0] dark:text-[#8a9ca8] dark:hover:bg-white/5"}`}
              >
                {option}
              </button>
            ))}
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, note, icon: Icon, tone }, index) => (
            <Metric
              key={label}
              label={label}
              value={value}
              note={note}
              icon={Icon}
              tone={tone}
              delay={`${index * 60}ms`}
            />
          ))}
        </section>
        <section
          className="dashboard-enter mt-6 flex flex-col gap-3"
          style={{ animationDelay: "260ms" }}
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Action
              href="/finance"
              icon={WalletCards}
              label="New payment receipt"
              detail="Record money received"
            />
            <Action
              href="/finance"
              icon={ReceiptText}
              label="Record expense"
              detail="Capture a cost or petty cash"
            />
            <Action
              href="/payroll/advances"
              icon={UserRound}
              label="Employee advance"
              detail="Create an allowance or advance"
            />
            <Action
              href="/projects/accounting"
              icon={FilePlus2}
              label="New project claim"
              detail="Open a milestone claim"
            />
          </div>
          <button
            onClick={() => setShowReminder(true)}
            className="group inline-flex w-fit items-center gap-2 rounded-xl border border-[#0066CC]/30 bg-white px-4 py-2.5 text-xs font-extrabold text-[#0052A5] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0066CC] hover:shadow-md"
          >
            <Plus size={15} className="transition group-hover:rotate-90" /> Add
            Reminder <CalendarClock size={14} className="text-[#0066CC]" />
          </button>
        </section>
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
          <section
            className="atlas-panel dashboard-enter p-5 sm:p-6"
            style={{ animationDelay: "320ms" }}
          >
            <ChartHeader
              eyebrow="Cash movement / 01"
              title="Sales vs expenses"
            />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={live.trend}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0066CC" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0066CC" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="#E5E7EB"
                    strokeDasharray="4 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                  />
                  <YAxis hide />
                  <Tooltip formatter={(value: number) => currency(value)} />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#0066CC"
                    strokeWidth={3}
                    fill="url(#salesFill)"
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-[#6B7280]">
              <span className="flex items-center gap-2">
                <i className="h-2 w-2 rounded-full bg-[#0066CC]" />
                Sales
              </span>
              <span className="flex items-center gap-2">
                <i className="h-2 w-2 rounded-full bg-[#6B7280]" />
                Expenses
              </span>
              <span className="ml-auto">{period}</span>
            </div>
          </section>
          <section
            className="atlas-panel dashboard-enter p-5 sm:p-6"
            style={{ animationDelay: "380ms" }}
          >
            <ChartHeader
              eyebrow="Cash flow / 02"
              title="Monthly net movement"
            />
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={live.trend}>
                  <CartesianGrid
                    stroke="#E5E7EB"
                    strokeDasharray="4 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                  />
                  <YAxis hide />
                  <Tooltip formatter={(value: number) => currency(value)} />
                  <Line
                    type="monotone"
                    dataKey="cashFlow"
                    stroke="#39D98A"
                    strokeWidth={4}
                    dot={{ r: 3, fill: "#0052A5" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs font-semibold text-[#6B7280]">
              Cash movement remains positive across the last six periods.
            </p>
          </section>
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <section
            className="atlas-panel dashboard-enter overflow-hidden"
            style={{ animationDelay: "440ms" }}
          >
            <ChartHeader
              eyebrow="Receivables / 03"
              title="What is waiting to arrive"
              action={
                <Link
                  href="/finance"
                  className="text-[11px] font-extrabold text-[#0066CC]"
                >
                  View ledger <ArrowUpRight size={13} className="inline" />
                </Link>
              }
            />
            <div className="divide-y divide-[#E5E7EB]">
              {receivableItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-5 py-4 transition hover:bg-[#F8FAFC] sm:px-6"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#E5E7EB] text-[#0052A5]">
                    <CircleDollarSign size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[#0F172A] ">
                      {item.customer}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold text-[#6B7280]">
                      {item.company} · due {item.due}
                    </p>
                  </div>
                  <span className="font-display text-sm font-extrabold text-[#0F172A] ">
                    {currency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section
            className="atlas-panel dashboard-enter p-5 sm:p-6"
            style={{ animationDelay: "500ms" }}
          >
            <ChartHeader
              eyebrow={`${fieldId === "all" ? "Business field comparison" : field.label + " performance"} / 04`}
              title={
                fieldId === "all"
                  ? "Revenue & profit by field"
                  : "Margin at a glance"
              }
              action={
                <Link
                  href="/projects"
                  className="text-[11px] font-extrabold text-[#0066CC]"
                >
                  Open projects <ArrowUpRight size={13} className="inline" />
                </Link>
              }
            />
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonData}
                  layout="vertical"
                  margin={{ left: 12, right: 18, top: 8, bottom: 8 }}
                  barCategoryGap="24%"
                  barGap={6}
                >
                  <CartesianGrid
                    stroke="#E5E7EB"
                    strokeDasharray="4 4"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    domain={[0, "dataMax"]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    tickFormatter={value =>
                      `${Math.round(Number(value) / 1000)}k`
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                  />
                  <Tooltip formatter={(value: number) => currency(value)} />
                  <Bar
                    dataKey={fieldId === "all" ? "revenue" : "margin"}
                    name={fieldId === "all" ? "Revenue" : "Margin"}
                    fill="#0066CC"
                    radius={[0, 6, 6, 0]}
                    barSize={14}
                    isAnimationActive={false}
                  />
                  {fieldId === "all" && (
                    <Bar
                      dataKey="profit"
                      name="Profit"
                      fill="#6B7280"
                      radius={[0, 6, 6, 0]}
                      barSize={14}
                      isAnimationActive={false}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
        {showReminder && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-[#0F172A]/50 p-5 backdrop-blur-sm">
            <form
              onSubmit={saveReminder}
              className="w-full max-w-lg rounded-2xl border border-[#D9E2E7] bg-white p-6 text-[#10263D] shadow-2xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow text-[#0052A5]">Team follow-up</p>
                  <h3 className="mt-2 font-display text-2xl font-extrabold">
                    Add a reminder
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[#627A88]">
                    The alert appears in the notification center one day before
                    the due date.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReminder(false)}
                  aria-label="Close reminder modal"
                  className="rounded-lg p-2 text-[#78909D] transition hover:bg-[#F1F5F7] hover:text-[#10263D]"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-6 grid gap-4">
                <label>
                  <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[.12em] text-[#78909D]">
                    Task note
                  </span>
                  <textarea
                    required
                    value={reminderForm.note}
                    onChange={event =>
                      setReminderForm({
                        ...reminderForm,
                        note: event.target.value,
                      })
                    }
                    placeholder="e.g. Call customer about installation access"
                    className="min-h-24 w-full rounded-xl border border-[#D9E2E7] bg-[#F7FAFB] px-3 py-3 text-sm font-semibold text-[#10263D] outline-none focus:border-[#0066CC]"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[.12em] text-[#78909D]">
                      Due date
                    </span>
                    <input
                      required
                      type="date"
                      value={reminderForm.dueDate}
                      onChange={event =>
                        setReminderForm({
                          ...reminderForm,
                          dueDate: event.target.value,
                        })
                      }
                      className="h-11 w-full rounded-xl border border-[#D9E2E7] bg-[#F7FAFB] px-3 text-sm font-semibold text-[#10263D] outline-none focus:border-[#0066CC]"
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[.12em] text-[#78909D]">
                      Assignee / role
                    </span>
                    <select
                      value={reminderForm.assignee}
                      onChange={event =>
                        setReminderForm({
                          ...reminderForm,
                          assignee: event.target.value,
                        })
                      }
                      className="h-11 w-full rounded-xl border border-[#D9E2E7] bg-[#F7FAFB] px-3 text-sm font-semibold text-[#10263D] outline-none focus:border-[#0066CC]"
                    >
                      <option>Owner</option>
                      <option>Manager</option>
                      <option>Accountant</option>
                      <option>Technician</option>
                    </select>
                  </label>
                </div>
              </div>
              <button className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0066CC] text-sm font-extrabold text-white transition hover:bg-[#0052A5]">
                <CalendarClock size={16} /> Save reminder
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
  note,
  icon: Icon,
  tone,
  delay,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Landmark;
  tone: string;
  delay: string;
}) {
  const styles: Record<string, string> = {
    blue: "bg-[#EAF3F8] text-[#0052A5]",
    silver: "bg-[#E5E7EB] text-[#6B7280]",
    green: "bg-[#EDF6EF] text-[#4D775D]",
    navy: "bg-[#EAF3F8] text-[#0052A5]",
  };
  return (
    <article
      className={`dashboard-enter atlas-panel metric-card-${tone} group rounded-2xl p-5 transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(0,82,165,.12)] sm:p-6`}
      style={{ animationDelay: delay }}
    >
      <div
        className={`grid h-10 w-10 place-items-center rounded-xl ${styles[tone]} transition group-hover:scale-110`}
      >
        <Icon size={18} />
      </div>
      <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[.13em] text-[#6B7280]">
        {label}
      </p>
      <p className="mt-2 font-display text-[27px] font-extrabold tracking-[-.06em] text-[#0F172A] ">
        {value}
      </p>
      <p className="mt-2 text-[11px] font-semibold text-[#6B7280]">{note}</p>
    </article>
  );
}
function Action({
  href,
  icon: Icon,
  label,
  detail,
}: {
  href: string;
  icon: typeof WalletCards;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-cyan-300/35 bg-gradient-to-r from-[#0284c7] to-[#0369a1] p-4 text-white shadow-[0_4px_12px_rgba(0,180,216,.25)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(0,180,216,.4)]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-white transition group-hover:scale-110">
        <Icon size={18} />
      </span>
      <span>
        <span className="block text-sm font-extrabold text-white">
          + {label}
        </span>
        <span className="mt-1 block text-[10px] font-semibold text-cyan-50">
          {detail}
        </span>
      </span>
      <ArrowUpRight size={15} className="ml-auto text-white" />
    </Link>
  );
}
function ChartHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <p className="eyebrow text-[#0052A5]">{eyebrow}</p>
        <h3 className="mt-2 font-display text-xl font-extrabold tracking-[-.04em] text-[#0F172A] ">
          {title}
        </h3>
      </div>
      {action}
    </div>
  );
}
