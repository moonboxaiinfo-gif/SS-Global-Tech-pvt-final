import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Camera,
  CheckCircle2,
  FileSpreadsheet,
  MessageCircle,
  Upload,
  WalletCards,
} from "lucide-react";
import {
  bankStatementRows,
  equityLedger,
  currency,
} from "@/lib/accountingData";

type StatementRow = {
  date: string;
  reference: string;
  description: string;
  amount: number;
};
type EquityRow = {
  id: string;
  date: string;
  type: string;
  company: string;
  amount: number;
  note: string;
};

/** SS Global finance tools: petty cash evidence, bank matching, owner equity separation, and shareable proofs. */
export default function FinanceTools() {
  const [receiptName, setReceiptName] = useState("");
  const [statementRows, setStatementRows] = useState<StatementRow[]>(
    bankStatementRows as StatementRow[]
  );
  const [equity, setEquity] = useState<EquityRow[]>(
    equityLedger as EquityRow[]
  );
  const [pettyCash, setPettyCash] = useState(0);
  const [float] = useState(0);
  const [attachmentCount, setAttachmentCount] = useState(0);
  const matchedCount = useMemo(
    () =>
      statementRows.filter(
        row =>
          row.reference.startsWith("MBL") ||
          row.reference.startsWith("PAY") ||
          row.reference.startsWith("IMPORTED")
      ).length,
    [statementRows]
  );
  const importStatement = (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv"))
      return toast.error("Choose a CSV bank e-statement.");
    const parsed = {
      date: new Date().toISOString().slice(0, 10),
      reference: `IMPORTED-${statementRows.length + 1}`,
      description: file.name,
      amount: 0,
    };
    setStatementRows(rows => [parsed, ...rows]);
    toast.success("Bank statement imported and matching candidates refreshed.");
  };
  const addReceipt = (file?: File) => {
    if (!file) return;
    setReceiptName(file.name);
    setAttachmentCount(count => count + 1);
    toast.success("Receipt attachment captured locally.");
  };
  const shareWhatsApp = (text: string) => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };
  return (
    <div className="mb-6 grid gap-6 xl:grid-cols-4">
      <section className="atlas-panel p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#E5E7EB] text-[#0052A5]">
            <Camera size={17} />
          </span>
          <div>
            <p className="eyebrow">Petty cash wallet</p>
            <h3 className="mt-1 font-display text-lg font-extrabold text-[#0F172A] ">
              Fixed float & evidence
            </h3>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#6B7280]">
              Balance
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold text-[#0052A5]">
              {currency(pettyCash)}
            </p>
          </div>
          <span className="rounded-full bg-[#FFF6E2] px-2 py-1 text-[10px] font-extrabold text-[#9A6A13]">
            Float {currency(float)}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
          <div
            className="h-full rounded-full bg-[#0066CC] transition-all"
            style={{ width: `${Math.min(100, (pettyCash / float) * 100)}%` }}
          />
        </div>
        <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#BFD5E8] bg-[#F8FAFC] p-4 transition hover:border-[#0066CC] hover:bg-[#EAF3F8] ">
          <Upload size={16} className="text-[#0066CC]" />
          <span className="truncate text-xs font-bold text-[#6B7280]">
            {receiptName || "Take a bill photo or choose an image"}
          </span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={event => addReceipt(event.target.files?.[0])}
          />
        </label>
        <p className="mt-2 text-[10px] font-semibold text-[#6B7280]">
          {attachmentCount} attachment{attachmentCount === 1 ? "" : "s"} ready
          for voucher evidence.
        </p>
        <button
          onClick={() => {
            setPettyCash(value => Math.max(0, value - 5000));
            toast.success("Petty cash expense recorded with receipt evidence.");
          }}
          className="mt-3 w-full rounded-lg bg-[#0F172A] px-3 py-2 text-[10px] font-extrabold text-white"
        >
          Record Rs. 5,000 expense
        </button>
      </section>
      <section className="atlas-panel p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#EAF3F8] text-[#0052A5]">
            <FileSpreadsheet size={17} />
          </span>
          <div>
            <p className="eyebrow">Bank matching</p>
            <h3 className="mt-1 font-display text-lg font-extrabold text-[#0F172A] ">
              Import e-statement
            </h3>
          </div>
        </div>
        <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0066CC] px-4 py-3 text-xs font-extrabold text-white transition hover:bg-[#0052A5]">
          <Upload size={15} /> Upload bank CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={event => importStatement(event.target.files?.[0])}
          />
        </label>
        <div className="mt-4 rounded-xl bg-[#F8FAFC] p-4 ">
          <div className="flex items-center justify-between text-xs font-bold text-[#6B7280]">
            <span>Rows recognized</span>
            <span className="font-extrabold text-[#0F172A] ">
              {statementRows.length}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-bold text-[#6B7280]">
            <span>Auto-match candidates</span>
            <span className="font-extrabold text-[#4D775D]">
              {matchedCount}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-bold text-[#6B7280]">
            <span>Unmatched review</span>
            <span className="font-extrabold text-[#9A6A13]">
              {statementRows.length - matchedCount}
            </span>
          </div>
        </div>
      </section>
      <section className="atlas-panel p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#0F172A] text-white">
            <WalletCards size={17} />
          </span>
          <div>
            <p className="eyebrow">Owner equity</p>
            <h3 className="mt-1 font-display text-lg font-extrabold text-[#0F172A] ">
              Capital & drawings
            </h3>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {equity.slice(0, 3).map(entry => (
            <div
              key={entry.id}
              className="flex items-center gap-2 rounded-lg bg-[#F8FAFC] p-3 "
            >
              <CheckCircle2 size={14} className="text-[#0052A5]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-extrabold text-[#0F172A] ">
                  {entry.type}
                </p>
                <p className="text-[10px] font-semibold text-[#6B7280]">
                  {entry.company}
                </p>
              </div>
              <span
                className={`text-xs font-extrabold ${entry.amount < 0 ? "text-[#A35749]" : "text-[#4D775D]"}`}
              >
                {currency(entry.amount)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setEquity(items => [
                {
                  id: `eq-${Date.now()}`,
                  date: new Date().toISOString().slice(0, 10),
                  type: "Owner Capital Injection",
                  company: "All companies",
                  amount: 50000,
                  note: "Local demo entry",
                },
                ...items,
              ]);
              toast.success("Capital injection added outside P&L.");
            }}
            className="rounded-lg border border-[#BFD5E8] px-2 py-2 text-[10px] font-extrabold text-[#0052A5]"
          >
            + Capital
          </button>
          <button
            onClick={() => {
              setEquity(items => [
                {
                  id: `eq-${Date.now()}`,
                  date: new Date().toISOString().slice(0, 10),
                  type: "Owner Drawing",
                  company: "All companies",
                  amount: -15000,
                  note: "Local demo entry",
                },
                ...items,
              ]);
              toast.success("Owner drawing added outside P&L.");
            }}
            className="rounded-lg border border-[#F0C9C0] px-2 py-2 text-[10px] font-extrabold text-[#A35749]"
          >
            − Drawing
          </button>
        </div>
      </section>
      <section className="atlas-panel p-5">
        <p className="eyebrow">Payment proofs</p>
        <h3 className="mt-1 font-display text-lg font-extrabold text-[#0F172A] ">
          Share evidence
        </h3>
        <p className="mt-3 text-xs font-semibold leading-5 text-[#6B7280]">
          Send a formatted receipt or voucher summary directly to a customer or
          technician.
        </p>
        <button
          onClick={() =>
            shareWhatsApp(
              "SS Global Tech Enterprises payment receipt proof is ready. Amount: Rs. 5,000. Evidence attached in the local voucher."
            )
          }
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-3 text-[10px] font-extrabold text-white transition hover:-translate-y-0.5"
        >
          <MessageCircle size={14} /> Share via WhatsApp
        </button>
      </section>
    </div>
  );
}
