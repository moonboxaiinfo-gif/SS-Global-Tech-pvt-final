import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  MapPin,
  Package,
  Percent,
  Plus,
  ReceiptText,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useBusinessField } from "@/contexts/BusinessFieldContext";
import FieldScopeBanner from "@/components/FieldScopeBanner";
import {
  currency,
  subcontractWorkOrders,
  type ContractScope,
  type SubcontractWorkOrder,
} from "@/lib/accountingData";
import { insertErpRow, listErpRows, updateErpRow } from "@/lib/erpData";

const partnerTheme = {
  Hayleys: { accent: "#003366", soft: "#E8F1F8", label: "Corporate navy" },
  "Deep Tech": { accent: "#D97706", soft: "#FFF4DF", label: "Warm amber" },
} as const;
type PartnerName = keyof typeof partnerTheme;
const normalizePartner = (value: unknown): PartnerName =>
  String(value).toLowerCase().includes("hayleys") ? "Hayleys" : "Deep Tech";
const themeFor = (value: unknown) => partnerTheme[normalizePartner(value)];
const normalizeOrder = (
  value: unknown,
  index: number
): SubcontractWorkOrder | null => {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<SubcontractWorkOrder>;
  return {
    id: typeof item.id === "string" && item.id ? item.id : `wo-${index}`,
    partner: normalizePartner(item.partner),
    poNumber: String(item.poNumber ?? ""),
    project: String(item.project ?? "Untitled project"),
    location: String(item.location ?? "Unspecified location"),
    scope:
      item.scope === "Material Only" ? "Material Only" : "Material + Labor",
    agreedAmount: Number(item.agreedAmount) || 0,
    advancePaid: Number(item.advancePaid) || 0,
    retentionPercent: Number(item.retentionPercent) || 0,
    retentionAmount: Number(item.retentionAmount) || 0,
    materialCost: Number(item.materialCost) || 0,
    laborCost: Number(item.laborCost) || 0,
    claimed: Number(item.claimed) || 0,
    paid: Number(item.paid) || 0,
    claims: Array.isArray(item.claims)
      ? item.claims
          .filter(claim => Boolean(claim && typeof claim === "object"))
          .map(claim => {
            const safeClaim = claim as {
              label?: unknown;
              percent?: unknown;
              amount?: unknown;
              status?: unknown;
            };
            return {
              label: String(safeClaim.label ?? "Claim"),
              percent: Number(safeClaim.percent) || 0,
              amount: Number(safeClaim.amount) || 0,
              status:
                safeClaim.status === "Paid" ||
                safeClaim.status === "Partially Paid" ||
                safeClaim.status === "Submitted"
                  ? safeClaim.status
                  : "Draft",
            };
          })
      : [],
  };
};

/** SS Global partner-centric sub-contract desk: Solar-only visibility, simple claims, retention, and scope-aware costs. */
export default function SubcontractAccounting() {
  const { fieldId } = useBusinessField();
  const [orders, setOrders] = useState<SubcontractWorkOrder[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [modalPartner, setModalPartner] = useState<
    "Hayleys" | "Deep Tech" | null
  >(null);
  const [form, setForm] = useState({
    partner: "Hayleys" as "Hayleys" | "Deep Tech",
    poNumber: "",
    project: "",
    location: "",
    scope: "Material + Labor" as ContractScope,
    amount: "",
    advance: "",
    retention: "5",
  });
  const [expense, setExpense] = useState({ material: "", labor: "" });
  useEffect(() => {
    void (async () => {
      try {
        const rows = await listErpRows<any>(
          "subcontracts",
          "id,partner,po_number,project_title,location,scope,agreed_amount,advance_paid,retention_percent,retention_amount,material_cost,labor_cost,status"
        );
        const remote = rows
          .map((row, index) =>
            normalizeOrder(
              {
                id: row.id,
                partner: row.partner,
                poNumber: row.po_number,
                project: row.project_title,
                location: row.location,
                scope: row.scope,
                agreedAmount: row.agreed_amount,
                advancePaid: row.advance_paid,
                retentionPercent: row.retention_percent,
                retentionAmount: row.retention_amount,
                materialCost: row.material_cost,
                laborCost: row.labor_cost,
                claimed: row.advance_paid,
                paid: row.advance_paid,
                claims: [],
              },
              index
            )
          )
          .filter((item): item is SubcontractWorkOrder => Boolean(item));
        setOrders(remote);
        setSelectedId(remote[0]?.id ?? "");
      } catch (cause) {
        toast.error(
          cause instanceof Error
            ? cause.message
            : "Sub-contracts could not be loaded from Supabase."
        );
      }
    })();
  }, []);
  useEffect(() => {
    if (selectedId && !orders.some(item => item.id === selectedId))
      setSelectedId(orders[0]?.id ?? "");
  }, [orders, selectedId]);
  const current = orders.find(item => item.id === selectedId) ?? orders[0];
  const partnerSummary = useMemo(
    () =>
      (["Hayleys", "Deep Tech"] as const).map(partner => {
        const rows = orders.filter(item => item.partner === partner);
        const contracted = rows.reduce(
          (sum, item) => sum + item.agreedAmount,
          0
        );
        const collected = rows.reduce((sum, item) => sum + item.paid, 0);
        return {
          partner,
          projects: rows.length,
          contracted,
          collected,
          pending: contracted - collected,
        };
      }),
    [orders]
  );

  if (fieldId !== "all" && fieldId !== "solar")
    return (
      <div className="px-5 pb-12 pt-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <FieldScopeBanner />
          <section className="atlas-panel mt-6 p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#FFF4DF] text-[#D97706]">
              <BriefcaseBusiness size={24} />
            </div>
            <h2 className="mt-5 font-display text-2xl font-extrabold text-[#0F172A] ">
              Sub-Contracts are Solar-only
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#627A88] ">
              Select Solar Energy or All Workspaces to view partner contracts,
              milestone claims, and retention ledgers.
            </p>
          </section>
        </div>
      </div>
    );

  const openCreate = (partner: "Hayleys" | "Deep Tech") => {
    setForm({
      partner,
      poNumber: "",
      project: "",
      location: "",
      scope: "Material + Labor",
      amount: "",
      advance: "",
      retention: "5",
    });
    setModalPartner(partner);
  };
  const saveContract = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(form.amount);
    const advance = Number(form.advance);
    const retention = Number(form.retention);
    if (
      !form.poNumber.trim() ||
      !form.project.trim() ||
      !form.location.trim() ||
      amount <= 0 ||
      advance < 0 ||
      retention < 0
    )
      return toast.error(
        "Complete the PO, project, location, amount, advance, and retention fields."
      );
    try {
      const row = await insertErpRow<any>(
        "subcontracts",
        {
          partner: form.partner,
          po_number: form.poNumber.trim(),
          project_title: form.project.trim(),
          location: form.location.trim(),
          scope: form.scope,
          agreed_amount: amount,
          advance_paid: advance,
          retention_percent: retention,
          material_cost: 0,
          labor_cost: 0,
          status: "Active",
        },
        "id,partner,po_number,project_title,location,scope,agreed_amount,advance_paid,retention_percent,retention_amount,material_cost,labor_cost,status"
      );
      const item = normalizeOrder(
        {
          id: row.id,
          partner: row.partner,
          poNumber: row.po_number,
          project: row.project_title,
          location: row.location,
          scope: row.scope,
          agreedAmount: row.agreed_amount,
          advancePaid: row.advance_paid,
          retentionPercent: row.retention_percent,
          retentionAmount: row.retention_amount,
          materialCost: row.material_cost,
          laborCost: row.labor_cost,
          claimed: row.advance_paid,
          paid: row.advance_paid,
          claims: [],
        },
        0
      )!;
      setOrders(items => [item, ...items]);
      setSelectedId(item.id);
      setModalPartner(null);
      toast.success(`${item.partner} sub-contract saved to Supabase.`);
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Sub-contract could not be saved to Supabase."
      );
    }
  };
  const recordClaim = () => {
    if (!current) return;
    const draftIndex = current.claims.findIndex(
      claim => claim.status === "Draft"
    );
    if (draftIndex < 0) return toast.info("All claims are already submitted.");
    setOrders(items =>
      items.map(item =>
        item.id === current.id
          ? {
              ...item,
              claimed: item.claimed + item.claims[draftIndex].amount,
              claims: item.claims.map((claim, index) =>
                index === draftIndex
                  ? { ...claim, status: "Submitted" as const }
                  : claim
              ),
            }
          : item
      )
    );
    toast.success(
      `${current.claims[draftIndex].label} recorded for ${current.project}.`
    );
  };
  const saveExpense = async (event: FormEvent) => {
    event.preventDefault();
    if (!current) return;
    const material = Number(expense.material || 0);
    const labor =
      current.scope === "Material + Labor" ? Number(expense.labor || 0) : 0;
    if (material <= 0 && labor <= 0)
      return toast.error("Enter a material or labor amount.");
    try {
      const row = await updateErpRow<any>(
        "subcontracts",
        current.id,
        {
          material_cost: current.materialCost + material,
          labor_cost: current.laborCost + labor,
        },
        "id,partner,po_number,project_title,location,scope,agreed_amount,advance_paid,retention_percent,retention_amount,material_cost,labor_cost,status"
      );
      setOrders(items =>
        items.map(item =>
          item.id === current.id
            ? {
                ...item,
                materialCost: Number(row.material_cost),
                laborCost: Number(row.labor_cost),
              }
            : item
        )
      );
      setExpense({ material: "", labor: "" });
      toast.success("Project cost deduction saved to Supabase.");
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Project cost could not be saved to Supabase."
      );
    }
  };

  return (
    <div className="relative overflow-hidden px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1440px]">
        <div className="dashboard-enter mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow text-[#0052A5]">
              Solar partner desk / sub-contracts
            </p>
            <h2 className="mt-4 font-display text-[36px] font-extrabold tracking-[-.06em] text-[#0F172A] sm:text-[46px]">
              Sub-Contracts
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#627A88] ">
              Manage Hayleys and Deep Tech partner work with simple claims,
              transparent collections, retention, and scope-aware project costs.
            </p>
          </div>
          <button
            onClick={() => openCreate("Hayleys")}
            className="flex items-center gap-2 rounded-xl bg-[#0066CC] px-4 py-3 text-xs font-extrabold text-white shadow-[0_12px_24px_rgba(0,102,204,.18)] transition hover:-translate-y-0.5 hover:bg-[#0052A5]"
          >
            <Plus size={15} /> Add Sub-Contract
          </button>
        </div>
        <FieldScopeBanner />
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {partnerSummary.map(summary => {
            const theme = themeFor(summary.partner);
            return (
              <button
                key={summary.partner}
                onClick={() => openCreate(summary.partner)}
                className="group rounded-2xl border bg-white p-5 text-left shadow-[0_12px_30px_rgba(16,38,61,.05)] transition hover:-translate-y-1 "
                style={{ borderColor: `${theme.accent}35` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p
                      className="text-[10px] font-extrabold uppercase tracking-[.16em]"
                      style={{ color: theme.accent }}
                    >
                      {theme.label} partner workspace
                    </p>
                    <h3 className="mt-2 font-display text-2xl font-extrabold text-[#0F172A] ">
                      {summary.partner}{" "}
                      <span className="text-sm font-semibold text-[#8CA0AB]">
                        Sub-Contracts
                      </span>
                    </h3>
                  </div>
                  <div
                    className="grid h-11 w-11 place-items-center rounded-xl"
                    style={{ background: theme.soft, color: theme.accent }}
                  >
                    <BriefcaseBusiness size={19} />
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <PartnerMetric
                    label="Projects"
                    value={String(summary.projects)}
                    color={theme.accent}
                  />
                  <PartnerMetric
                    label="Contracted"
                    value={currency(summary.contracted)}
                    color={theme.accent}
                  />
                  <PartnerMetric
                    label="Collected"
                    value={currency(summary.collected)}
                    color={theme.accent}
                  />
                  <PartnerMetric
                    label="Pending"
                    value={currency(summary.pending)}
                    color={theme.accent}
                  />
                </div>
                <div
                  className="mt-5 flex items-center justify-between text-xs font-extrabold"
                  style={{ color: theme.accent }}
                >
                  <span>Open partner workspace</span>
                  <ArrowUpRight
                    size={16}
                    className="transition group-hover:translate-x-1 group-hover:-translate-y-1"
                  />
                </div>
              </button>
            );
          })}
        </div>
        <section className="atlas-panel mt-6 overflow-hidden">
          <div className="flex flex-col justify-between gap-3 border-b border-[#E5E7EB] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <p className="eyebrow">Aggregated project ledger</p>
              <h3 className="mt-2 font-display text-xl font-extrabold text-[#0F172A] ">
                Active sub-contract projects{" "}
                <span className="text-sm font-semibold text-[#8CA0AB]">
                  · {orders.length} records
                </span>
              </h3>
            </div>
            <span className="rounded-full bg-[#EAF3F8] px-3 py-1.5 text-[10px] font-extrabold text-[#0052A5]">
              Solar Energy Workspace
            </span>
          </div>
          <div className="divide-y divide-[#E5E7EB]">
            {orders.map(order => (
              <button
                key={order.id}
                onClick={() => setSelectedId(order.id)}
                className={`grid w-full gap-3 px-5 py-5 text-left transition hover:bg-[#F8FAFC] sm:grid-cols-[1.1fr_.7fr_.7fr_.7fr_.7fr] sm:items-center sm:px-6 ${selectedId === order.id ? "bg-[#F2F8FC] " : ""}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-md px-2 py-1 text-[10px] font-extrabold"
                      style={{
                        background: themeFor(order.partner).soft,
                        color: themeFor(order.partner).accent,
                      }}
                    >
                      {order.partner}
                    </span>
                    <span className="text-[10px] font-bold text-[#8CA0AB]">
                      {order.poNumber}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-extrabold text-[#0F172A] ">
                    {order.project}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#78909D]">
                    <MapPin size={12} /> {order.location}
                  </p>
                </div>
                <TableMetric label="Scope" value={order.scope} />
                <TableMetric
                  label="Agreed"
                  value={currency(order.agreedAmount)}
                />
                <TableMetric label="Collected" value={currency(order.paid)} />
                <TableMetric
                  label="Pending"
                  value={currency(order.agreedAmount - order.paid)}
                />
              </button>
            ))}
          </div>
        </section>
        {current && (
          <section className="atlas-panel mt-6 overflow-hidden">
            <div className="border-b border-[#E5E7EB] px-5 py-5 sm:px-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="eyebrow">Project detail / {current.partner}</p>
                  <h3 className="mt-2 font-display text-2xl font-extrabold text-[#0F172A] ">
                    {current.project}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                    {current.poNumber} · {current.location} · {current.scope}
                  </p>
                </div>
                <span
                  className="rounded-full px-3 py-1.5 text-[10px] font-extrabold"
                  style={{
                    background: themeFor(current.partner).soft,
                    color: themeFor(current.partner).accent,
                  }}
                >
                  {current.partner} partner ledger
                </span>
              </div>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5 sm:p-6">
              <Stat
                icon={CircleDollarSign}
                label="Agreed amount"
                value={currency(current.agreedAmount)}
              />
              <Stat
                icon={ReceiptText}
                label="Collected cash"
                value={currency(current.paid)}
              />
              <Stat
                icon={Percent}
                label="Retention held"
                value={`${current.retentionPercent}% · ${currency(current.retentionAmount)}`}
              />
              <Stat
                icon={Package}
                label="Material cost"
                value={currency(current.materialCost)}
              />
              <Stat
                icon={UsersRound}
                label="Labor cost"
                value={currency(current.laborCost)}
              />
            </div>
            <div className="grid gap-6 border-t border-[#E5E7EB] px-5 py-5 sm:px-6 lg:grid-cols-[1.05fr_.95fr]">
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="eyebrow">Milestone claims</p>
                    <h4 className="mt-1 font-display text-lg font-extrabold text-[#0F172A] ">
                      Claim tracker
                    </h4>
                  </div>
                  <button
                    onClick={recordClaim}
                    className="flex items-center gap-1 rounded-lg border border-[#BFD5E8] px-3 py-2 text-[10px] font-extrabold text-[#0052A5] transition hover:bg-[#EAF3F8]"
                  >
                    <Plus size={13} /> Record Claim
                  </button>
                </div>
                <div className="space-y-3">
                  {current.claims.map(claim => (
                    <div
                      key={claim.label}
                      className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] p-4 sm:flex-row sm:items-center"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#EAF3F8] text-[#0052A5]">
                        <CheckCircle2 size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-extrabold text-[#0F172A] ">
                            {claim.label}
                          </p>
                          <span className="text-sm font-extrabold text-[#0052A5]">
                            {currency(claim.amount)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E5E7EB]">
                            <div
                              className="h-full rounded-full bg-[#0066CC]"
                              style={{
                                width: `${Math.min(100, claim.percent * 3.33)}%`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-extrabold text-[#6B7280]">
                            {claim.percent}%
                          </span>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${claim.status === "Paid" ? "bg-[#EDF6EF] text-[#4D775D]" : claim.status === "Partially Paid" ? "bg-[#FFF6E2] text-[#9A6A13]" : "bg-[#EAF3F8] text-[#0052A5]"}`}
                      >
                        {claim.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <div className="mb-4">
                  <p className="eyebrow">Auto-expense deductions</p>
                  <h4 className="mt-1 font-display text-lg font-extrabold text-[#0F172A] ">
                    Project cost ledger
                  </h4>
                  <p className="mt-2 text-[11px] font-semibold text-[#78909D]">
                    {current.scope === "Material Only"
                      ? "Material Only scope: worker wage allocations are skipped."
                      : "Material + Labor scope: attach material and assigned worker wage costs."}
                  </p>
                </div>
                <form
                  onSubmit={saveExpense}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <label>
                    <span className="field-label">Raw materials (LKR)</span>
                    <input
                      type="number"
                      min="0"
                      value={expense.material}
                      onChange={e =>
                        setExpense({ ...expense, material: e.target.value })
                      }
                      className="field-input"
                      placeholder="0"
                    />
                  </label>
                  <label>
                    <span className="field-label">Worker wages (LKR)</span>
                    <input
                      type="number"
                      min="0"
                      disabled={current.scope === "Material Only"}
                      value={expense.labor}
                      onChange={e =>
                        setExpense({ ...expense, labor: e.target.value })
                      }
                      className="field-input disabled:cursor-not-allowed disabled:bg-[#F1F5F7]"
                      placeholder={
                        current.scope === "Material Only" ? "Skipped" : "0"
                      }
                    />
                  </label>
                  <button className="sm:col-span-2 rounded-xl bg-[#0F172A] px-4 py-3 text-xs font-extrabold text-white transition hover:bg-[#0052A5]">
                    Add cost deduction
                  </button>
                </form>
                <div className="mt-4 rounded-xl bg-[#F8FAFC] p-4 ">
                  <div className="flex justify-between text-xs font-semibold text-[#6B7280]">
                    <span>Project net profit</span>
                    <strong className="text-[#0F172A] ">
                      {currency(
                        current.agreedAmount -
                          current.materialCost -
                          current.laborCost
                      )}
                    </strong>
                  </div>
                  <div className="mt-3 flex justify-between text-xs font-semibold text-[#6B7280]">
                    <span>Retention ledger</span>
                    <span className="font-extrabold text-[#D97706]">
                      {currency(current.retentionAmount)} held ·{" "}
                      {current.claims.some(
                        claim =>
                          claim.label === "Final Release" &&
                          claim.status === "Paid"
                      )
                        ? "Released"
                        : "Pending release"}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </section>
        )}
        {modalPartner && (
          <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#0F172A]/50 p-5 backdrop-blur-sm">
            <form
              onSubmit={saveContract}
              className="my-8 w-full max-w-2xl rounded-2xl border border-[#D9E2E7] bg-white p-6 shadow-2xl "
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow">Solar partner desk</p>
                  <h3 className="mt-2 font-display text-2xl font-extrabold text-[#0F172A] ">
                    Add Sub-Contract
                  </h3>
                  <p className="mt-2 text-xs font-semibold text-[#627A88]">
                    Create a simple partner work order for {form.partner}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalPartner(null)}
                  className="rounded-lg p-2 text-[#78909D] hover:bg-[#F1F5F7]"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="field-label">Partner Name</span>
                  <select
                    value={form.partner}
                    onChange={e =>
                      setForm({
                        ...form,
                        partner: e.target.value as "Hayleys" | "Deep Tech",
                      })
                    }
                    className="field-input"
                  >
                    <option>Hayleys</option>
                    <option>Deep Tech</option>
                  </select>
                </label>
                <label>
                  <span className="field-label">PO / Ref Number</span>
                  <input
                    required
                    value={form.poNumber}
                    onChange={e =>
                      setForm({ ...form, poNumber: e.target.value })
                    }
                    className="field-input"
                    placeholder="e.g. HAY-SWP-2408"
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="field-label">Project Title / Location</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      required
                      value={form.project}
                      onChange={e =>
                        setForm({ ...form, project: e.target.value })
                      }
                      className="field-input"
                      placeholder="Solar Pump Installation"
                    />
                    <input
                      required
                      value={form.location}
                      onChange={e =>
                        setForm({ ...form, location: e.target.value })
                      }
                      className="field-input"
                      placeholder="Anuradhapura"
                    />
                  </div>
                </label>
                <label className="sm:col-span-2">
                  <span className="field-label">Contract Scope Type</span>
                  <div className="grid grid-cols-2 gap-2">
                    {["Material Only", "Material + Labor"].map(scope => (
                      <button
                        type="button"
                        key={scope}
                        onClick={() =>
                          setForm({ ...form, scope: scope as ContractScope })
                        }
                        className={`rounded-xl border px-3 py-3 text-xs font-extrabold transition ${form.scope === scope ? "border-[#0066CC] bg-[#EAF3F8] text-[#0052A5]" : "border-[#D9E2E7] text-[#627A88]"}`}
                      >
                        {scope}
                      </button>
                    ))}
                  </div>
                </label>
                <label>
                  <span className="field-label">
                    Agreed Contract Amount (LKR)
                  </span>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="field-input"
                    placeholder="0"
                  />
                </label>
                <label>
                  <span className="field-label">Advance Amount Paid (LKR)</span>
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.advance}
                    onChange={e =>
                      setForm({ ...form, advance: e.target.value })
                    }
                    className="field-input"
                    placeholder="0"
                  />
                </label>
                <label>
                  <span className="field-label">Retention Rate (%)</span>
                  <input
                    required
                    type="number"
                    min="0"
                    max="100"
                    value={form.retention}
                    onChange={e =>
                      setForm({ ...form, retention: e.target.value })
                    }
                    className="field-input"
                    placeholder="5"
                  />
                </label>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalPartner(null)}
                  className="rounded-xl border border-[#D9E2E7] px-4 py-3 text-xs font-extrabold text-[#627A88]"
                >
                  Cancel
                </button>
                <button className="rounded-xl bg-[#0066CC] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#0052A5]">
                  Save Sub-Contract
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
function PartnerMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#8CA0AB]">
        {label}
      </p>
      <p className="mt-1 text-sm font-extrabold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
function TableMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#8CA0AB]">
        {label}
      </p>
      <p className="mt-1 text-xs font-extrabold text-[#19364D] ">{value}</p>
    </div>
  );
}
function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] p-4 ">
      <Icon size={15} className="text-[#0066CC]" />
      <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#6B7280]">
        {label}
      </p>
      <p className="mt-1 text-sm font-extrabold text-[#0F172A] ">{value}</p>
    </div>
  );
}
