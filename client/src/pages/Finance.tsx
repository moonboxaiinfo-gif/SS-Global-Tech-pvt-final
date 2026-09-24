import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  Banknote,
  CheckCircle2,
  Download,
  Landmark,
  Plus,
  ReceiptText,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useBusinessField } from "@/contexts/BusinessFieldContext";
import FieldScopeBanner from "@/components/FieldScopeBanner";
import {
  deleteErpRow,
  insertErpRow,
  listErpRows,
  updateErpRow,
} from "@/lib/erpData";
import { money } from "@/lib/projectData";
import { downloadBrandedPdf, printBrandedDocument } from "@/lib/pdf";

type AccountType = "Cash" | "Bank";
type EntryType = "Income" | "Expense" | "Transfer";
type Account = {
  id: string;
  name: string;
  account_type: AccountType;
  workspace: string;
  opening_balance: number;
};
type Entry = {
  id: string;
  account_id: string;
  entry_type: EntryType;
  direction: "In" | "Out";
  amount: number;
  description: string;
  entry_date: string;
  counterpart_account_id?: string | null;
};
type ModalAction = "Income" | "Expense" | "Transfer" | "Account" | null;

const workspaceOptions = [
  "All Workspaces",
  "Solar Energy",
  "Irrigation",
  "Iron Work",
  "Furniture",
];

export default function Finance() {
  const { fieldId } = useBusinessField();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [action, setAction] = useState<ModalAction>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    accountId: "",
    counterpartId: "",
    type: "Income" as EntryType,
    amount: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    name: "",
    accountType: "Cash" as AccountType,
    openingBalance: "",
  });

  const reload = async () => {
    setLoading(true);
    try {
      const [remoteAccounts, remoteEntries] = await Promise.all([
        listErpRows<Account>(
          "finance_accounts",
          "id,name,account_type,workspace,opening_balance"
        ),
        listErpRows<Entry>(
          "finance_entries",
          "id,account_id,entry_type,direction,amount,description,entry_date,counterpart_account_id"
        ),
      ]);
      setAccounts(
        remoteAccounts.map(row => ({
          ...row,
          opening_balance: Number(row.opening_balance) || 0,
        }))
      );
      setEntries(
        remoteEntries.map(row => ({ ...row, amount: Number(row.amount) || 0 }))
      );
    } catch (cause) {
      setAccounts([]);
      setEntries([]);
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Finance data could not be loaded from Supabase."
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void reload();
  }, []);

  const visibleAccounts = useMemo(
    () =>
      accounts.filter(
        account =>
          workspace === "All Workspaces" || account.workspace === workspace
      ),
    [accounts, workspace]
  );
  const visibleAccountIds = useMemo(
    () => new Set(visibleAccounts.map(account => account.id)),
    [visibleAccounts]
  );
  const visibleEntries = useMemo(
    () => entries.filter(entry => visibleAccountIds.has(entry.account_id)),
    [entries, visibleAccountIds]
  );
  const balanceFor = (account: Account) =>
    account.opening_balance +
    entries
      .filter(entry => entry.account_id === account.id)
      .reduce(
        (sum, entry) =>
          sum + (entry.direction === "In" ? entry.amount : -entry.amount),
        0
      );
  const cashBalance = visibleAccounts
    .filter(account => account.account_type === "Cash")
    .reduce((sum, account) => sum + balanceFor(account), 0);
  const bankBalance = visibleAccounts
    .filter(account => account.account_type === "Bank")
    .reduce((sum, account) => sum + balanceFor(account), 0);

  const openAction = (next: Exclude<ModalAction, null>) => {
    setAction(next);
    const firstCash =
      visibleAccounts.find(account => account.account_type === "Cash")?.id ??
      "";
    const firstBank =
      visibleAccounts.find(account => account.account_type === "Bank")?.id ??
      "";
    setForm({
      accountId: next === "Transfer" ? firstCash : firstCash || firstBank,
      counterpartId: firstBank,
      type:
        next === "Expense"
          ? "Expense"
          : next === "Transfer"
            ? "Transfer"
            : "Income",
      amount: "",
      description: "",
      date: new Date().toISOString().slice(0, 10),
      name: "",
      accountType: "Cash",
      openingBalance: "",
    });
  };

  const saveAccount = async () => {
    const openingBalance = Number(form.openingBalance);
    if (
      !form.name.trim() ||
      !Number.isFinite(openingBalance) ||
      openingBalance < 0
    )
      return toast.error("Enter an account name and a valid opening balance.");
    setSaving(true);
    try {
      const row = await insertErpRow<Account>(
        "finance_accounts",
        {
          name: form.name.trim(),
          account_type: form.accountType,
          workspace:
            workspace === "All Workspaces" ? "All Workspaces" : workspace,
          opening_balance: openingBalance,
        },
        "id,name,account_type,workspace,opening_balance"
      );
      setAccounts(current => [
        { ...row, opening_balance: Number(row.opening_balance) || 0 },
        ...current,
      ]);
      setAction(null);
      toast.success("Account opening balance saved to Supabase.");
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Account could not be saved to Supabase."
      );
    } finally {
      setSaving(false);
    }
  };

  const saveEntry = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.accountId || !amount || amount <= 0 || !form.description.trim())
      return toast.error(
        "Select an account and enter a description and valid amount."
      );
    const account = accounts.find(item => item.id === form.accountId);
    if (!account) return toast.error("The selected account is not available.");
    if (
      form.type === "Transfer" &&
      (!form.counterpartId || form.counterpartId === form.accountId)
    )
      return toast.error("Select a different destination account.");
    if (form.type === "Transfer" && balanceFor(account) < amount)
      return toast.error("The source account balance is too low.");
    setSaving(true);
    try {
      const sourceDirection = form.type === "Income" ? "In" : "Out";
      const source = await insertErpRow<Entry>(
        "finance_entries",
        {
          account_id: form.accountId,
          entry_type: form.type,
          direction: sourceDirection,
          amount,
          description: form.description.trim(),
          entry_date: form.date,
          counterpart_account_id:
            form.type === "Transfer" ? form.counterpartId : null,
        },
        "id,account_id,entry_type,direction,amount,description,entry_date,counterpart_account_id"
      );
      let saved = [source];
      if (form.type === "Transfer") {
        const destination = await insertErpRow<Entry>(
          "finance_entries",
          {
            account_id: form.counterpartId,
            entry_type: "Transfer",
            direction: "In",
            amount,
            description: `Transfer from ${account.name}: ${form.description.trim()}`,
            entry_date: form.date,
            counterpart_account_id: form.accountId,
          },
          "id,account_id,entry_type,direction,amount,description,entry_date,counterpart_account_id"
        );
        saved = [source, destination];
      }
      setEntries(current => [
        ...saved.map(row => ({ ...row, amount: Number(row.amount) || 0 })),
        ...current,
      ]);
      setAction(null);
      toast.success("Finance entry saved to Supabase.");
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Finance entry could not be saved. No local fallback was used."
      );
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async (id: string) => {
    try {
      await deleteErpRow("finance_entries", id);
      setEntries(current => current.filter(entry => entry.id !== id));
      toast.success("Entry deleted from Supabase.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Entry could not be deleted."
      );
    }
  };
  const accountName = (id: string) =>
    accounts.find(account => account.id === id)?.name ?? "Unknown account";
  const report = () => ({
    title: "Finance Ledger",
    documentNo: `FIN-${new Date().toISOString().slice(0, 10)}`,
    date: new Date().toISOString().slice(0, 10),
    subtitle: "Supabase-backed cash and bank ledger",
    summaries: [
      { label: "Cash in hand", value: money(cashBalance) },
      { label: "Bank balance", value: money(bankBalance) },
    ],
    columns: [
      { label: "Date", width: 24 },
      { label: "Account", width: 42 },
      { label: "Description", width: 66 },
      { label: "Direction", width: 24 },
      { label: "Amount", width: 28, align: "right" as const },
    ],
    rows: visibleEntries.map(entry => [
      entry.entry_date,
      accountName(entry.account_id),
      entry.description,
      entry.direction,
      money(entry.amount),
    ]),
    terms: [
      "All balances are calculated from Supabase opening balances and ledger entries.",
    ],
  });

  return (
    <div className="relative overflow-hidden px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow text-[#0052A5]">
              Operational accounting center / Supabase ledger
            </p>
            <h2 className="mt-4 font-display text-[36px] font-extrabold tracking-[-.06em] text-[#0F172A] sm:text-[46px]">
              Finance
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#627A88]">
              Cash in hand, petty cash, bank account balances, transfers,
              income, and expenses are read and written directly to Supabase.
            </p>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#8CA0AB]">
              {loading
                ? "Loading Supabase ledger…"
                : "Supabase database mode — no fake balances"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => openAction("Income")}
              className="flex items-center gap-2 rounded-xl bg-[#0066CC] px-4 py-3 text-xs font-extrabold text-white"
            >
              <Plus size={15} /> Record Income
            </button>
            <button
              onClick={() => openAction("Expense")}
              className="flex items-center gap-2 rounded-xl bg-[#A35749] px-4 py-3 text-xs font-extrabold text-white"
            >
              <Plus size={15} /> Record Expense
            </button>
            <button
              onClick={() => openAction("Transfer")}
              className="flex items-center gap-2 rounded-xl border border-[#BFD5E8] bg-white px-4 py-3 text-xs font-extrabold text-[#0052A5]"
            >
              <ArrowDownUp size={15} /> Cash/Bank Transfer
            </button>
            <button
              onClick={() => openAction("Account")}
              className="flex items-center gap-2 rounded-xl border border-[#BFD5E8] bg-white px-4 py-3 text-xs font-extrabold text-[#0052A5]"
            >
              <Landmark size={15} /> Add Account
            </button>
            <button
              onClick={() =>
                downloadBrandedPdf(report(), "ss-global-finance-ledger.pdf")
              }
              className="flex items-center gap-2 rounded-xl border border-[#BFD5E8] bg-white px-3 py-3 text-xs font-extrabold text-[#0052A5]"
            >
              <Download size={15} /> PDF
            </button>
            <button
              onClick={() => printBrandedDocument(report())}
              className="flex items-center gap-2 rounded-xl border border-[#BFD5E8] bg-white px-3 py-3 text-xs font-extrabold text-[#0052A5]"
            >
              <ReceiptText size={15} /> Print
            </button>
          </div>
        </div>
        <FieldScopeBanner />
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <select
            value={workspace}
            onChange={event => setWorkspace(event.target.value)}
            className="field-input max-w-xs"
          >
            {workspaceOptions.map(option => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <span className="text-xs font-semibold text-[#78909D]">
            Business field: {fieldId}
          </span>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <Metric
            label="Cash in Hand / Petty Cash"
            value={money(cashBalance)}
            icon={WalletCards}
          />
          <Metric
            label="Bank Account Balance"
            value={money(bankBalance)}
            icon={Landmark}
          />
        </div>
        <section className="atlas-panel mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#E2E9ED] px-5 py-5">
            <div>
              <p className="eyebrow">Supabase accounts</p>
              <h3 className="mt-2 font-display text-xl font-extrabold text-[#19364D]">
                Cash and bank accounts · {visibleAccounts.length}
              </h3>
            </div>
            <Banknote className="text-[#0066CC]" size={20} />
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-2">
            {visibleAccounts.map(account => (
              <div
                key={account.id}
                className="rounded-xl border border-[#D9E2E7] bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-[#19364D]">
                      {account.name}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#78909D]">
                      {account.account_type} · {account.workspace}
                    </p>
                  </div>
                  <p className="text-lg font-extrabold text-[#0052A5]">
                    {money(balanceFor(account))}
                  </p>
                </div>
              </div>
            ))}
            {!visibleAccounts.length && (
              <p className="px-2 py-8 text-center text-sm font-semibold text-[#78909D] md:col-span-2">
                No accounts yet. Add Cash in Hand, Petty Cash, or Bank Account
                and set the real opening balance.
              </p>
            )}
          </div>
        </section>
        <section className="atlas-panel mt-6 overflow-hidden">
          <div className="border-b border-[#E2E9ED] px-5 py-5">
            <p className="eyebrow">Supabase transaction ledger</p>
            <h3 className="mt-2 font-display text-xl font-extrabold text-[#19364D]">
              All saved entries · {visibleEntries.length}
            </h3>
          </div>
          <div className="divide-y divide-[#E2E9ED]">
            {visibleEntries.map(entry => (
              <div
                key={entry.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-[#19364D]">
                    {entry.description}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-[#78909D]">
                    {entry.entry_date} · {accountName(entry.account_id)} ·{" "}
                    {entry.entry_type}
                  </p>
                </div>
                <span
                  className={`text-sm font-extrabold ${entry.direction === "In" ? "text-[#4D775D]" : "text-[#A35749]"}`}
                >
                  {entry.direction === "In" ? "+" : "−"}
                  {money(entry.amount)}
                </span>
                <button
                  onClick={() => void removeEntry(entry.id)}
                  className="rounded-lg border border-[#F0C9C0] p-2 text-[#A35749]"
                  aria-label="Delete ledger entry"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {!visibleEntries.length && (
              <p className="px-5 py-10 text-center text-sm font-semibold text-[#78909D]">
                No finance entries saved in Supabase yet.
              </p>
            )}
          </div>
        </section>
        {action && (
          <FinanceModal
            action={action}
            form={form}
            setForm={setForm}
            accounts={accounts}
            saving={saving}
            onClose={() => setAction(null)}
            onSave={
              action === "Account"
                ? () => void saveAccount()
                : event => {
                    if (event) void saveEntry(event);
                  }
            }
          />
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof WalletCards;
}) {
  return (
    <article className="atlas-panel rounded-2xl p-5">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EAF3F8] text-[#0052A5]">
        <Icon size={18} />
      </div>
      <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#78909D]">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-extrabold text-[#10263D]">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-semibold text-[#8CA0AB]">
        Calculated from Supabase
      </p>
    </article>
  );
}
function FinanceModal({
  action,
  form,
  setForm,
  accounts,
  saving,
  onClose,
  onSave,
}: {
  action: Exclude<ModalAction, null>;
  form: any;
  setForm: (value: any) => void;
  accounts: Account[];
  saving: boolean;
  onClose: () => void;
  onSave: (event?: FormEvent) => void;
}) {
  const isAccount = action === "Account";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#10263D]/55 p-5">
      <form
        onSubmit={event => {
          event.preventDefault();
          void onSave(event);
        }}
        className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">Supabase finance ledger</p>
            <h3 className="mt-2 font-display text-2xl font-extrabold">
              {isAccount ? "Add cash or bank account" : `Record ${action}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#78909D]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {isAccount ? (
            <>
              <Field
                label="Account name"
                value={form.name}
                onChange={value => setForm({ ...form, name: value })}
                placeholder="Cash in Hand / Petty Cash / Bank Account"
                required
              />
              <Select
                label="Account type"
                value={form.accountType}
                onChange={value => setForm({ ...form, accountType: value })}
                options={["Cash", "Bank"]}
              />
              <Field
                label="Opening balance (LKR)"
                type="number"
                value={form.openingBalance}
                onChange={value => setForm({ ...form, openingBalance: value })}
                required
              />
            </>
          ) : (
            <>
              <Select
                label={action === "Transfer" ? "From account" : "Account"}
                value={form.accountId}
                onChange={value => setForm({ ...form, accountId: value })}
                options={accounts.map(account => ({
                  value: account.id,
                  label: `${account.name} · ${account.account_type}`,
                }))}
              />
              <>
                {action === "Transfer" && (
                  <Select
                    label="To account"
                    value={form.counterpartId}
                    onChange={value =>
                      setForm({ ...form, counterpartId: value })
                    }
                    options={accounts.map(account => ({
                      value: account.id,
                      label: `${account.name} · ${account.account_type}`,
                    }))}
                  />
                )}
              </>
              <Field
                label="Description"
                value={form.description}
                onChange={value => setForm({ ...form, description: value })}
                placeholder="e.g. Customer payment / supplier expense"
                required
              />
              <Field
                label="Amount (LKR)"
                type="number"
                value={form.amount}
                onChange={value => setForm({ ...form, amount: value })}
                required
              />
              <Field
                label="Date"
                type="date"
                value={form.date}
                onChange={value => setForm({ ...form, date: value })}
                required
              />
            </>
          )}
        </div>
        <button
          disabled={saving}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0066CC] text-sm font-extrabold text-white disabled:opacity-60"
        >
          {saving ? "Saving to Supabase…" : "Save to Supabase"}
          <CheckCircle2 size={16} />
        </button>
      </form>
    </div>
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
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[.12em] text-[#78909D]">
        {label}
      </span>
      <input
        required={required}
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
  options: string[] | { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[.12em] text-[#78909D]">
        {label}
      </span>
      <select
        required
        value={value}
        onChange={event => onChange(event.target.value)}
        className="field-input"
      >
        <option value="">Select…</option>
        {options.map(option => {
          const item =
            typeof option === "string"
              ? { value: option, label: option }
              : option;
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
