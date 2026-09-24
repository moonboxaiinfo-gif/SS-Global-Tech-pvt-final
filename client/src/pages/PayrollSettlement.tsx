import { useMemo, useState } from "react";
import { Download, FileText, MessageCircle, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { initialEmployees, initialPayroll, money } from "@/lib/hrData";
import { initialPayouts } from "@/lib/accountingData";
import FieldScopeBanner from "@/components/FieldScopeBanner";

/** Consolidated settlement engine: aggregates project advances across all business fields before final salary payment. */
export default function PayrollSettlement() {
  const [selectedId, setSelectedId] = useState(initialEmployees[0]?.id ?? "");
  const month = "August 2026";
  const rows = useMemo(
    () =>
      initialEmployees.map(employee => {
        const payroll = initialPayroll.find(
          record => record.employee_id === employee.id
        );
        const advances = initialPayouts
          .filter(
            payout =>
              payout.employeeId === employee.id &&
              payout.type !== "Final Monthly Salary Settlement"
          )
          .reduce((sum, payout) => sum + payout.amount, 0);
        const earnings = payroll?.basic_salary ?? employee.basic_salary;
        const ot = payroll?.ot_hours ? payroll.ot_hours * 500 : 0;
        return {
          employee,
          earnings,
          ot,
          advances,
          net: earnings + ot - advances,
        };
      }),
    []
  );
  const selected = rows.find(row => row.employee.id === selectedId) ?? rows[0];
  if (!selected)
    return (
      <div className="atlas-panel mx-5 my-8 p-10 text-center text-sm font-semibold text-[#627A88]">
        No employee payroll records are available in Supabase yet.
      </div>
    );
  const downloadPayslip = () => {
    const lines = [
      `SS GLOBAL TECH ENTERPRISES — FINAL MONTHLY PAYSLIP`,
      `Period,${month}`,
      `Employee,${selected.employee.name}`,
      `Basic salary,${selected.earnings}`,
      `Overtime,${selected.ot}`,
      `Advance deductions,${selected.advances}`,
      `Net payable (LKR),${selected.net}`,
    ];
    const url = URL.createObjectURL(
      new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selected.employee.name.replace(/\s+/g, "-").toLowerCase()}-payslip-${month.replace(" ", "-")}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Payslip voucher downloaded.");
  };
  const shareWhatsApp = () => {
    const text = `SS Global Tech Enterprises payslip — ${selected.employee.name} — ${month} — Net payable: ${money(selected.net)}. Advance deductions: ${money(selected.advances)}.`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };
  return (
    <div className="relative overflow-hidden px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow text-[#0052A5]">
              Payroll control / monthly settlement
            </p>
            <h2 className="mt-4 font-display text-[36px] font-extrabold tracking-[-.06em] text-[#0F172A] sm:text-[46px]">
              Final salary settlement
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#627A88] ">
              Aggregate project advances and ad-hoc payouts across all four
              business fields, then deduct them from the monthly salary slip.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#BFD5E8] bg-white px-4 py-3 text-xs font-extrabold text-[#0052A5] ">
            <WalletCards size={16} /> {month}
          </div>
        </div>
        <FieldScopeBanner />
        <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
          <section className="atlas-panel overflow-hidden">
            <div className="border-b border-[#E5E7EB] px-5 py-5">
              <p className="eyebrow">Shared employee ledger</p>
              <h3 className="mt-2 font-display text-xl font-extrabold text-[#0F172A] ">
                Settlement candidates
              </h3>
            </div>
            <div className="divide-y divide-[#E5E7EB]">
              {rows.map(row => (
                <button
                  key={row.employee.id}
                  onClick={() => setSelectedId(row.employee.id)}
                  className={`flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#F8FAFC] ${row.employee.id === selectedId ? "bg-[#EAF3F8] " : ""}`}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#E5E7EB] text-[#0052A5]">
                    <FileText size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-[#0F172A] ">
                      {row.employee.name}
                    </span>
                    <span className="mt-1 block text-[10px] font-semibold text-[#6B7280]">
                      Advance deductions {money(row.advances)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-extrabold text-[#0052A5]">
                      {money(row.net)}
                    </span>
                    <span className="text-[10px] font-bold text-[#6B7280]">
                      net payable
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section className="space-y-6">
            <div className="atlas-panel p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="eyebrow">Payslip voucher</p>
                  <h3 className="mt-2 font-display text-2xl font-extrabold text-[#0F172A] ">
                    {selected.employee.name}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                    {month} · consolidated across all fields
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={downloadPayslip}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-[#D9E2E7] text-[#0052A5] transition hover:-translate-y-0.5 hover:shadow-sm"
                    title="Download payslip"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={shareWhatsApp}
                    className="grid h-10 w-10 place-items-center rounded-xl bg-[#25D366] text-white transition hover:-translate-y-0.5"
                    title="Share via WhatsApp"
                  >
                    <MessageCircle size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Amount label="Earnings" value={money(selected.earnings)} />
                <Amount label="Overtime" value={money(selected.ot)} />
                <Amount
                  label="Advance deductions"
                  value={`− ${money(selected.advances)}`}
                  negative
                />
              </div>
              <div className="mt-4 flex items-end justify-between rounded-2xl bg-[#0F172A] p-5 text-white">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-white/60">
                    Net payable balance
                  </p>
                  <p className="mt-2 font-display text-3xl font-extrabold tracking-[-.05em]">
                    {money(selected.net)}
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-extrabold">
                  READY TO PAY
                </span>
              </div>
            </div>
            <div className="atlas-panel p-5">
              <p className="eyebrow">Deduction trace</p>
              <div className="mt-4 space-y-3">
                {initialPayouts
                  .filter(
                    payout =>
                      payout.employeeId === selected.employee.id &&
                      payout.type !== "Final Monthly Salary Settlement"
                  )
                  .map(payout => (
                    <div
                      key={payout.id}
                      className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 text-xs"
                    >
                      <span>
                        <span className="block font-extrabold text-[#0F172A] ">
                          {payout.type}
                        </span>
                        <span className="text-[10px] font-semibold text-[#6B7280]">
                          {payout.project} · {payout.fieldId}
                        </span>
                      </span>
                      <span className="font-extrabold text-[#A35749]">
                        − {money(payout.amount)}
                      </span>
                    </div>
                  ))}
                <p className="text-[11px] font-semibold text-[#6B7280]">
                  Every project-linked payout is treated as a direct labor
                  advance and included before settlement.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
function Amount({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] p-4 ">
      <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#6B7280]">
        {label}
      </p>
      <p
        className={`mt-2 font-display text-lg font-extrabold ${negative ? "text-[#A35749]" : "text-[#0F172A] "}`}
      >
        {value}
      </p>
    </div>
  );
}
