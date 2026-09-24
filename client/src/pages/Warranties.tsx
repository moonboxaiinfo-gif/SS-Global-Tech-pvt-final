import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Download,
  Printer,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { downloadBrandedPdf, printBrandedDocument } from "@/lib/pdf";
import { companyName, money, type Warranty } from "@/lib/salesData";
import { listErpRows } from "@/lib/erpData";

/** Field Atlas: warranty status is a watch window—amber is attention, coral is risk, navy is the record. */
export default function Warranties() {
  const [filter, setFilter] = useState<
    "all" | "active" | "expiring" | "expired"
  >("all");
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  useEffect(() => {
    void listErpRows<any>(
      "item_warranties",
      "id,customer_name,item_name,serial_number,customer_warranty_expiry,workspace"
    )
      .then(rows =>
        setWarranties(
          rows.map(row => ({
            id: row.id,
            saleId: row.sale_id || row.id,
            customer: row.customer_name,
            product: row.item_name,
            serial: row.serial_number,
            companyId: row.workspace || "solar",
            warrantyYears: 1,
            saleDate: new Date().toISOString().slice(0, 10),
            startDate: row.start_date || new Date().toISOString().slice(0, 10),
            expiryDate: row.customer_warranty_expiry,
          }))
        )
      )
      .catch(cause =>
        toast.error(
          cause instanceof Error
            ? cause.message
            : "Warranties could not be loaded from Supabase."
        )
      );
  }, []);
  const classified = useMemo(
    () =>
      warranties.map(warranty => ({
        ...warranty,
        status: getStatus(warranty.expiryDate),
      })),
    [warranties]
  );
  const visible = classified.filter(
    warranty => filter === "all" || warranty.status === filter
  );
  const counts = {
    active: classified.filter(item => item.status === "active").length,
    expiring: classified.filter(item => item.status === "expiring").length,
    expired: classified.filter(item => item.status === "expired").length,
  };
  const warrantyPdf = () => ({
    title: "Warranty Coverage",
    documentNo: `WAR-${new Date().toISOString().slice(0, 10)}`,
    date: new Date().toISOString().slice(0, 10),
    subtitle: "Customer warranty coverage register",
    summaries: [
      {
        label: "Active coverage",
        value: String(counts.active + counts.expiring),
      },
      {
        label: "Expiring soon",
        value: String(counts.expiring),
        tone: "amber" as const,
      },
      {
        label: "Expired",
        value: String(counts.expired),
        tone: "rose" as const,
      },
    ],
    columns: [
      { label: "Customer / Product", width: 63 },
      { label: "Serial", width: 37 },
      { label: "Company", width: 33 },
      { label: "Expiry", width: 30, align: "right" as const },
      { label: "Status", width: 28, align: "right" as const },
    ],
    rows: visible.map(warranty => [
      `${warranty.customer} · ${warranty.product} (${warranty.warrantyYears}-year)`,
      warranty.serial,
      companyName(warranty.companyId),
      warranty.expiryDate,
      warranty.status === "expiring"
        ? "Expiring soon"
        : warranty.status === "expired"
          ? "Expired"
          : "Active",
    ]),
    terms: [
      "Warranty coverage is shown in LKR group records and customer serial references.",
      "Please contact SS Global Tech for service or renewal support.",
    ],
  });
  const download = () => {
    downloadBrandedPdf(warrantyPdf(), "ss-global-warranty-report.pdf");
    toast.success("Branded warranty report downloaded.");
  };
  const print = () => {
    printBrandedDocument(warrantyPdf());
    toast.success("Warranty report opened for printing.");
  };

  return (
    <div className="relative overflow-hidden px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="relative mx-auto max-w-[1440px]">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow">Coverage register / 08</p>
            <h2 className="mt-4 font-display text-[36px] font-extrabold tracking-[-0.06em] sm:text-[46px]">
              Solar warranty tracker
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#627A88]">
              One watch window for every panel, inverter, and battery sold by
              the group. Expiry status is calculated from each sale date and
              warranty term.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 self-start lg:self-end">
            <button
              onClick={download}
              className="flex items-center gap-2 rounded-xl bg-[#0066CC] px-4 py-3 text-xs font-extrabold text-white transition hover:bg-[#0052A5]"
            >
              <Download size={15} /> Download PDF
            </button>
            <button
              onClick={print}
              className="flex items-center gap-2 rounded-xl border border-[#D9E2E7] bg-white px-4 py-3 text-xs font-extrabold text-[#476174] transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <Printer size={15} /> Print
            </button>
            <Link
              href="/sales"
              className="flex items-center gap-2 rounded-xl border border-[#D9E2E7] bg-white px-4 py-3 text-xs font-extrabold text-[#476174] transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              Open sales register <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <Summary
            label="Total active warranties"
            value={String(counts.active + counts.expiring)}
            note="coverage still in force"
            tone="blue"
            icon={ShieldCheck}
          />
          <Summary
            label="Expiring in 30 days"
            value={String(counts.expiring)}
            note="needs a customer touchpoint"
            tone="amber"
            icon={TimerReset}
          />
          <Summary
            label="Expired warranties"
            value={String(counts.expired)}
            note="review renewal or closure"
            tone="coral"
            icon={CircleAlert}
          />
        </div>
        <section className="atlas-panel overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-[#E2E9ED] px-5 py-5 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">Asset watch window</p>
              <h3 className="mt-2 font-display text-xl font-extrabold tracking-[-0.04em]">
                Warranty coverage{" "}
                <span className="ml-1 text-sm font-semibold text-[#8CA0AB]">
                  · {visible.length} shown
                </span>
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All coverage"],
                  ["active", "Active"],
                  ["expiring", "Expiring soon"],
                  ["expired", "Expired"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold transition ${filter === value ? (value === "expiring" ? "bg-[#E5A83B] text-[#10263D]" : value === "expired" ? "bg-[#C57B67] text-white" : "bg-[#10263D] text-white") : "bg-[#F1F5F7] text-[#627A88] hover:bg-[#E8EEF1]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-[#E2E9ED]">
            {visible.map(warranty => (
              <WarrantyRow
                key={warranty.id}
                warranty={warranty}
                onOpen={() =>
                  toast(
                    `${warranty.serial} detail view is staged for the next iteration`
                  )
                }
              />
            ))}
          </div>
          {visible.length === 0 && (
            <div className="py-20 text-center text-sm font-semibold text-[#78909D]">
              No warranty records match this status.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function getStatus(expiryDate: string): "active" | "expiring" | "expired" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${expiryDate}T00:00:00`);
  const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
  return days < 0 ? "expired" : days <= 30 ? "expiring" : "active";
}
function daysUntil(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${date}T00:00:00`);
  return Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
}
function WarrantyRow({
  warranty,
  onOpen,
}: {
  warranty: Warranty & { status: "active" | "expiring" | "expired" };
  onOpen: () => void;
}) {
  const days = daysUntil(warranty.expiryDate);
  const expiring = warranty.status === "expiring";
  const expired = warranty.status === "expired";
  return (
    <div
      className={`p-5 transition hover:bg-[#F7FAFB] sm:px-6 ${expiring ? "bg-[#FFFBF2]" : expired ? "bg-[#FFF9F7]" : ""}`}
    >
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="flex items-start gap-4">
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${expiring ? "bg-[#FFF0C9] text-[#9A6A13]" : expired ? "bg-[#FBEFEB] text-[#A35749]" : "bg-[#EDF6EF] text-[#4D775D]"}`}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-extrabold text-[#19364D]">
                {warranty.customer}
              </p>
              <span className="rounded-full bg-[#F1F5F7] px-2 py-1 text-[10px] font-extrabold text-[#78909D]">
                {companyName(warranty.companyId)}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-[#627A88]">
              {warranty.product} · {warranty.warrantyYears}-year coverage
            </p>
            <p className="mt-2 font-mono text-[11px] font-bold text-[#8CA0AB]">
              SERIAL / {warranty.serial}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-8 lg:justify-end">
          <div className="text-left lg:text-right">
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8CA0AB]">
              <CalendarClock size={13} /> Expires {warranty.expiryDate}
            </div>
            <p
              className={`mt-1 text-sm font-extrabold ${expiring ? "text-[#9A6A13]" : expired ? "text-[#A35749]" : "text-[#4D775D]"}`}
            >
              {expired
                ? `${Math.abs(days)} days ago`
                : `${days} days remaining`}
            </p>
          </div>
          <button
            onClick={onOpen}
            className="rounded-lg p-2 text-[#A9BBC6] hover:bg-white hover:text-[#19364D]"
          >
            <ArrowUpRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
function Summary({
  label,
  value,
  note,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  tone: "blue" | "amber" | "coral";
  icon: typeof ShieldCheck;
}) {
  const styles = {
    blue: "bg-[#EAF3F8] text-[#34647F]",
    amber: "bg-[#FFF6E2] text-[#9A6A13]",
    coral: "bg-[#FBEFEB] text-[#A35749]",
  };
  return (
    <div className="atlas-panel p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#78909D]">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-[-0.06em] text-[#10263D]">
            {value}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#8CA0AB]">
            {note}
          </p>
        </div>
        <div
          className={`grid h-9 w-9 place-items-center rounded-lg ${styles[tone]}`}
        >
          <Icon size={17} />
        </div>
      </div>
    </div>
  );
}
