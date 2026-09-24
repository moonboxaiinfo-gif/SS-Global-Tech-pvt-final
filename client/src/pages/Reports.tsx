import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  MessageCircle,
  Package,
  Percent,
  Printer,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import {
  useBusinessField,
  type BusinessFieldId,
} from "@/contexts/BusinessFieldContext";
import FieldScopeBanner from "@/components/FieldScopeBanner";
import {
  businessFieldChart,
  fieldMetrics,
  subcontractWorkOrders,
  currency,
  emptyFieldMetrics,
} from "@/lib/accountingData";
import { expensesByCategory, money, projectMargins } from "@/lib/financeData";
import { initialPayroll } from "@/lib/hrData";
import { stockItems, stockMovements } from "@/lib/operationsData";
import { downloadBrandedPdf, printBrandedDocument } from "@/lib/pdf";
import { sharePdfViaWhatsApp, shareResultMessage } from "@/lib/documentShare";
import { listErpRows } from "@/lib/erpData";

const palette: Record<
  Exclude<BusinessFieldId, "all">,
  { label: string; color: string; soft: string }
> = {
  solar: { label: "Solar Energy", color: "#F59E0B", soft: "#FFF4D6" },
  steel: { label: "Steel & Welding", color: "#2563EB", soft: "#E8F0FF" },
  furniture: { label: "Steel Furniture", color: "#059669", soft: "#E4F7F0" },
  irrigation: {
    label: "Irrigation Systems",
    color: "#06B6D4",
    soft: "#E2F8FC",
  },
};
const workspaceOptions: { id: BusinessFieldId; label: string }[] = [
  { id: "all", label: "Consolidated Overview" },
  { id: "solar", label: "Solar Energy" },
  { id: "steel", label: "Steel & Welding Projects" },
  { id: "furniture", label: "Steel Furniture Manufacturing" },
  { id: "irrigation", label: "Irrigation Systems" },
];
const monthly: Array<{
  month: string;
  revenue: number;
  direct: number;
  overhead: number;
}> = [];
const workspaceColors = Object.fromEntries(
  Object.entries(palette).map(([id, value]) => [id, value.color])
);

/** SS Global visual BI: trends and operational reports are deliberately separated from the Finance center. */
export default function Reports() {
  const { fieldId, field, setFieldId } = useBusinessField();
  const [period, setPeriod] = useState("This Month");
  const [tab, setTab] = useState("P&L Statement");
  const [live, setLive] = useState({
    revenue: 0,
    expenses: 0,
    payroll: 0,
    inventory: 0,
    trend: [] as any[],
    expenseBreakdown: [] as any[],
  });
  useEffect(() => {
    void (async () => {
      try {
        const [entries, payroll, inventory, invoices] = await Promise.all([
          listErpRows<any>(
            "finance_entries",
            "entry_type,direction,amount,entry_date,description"
          ),
          listErpRows<any>(
            "payroll",
            "basic_salary,allowances,deductions,period_start"
          ),
          listErpRows<any>("inventory_items", "stock_quantity,unit_cost"),
          listErpRows<any>("invoices", "amount,status,issue_date"),
        ]);
        const revenue =
          entries
            .filter(row => row.direction === "In")
            .reduce((sum, row) => sum + Number(row.amount || 0), 0) ||
          invoices.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const expensesTotal = entries
          .filter(row => row.direction === "Out")
          .reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const payrollTotal = payroll.reduce(
          (sum, row) =>
            sum + Number(row.basic_salary || 0) + Number(row.allowances || 0),
          0
        );
        const grouped = entries.reduce<Record<string, any>>((map, row) => {
          const month = String(row.entry_date || "").slice(0, 7) || "Current";
          map[month] ??= { month, revenue: 0, direct: 0, overhead: 0 };
          const amount = Number(row.amount || 0);
          if (row.direction === "In") map[month].revenue += amount;
          else {
            map[month].overhead += amount;
          }
          return map;
        }, {});
        setLive({
          revenue,
          expenses: expensesTotal,
          payroll: payrollTotal,
          inventory: inventory.reduce(
            (sum, row) =>
              sum +
              Number(row.stock_quantity || 0) * Number(row.unit_cost || 0),
            0
          ),
          trend: Object.values(grouped)
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-6),
          expenseBreakdown: [
            {
              label: "Materials",
              value: entries
                .filter(row =>
                  /material|stock|equipment/i.test(row.description || "")
                )
                .reduce((sum, row) => sum + Number(row.amount || 0), 0),
            },
            { label: "Payroll", value: payrollTotal },
            { label: "Other", value: expensesTotal },
          ],
        });
      } catch (cause) {
        toast.error(
          cause instanceof Error
            ? cause.message
            : "Reports could not load Supabase data."
        );
      }
    })();
  }, []);
  const scope = {
    revenue: live.revenue,
    expenses: live.expenses,
    profit: live.revenue - live.expenses,
  };
  const payrollCost = live.payroll;
  const inventoryValue = live.inventory;
  const margin = (scope.profit / Math.max(scope.revenue, 1)) * 100;
  const chartScale =
    fieldId === "all" ? 1 : Math.max(0.28, scope.revenue / 3636000);
  const trendData = live.trend;
  const incomeShare = [
    { name: "Live Supabase ledger", value: live.revenue, id: "solar" },
  ];
  const expenses = live.expenseBreakdown;
  const projectProfit = projectMargins.slice(0, 4).map(project => ({
    name:
      project.name.length > 16 ? `${project.name.slice(0, 16)}…` : project.name,
    agreed: project.value,
    cost: Math.round(project.value * (1 - project.margin / 100)),
    profit: Math.round((project.value * project.margin) / 100),
  }));
  const retention = (["Hayleys", "Deep Tech"] as const).map(partner => {
    const rows = subcontractWorkOrders.filter(item => item.partner === partner);
    const claimed = rows.reduce((sum, item) => sum + item.claimed, 0);
    const collected = rows.reduce((sum, item) => sum + item.paid, 0);
    const held = rows.reduce((sum, item) => sum + item.retentionAmount, 0);
    return {
      partner,
      claimed,
      collected,
      held,
      progress: Math.round((collected / Math.max(claimed, 1)) * 100),
    };
  });
  const lowStock = stockItems.filter(
    item =>
      (fieldId === "all" || item.businessField === fieldId) &&
      item.quantity <= (item.lowStockAlertLevel ?? item.safety)
  );
  const reportPdf = () => ({
    title: "Analytics Report",
    documentNo: `RPT-${new Date().toISOString().slice(0, 10)}`,
    date: new Date().toISOString().slice(0, 10),
    subtitle: `${field.label} · ${period} consolidated performance summary`,
    summaries: [
      {
        label: "Gross revenue",
        value: money(scope.revenue),
        tone: "blue" as const,
      },
      {
        label: "Total expenses",
        value: money(scope.expenses),
        tone: "rose" as const,
      },
      {
        label: "Net profit",
        value: money(scope.profit),
        tone: "green" as const,
      },
      {
        label: "Profit margin",
        value: `${margin.toFixed(1)}%`,
        tone: "amber" as const,
      },
    ],
    columns: [
      { label: "Metric", width: 58 },
      { label: "Workspace / scope", width: 55 },
      { label: "Period", width: 35 },
      { label: "Value", width: 46, align: "right" as const },
    ],
    rows: [
      ["Gross Revenue", field.label, period, money(scope.revenue)],
      ["Total Expenses", field.label, period, money(scope.expenses)],
      ["Net Profit", field.label, period, money(scope.profit)],
      ["Net Profit Margin", field.label, period, `${margin.toFixed(1)}%`],
      ["Payroll & Labor Cost", field.label, period, money(payrollCost)],
      ["Inventory Valuation", field.label, period, money(inventoryValue)],
    ],
    terms: [
      "This report is prepared from the current operational dataset and shown in LKR (Rs.).",
      "Charts and detailed sub-reports remain available in the live application.",
    ],
  });
  const exportPdf = () => {
    downloadBrandedPdf(reportPdf(), "ss-global-analytics-report.pdf");
    toast.success("Branded A4 analytics report downloaded.");
  };
  const printPdf = () => {
    printBrandedDocument(reportPdf());
    toast.success("Analytics report opened for printing.");
  };
  const shareReport = async () => {
    const phone =
      window.prompt("WhatsApp number for this report", "077 123 4567") || "";
    if (!phone) return;
    const result = await sharePdfViaWhatsApp({
      data: reportPdf(),
      fileName: "ss-global-analytics-report.pdf",
      phone,
      message: publicUrl =>
        `Dear Team, the ${field.label} analytics report for ${period} is ready. Net profit: ${money(scope.profit)}. You can view and download the PDF here: ${publicUrl || "Please attach the downloaded PDF in WhatsApp."}\n\nThank you, SS Global Tech (Pvt) Ltd.`,
    });
    if (!result.opened)
      toast.error(result.error || "WhatsApp could not be opened.");
    else
      result.uploaded
        ? toast.success(shareResultMessage(result))
        : toast.warning(shareResultMessage(result));
  };
  const exportExcel = () => {
    const rows = [
      ["Report", "Workspace", "Period", "Value"],
      ["Gross Revenue", field.label, period, String(scope.revenue)],
      ["Net Profit Margin", field.label, period, `${margin.toFixed(1)}%`],
      ["Payroll & Labor Cost", field.label, period, String(payrollCost)],
      ["Inventory Valuation", field.label, period, String(inventoryValue)],
      ...incomeShare.map(item => [
        "Workspace Revenue",
        item.name,
        period,
        String(item.value),
      ]),
    ];
    const html = `<table>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}</table>`;
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(
      new Blob([html], { type: "application/vnd.ms-excel" })
    );
    anchor.download = `ss-global-${fieldId}-analytics-${new Date().toISOString().slice(0, 10)}.xls`;
    anchor.click();
    toast.success("Excel report downloaded.");
  };

  return (
    <div className="relative overflow-hidden px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1480px]">
        <div className="dashboard-enter mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow text-[#0052A5]">
              Business intelligence / visual reports
            </p>
            <h2 className="mt-4 font-display text-[36px] font-extrabold tracking-[-.06em] text-[#0F172A] sm:text-[46px]">
              Reports & Analytics
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#627A88] ">
              A clear operating view of revenue, execution costs, people,
              inventory, and partner profitability across SS Global Tech
              Enterprises.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportPdf}
              className="flex items-center gap-2 rounded-xl border border-[#BFD5E8] bg-white px-4 py-3 text-xs font-extrabold text-[#0052A5] transition hover:bg-[#EAF3F8]"
            >
              <Download size={15} /> Download PDF
            </button>
            <button
              onClick={printPdf}
              className="flex items-center gap-2 rounded-xl border border-[#BFD5E8] bg-white px-4 py-3 text-xs font-extrabold text-[#0052A5] transition hover:bg-[#EAF3F8]"
            >
              <Printer size={15} /> Print
            </button>
            <button
              onClick={() => void shareReport()}
              className="flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-xs font-extrabold text-white transition hover:bg-[#20b957]"
            >
              <MessageCircle size={15} /> Send via WhatsApp
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 rounded-xl bg-[#0066CC] px-4 py-3 text-xs font-extrabold text-white transition hover:bg-[#0052A5]"
            >
              <FileSpreadsheet size={15} /> Export Excel Report
            </button>
          </div>
        </div>
        <FieldScopeBanner />
        <div className="mt-6 flex flex-col justify-between gap-3 rounded-2xl border border-[#D9E2E7] bg-white p-3 shadow-[0_8px_24px_rgba(16,38,61,.04)] sm:flex-row sm:items-center ">
          <div className="flex flex-wrap gap-2">
            {[
              "Today",
              "This Week",
              "This Month",
              "Last Quarter",
              "This Year",
              "Custom Range",
            ].map(option => (
              <button
                key={option}
                onClick={() => setPeriod(option)}
                className={`rounded-lg px-3 py-2 text-[10px] font-extrabold ${period === option ? "bg-[#10263D] text-white" : "text-[#627A88] hover:bg-[#F1F5F7]"}`}
              >
                {option}
              </button>
            ))}
          </div>
          <select
            value={fieldId}
            onChange={event =>
              setFieldId(event.target.value as BusinessFieldId)
            }
            className="field-input max-w-[260px]"
          >
            <option value="all">Consolidated Overview</option>
            {workspaceOptions.slice(1).map(item => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Total Gross Revenue"
            value={money(scope.revenue)}
            note={`${field.label} · ${period}`}
            icon={TrendingUp}
            color="#2563EB"
            data={trendData.map(item => ({ value: item.revenue }))}
          />
          <Kpi
            label="Net Profit Margin"
            value={`${margin.toFixed(1)}%`}
            note="Net operating profit / revenue"
            icon={Percent}
            color="#059669"
            data={trendData.map(item => ({
              value:
                ((item.revenue - item.direct - item.overhead) /
                  Math.max(item.revenue, 1)) *
                100,
            }))}
          />
          <Kpi
            label="Total Payroll & Labor Cost"
            value={money(payrollCost)}
            note="Salary and OT allocation"
            icon={UsersRound}
            color="#D97706"
            data={trendData.map(item => ({ value: item.direct * 0.32 }))}
          />
          <Kpi
            label="Current Inventory Valuation"
            value={money(inventoryValue)}
            note={`${lowStock.length} low-stock alerts`}
            icon={Package}
            color="#06B6D4"
            data={trendData.map(item => ({ value: inventoryValue / 1000 }))}
          />
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
          <ChartCard
            eyebrow="Revenue vs expense trends"
            title="Monthly operating cash movement"
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E5EDF1" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#78909D" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#78909D" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={value => `${Math.round(value / 1000)}k`}
                />
                <Tooltip formatter={(value: number) => money(value)} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#2563EB"
                  fill="url(#revenueFill)"
                  strokeWidth={3}
                />
                <Area
                  type="monotone"
                  dataKey="direct"
                  name="Direct Costs"
                  stroke="#F59E0B"
                  fill="none"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="overhead"
                  name="Overhead"
                  stroke="#C57B67"
                  fill="none"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard
            eyebrow="Workspace income share"
            title="Revenue contribution"
          >
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={incomeShare}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={106}
                  paddingAngle={3}
                >
                  {incomeShare.map(entry => (
                    <Cell
                      key={entry.id}
                      fill={workspaceColors[entry.id] ?? "#94A3B8"}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => money(value)} />
                <Legend
                  verticalAlign="bottom"
                  height={32}
                  wrapperStyle={{ fontSize: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <ChartCard
            eyebrow="Expense distribution"
            title="Materials vs salaries vs overhead"
          >
            <ResponsiveContainer width="100%" height={290}>
              <BarChart
                data={[
                  {
                    name: "Current",
                    materials:
                      expenses.find(item => item.label === "Materials")
                        ?.value ?? 0,
                    salaries:
                      expenses.find(item => item.label === "Payroll")?.value ??
                      0,
                    overhead:
                      (expenses.find(item => item.label === "Transport")
                        ?.value ?? 0) +
                      (expenses.find(item => item.label === "Utilities")
                        ?.value ?? 0) +
                      (expenses.find(item => item.label === "Other")?.value ??
                        0),
                  },
                ]}
                layout="vertical"
              >
                <CartesianGrid stroke="#E5EDF1" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={value => `${Math.round(value / 1000)}k`}
                  tick={{ fontSize: 10, fill: "#78909D" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip formatter={(value: number) => money(value)} />
                <Legend />
                <Bar
                  dataKey="materials"
                  name="Raw Materials"
                  stackId="a"
                  fill="#F59E0B"
                />
                <Bar
                  dataKey="salaries"
                  name="Employee Salaries"
                  stackId="a"
                  fill="#2563EB"
                />
                <Bar
                  dataKey="overhead"
                  name="Overhead Operations"
                  stackId="a"
                  fill="#059669"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard
            eyebrow="Project profitability"
            title="Agreed price vs execution cost vs realized profit"
          >
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={projectProfit} margin={{ left: 8, right: 8 }}>
                <CartesianGrid stroke="#E5EDF1" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#78909D" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#78909D" }}
                  tickFormatter={value => `${Math.round(value / 1000)}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(value: number) => money(value)} />
                <Legend />
                <Bar
                  dataKey="agreed"
                  name="Agreed Price"
                  fill="#2563EB"
                  radius={[5, 5, 0, 0]}
                />
                <Bar
                  dataKey="cost"
                  name="Execution Cost"
                  fill="#F59E0B"
                  radius={[5, 5, 0, 0]}
                />
                <Bar
                  dataKey="profit"
                  name="Net Profit"
                  fill="#059669"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {retention.map(item => (
            <div key={item.partner} className="atlas-panel p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow">Sub-contract KPI gauge</p>
                  <h3 className="mt-2 font-display text-xl font-extrabold text-[#0F172A] ">
                    {item.partner}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#78909D]">
                    Pending retention
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-[#D97706]">
                    {currency(item.held)}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-[150px_1fr] items-center gap-5">
                <ResponsiveContainer width="100%" height={150}>
                  <RadialBarChart
                    innerRadius="72%"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                    data={[
                      {
                        value: item.progress,
                        fill:
                          item.partner === "Hayleys" ? "#003366" : "#D97706",
                      },
                    ]}
                  >
                    <PolarAngleAxis
                      type="number"
                      domain={[0, 100]}
                      angleAxisId={0}
                      tick={false}
                    />
                    <RadialBar dataKey="value" background cornerRadius={10} />
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-[#19364D] text-xl font-extrabold"
                    >
                      {item.progress}%
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  <GaugeRow
                    label="Total claimed"
                    value={currency(item.claimed)}
                  />
                  <GaugeRow
                    label="Collected cash"
                    value={currency(item.collected)}
                  />
                  <GaugeRow
                    label="Pending balance"
                    value={currency(Math.max(0, item.claimed - item.collected))}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <section className="mt-6">
          <div className="flex flex-wrap gap-2 border-b border-[#D9E2E7] pb-3">
            {[
              "P&L Statement",
              "Retention Balances",
              "Inventory Movement",
              "Payroll & Labor",
            ].map(item => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`rounded-xl px-4 py-3 text-xs font-extrabold ${tab === item ? "bg-[#10263D] text-white" : "bg-white text-[#627A88] hover:bg-[#EAF3F8]"}`}
              >
                {item}
              </button>
            ))}
          </div>
          {tab === "P&L Statement" && (
            <PnL
              revenue={scope.revenue}
              expenses={scope.expenses}
              profit={scope.profit}
            />
          )}
          {tab === "Retention Balances" && <RetentionReport />}
          {tab === "Inventory Movement" && (
            <InventoryReport lowStock={lowStock} fieldId={fieldId} />
          )}
          {tab === "Payroll & Labor" && (
            <PayrollReport payrollCost={payrollCost} fieldId={fieldId} />
          )}
        </section>
        <div className="mt-6 flex items-center justify-between border-t border-[#D9E2E7] pt-5 text-[11px] font-semibold text-[#78909D]">
          <span>
            SS Global Tech Enterprises · {field.label} · {period}
          </span>
          <button
            onClick={printPdf}
            className="flex items-center gap-2 font-extrabold text-[#0052A5]"
          >
            <FileText size={14} /> Print report summary
          </button>
        </div>
      </div>
    </div>
  );
}
function Kpi({
  label,
  value,
  note,
  icon: Icon,
  color,
  data,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof TrendingUp;
  color: string;
  data: { value: number }[];
}) {
  return (
    <article className="atlas-panel overflow-hidden rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <div
            className="grid h-10 w-10 place-items-center rounded-xl"
            style={{ background: `${color}16`, color }}
          >
            <Icon size={18} />
          </div>
          <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#78909D]">
            {label}
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#10263D] ">
            {value}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#8CA0AB]">
            {note}
          </p>
        </div>
        <div className="h-14 w-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fill={`${color}20`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </article>
  );
}
function ChartCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="atlas-panel overflow-hidden">
      <div className="border-b border-[#E2E9ED] px-5 py-5 sm:px-6">
        <p className="eyebrow">{eyebrow}</p>
        <h3 className="mt-2 font-display text-xl font-extrabold text-[#19364D] ">
          {title}
        </h3>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}
function GaugeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-[#F7FAFB] px-3 py-2 ">
      <span className="text-xs font-semibold text-[#78909D]">{label}</span>
      <strong className="text-xs font-extrabold text-[#19364D] ">
        {value}
      </strong>
    </div>
  );
}
function PnL({
  revenue,
  expenses,
  profit,
}: {
  revenue: number;
  expenses: number;
  profit: number;
}) {
  return (
    <div className="atlas-panel mt-5 overflow-hidden">
      <div className="border-b border-[#E2E9ED] px-5 py-5">
        <p className="eyebrow">Financial P&L statement</p>
        <h3 className="mt-2 font-display text-xl font-extrabold text-[#19364D] ">
          Income statement
        </h3>
      </div>
      <div className="divide-y divide-[#E2E9ED] px-5">
        <ReportRow
          label="Gross Sales / Revenue"
          value={money(revenue)}
          tone="positive"
        />
        <ReportRow
          label="Direct Costs (COGS)"
          value={money(Math.round(expenses * 0.66))}
          tone="negative"
        />
        <ReportRow
          label="Gross Profit"
          value={money(Math.round(revenue - expenses * 0.66))}
          tone="positive"
        />
        <ReportRow
          label="Operating Expenses"
          value={money(Math.round(expenses * 0.34))}
          tone="negative"
        />
        <ReportRow
          label="Net Operating Profit"
          value={money(profit)}
          tone="positive"
          strong
        />
      </div>
    </div>
  );
}
function RetentionReport() {
  return (
    <div className="atlas-panel mt-5 overflow-hidden">
      <div className="border-b border-[#E2E9ED] px-5 py-5">
        <p className="eyebrow">Sub-contract retention balances</p>
        <h3 className="mt-2 font-display text-xl font-extrabold text-[#19364D] ">
          Pending releases
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left">
          <thead className="bg-[#F7FAFB] text-[10px] font-extrabold uppercase tracking-[.14em] text-[#8CA0AB]">
            <tr>
              <th className="px-5 py-3">Partner</th>
              <th className="px-5 py-3">Project</th>
              <th className="px-5 py-3">Retention</th>
              <th className="px-5 py-3">Release Target</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E9ED]">
            {subcontractWorkOrders.map(item => (
              <tr key={item.id}>
                <td className="px-5 py-4 text-sm font-extrabold text-[#19364D] ">
                  {item.partner}
                </td>
                <td className="px-5 py-4 text-xs font-semibold text-[#627A88]">
                  {item.project}
                </td>
                <td className="px-5 py-4 text-sm font-extrabold text-[#D97706]">
                  {currency(item.retentionAmount)}
                </td>
                <td className="px-5 py-4 text-xs font-semibold text-[#627A88]">
                  30 Sep 2026
                </td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-[#FFF6E2] px-2 py-1 text-[10px] font-extrabold text-[#9A6A13]">
                    Pending release
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function InventoryReport({
  lowStock,
  fieldId,
}: {
  lowStock: typeof stockItems;
  fieldId: BusinessFieldId;
}) {
  const items = stockItems.filter(
    item => fieldId === "all" || item.businessField === fieldId
  );
  return (
    <div className="atlas-panel mt-5 overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#E2E9ED] px-5 py-5">
        <div>
          <p className="eyebrow">Inventory movement & valuation</p>
          <h3 className="mt-2 font-display text-xl font-extrabold text-[#19364D] ">
            Stock master report
          </h3>
        </div>
        <span className="rounded-full bg-[#FBEFEB] px-3 py-1.5 text-[10px] font-extrabold text-[#A35749]">
          {lowStock.length} low-stock warnings
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-[#F7FAFB] text-[10px] font-extrabold uppercase tracking-[.14em] text-[#8CA0AB]">
            <tr>
              <th className="px-5 py-3">Item</th>
              <th className="px-5 py-3">Workspace</th>
              <th className="px-5 py-3">Quantity</th>
              <th className="px-5 py-3">Unit Cost</th>
              <th className="px-5 py-3">Valuation</th>
              <th className="px-5 py-3">Movement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E9ED]">
            {items.map(item => (
              <tr key={item.id}>
                <td className="px-5 py-4 text-sm font-extrabold text-[#19364D] ">
                  {item.name}
                </td>
                <td className="px-5 py-4 text-xs font-semibold text-[#627A88]">
                  {item.businessField}
                </td>
                <td
                  className={`px-5 py-4 text-xs font-extrabold ${item.quantity <= (item.lowStockAlertLevel ?? item.safety) ? "text-[#A35749]" : "text-[#19364D]"}`}
                >
                  {item.quantity} {item.unit}
                </td>
                <td className="px-5 py-4 text-xs font-semibold text-[#627A88]">
                  {currency(item.unitCostPrice ?? 0)}
                </td>
                <td className="px-5 py-4 text-sm font-extrabold text-[#19364D] ">
                  {currency(item.value)}
                </td>
                <td className="px-5 py-4 text-xs font-semibold text-[#627A88]">
                  {
                    stockMovements.filter(move => move.stockId === item.id)
                      .length
                  }{" "}
                  movements
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function PayrollReport({
  payrollCost,
  fieldId,
}: {
  payrollCost: number;
  fieldId: BusinessFieldId;
}) {
  const rows = initialPayroll.filter(
    item => fieldId === "all" || item.company_id === fieldId
  );
  const advances = rows.reduce((sum, item) => sum + item.advances, 0);
  const labor = rows.reduce((sum, item) => sum + item.net_salary, 0);
  return (
    <div className="atlas-panel mt-5 overflow-hidden">
      <div className="border-b border-[#E2E9ED] px-5 py-5">
        <p className="eyebrow">Payroll & labor efficiency</p>
        <h3 className="mt-2 font-display text-xl font-extrabold text-[#19364D] ">
          Monthly people cost summary
        </h3>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-3">
        <Summary label="Salary + OT cost" value={money(payrollCost)} />
        <Summary label="Advance deductions" value={money(advances)} />
        <Summary label="Net salaries paid" value={money(labor)} />
      </div>
      <div className="border-t border-[#E2E9ED] px-5 py-4 text-xs font-semibold text-[#627A88]">
        Project-assigned technician labor is included in the Salary
        synchronization ledger and should be reconciled against project
        execution costs.
      </div>
    </div>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F7FAFB] p-4 ">
      <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#8CA0AB]">
        {label}
      </p>
      <p className="mt-2 text-lg font-extrabold text-[#19364D] ">{value}</p>
    </div>
  );
}
function ReportRow({
  label,
  value,
  tone,
  strong = false,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative";
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-4 ${strong ? "font-extrabold" : ""}`}
    >
      <span
        className={`text-sm ${strong ? "text-[#19364D] " : "text-[#627A88]"}`}
      >
        {label}
      </span>
      <span
        className={`text-sm ${tone === "positive" ? "text-[#4D775D]" : "text-[#A35749]"}`}
      >
        {value}
      </span>
    </div>
  );
}
