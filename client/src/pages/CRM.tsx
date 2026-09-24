import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleDot,
  Headphones,
  Mail,
  Phone,
  Plus,
  Search,
  Send,
  TrendingUp,
  UserPlus,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { moneyLkr } from "@/lib/operationsData";
import { useBusinessField } from "@/contexts/BusinessFieldContext";
import {
  getAuthenticatedCrmRecords,
  insertCrmRecord,
  type CrmRecord,
} from "@/lib/crmData";

type CRMStatus = "New" | "Contacted" | "Converted";
type CustomerRecord = CrmRecord;

export default function CRM() {
  const { field } = useBusinessField();
  const [records, setRecords] = useState<CustomerRecord[]>([]);
  const [dataSource, setDataSource] = useState<"empty" | "supabase">("empty");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"customers" | "leads" | "tickets">(
    "customers"
  );
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    kind: "Lead" as CustomerRecord["kind"],
    name: "",
    email: "",
    phone: "",
    company: "",
    status: "New" as CRMStatus,
    value: "",
    source: "Website inquiry",
    owner: "SS Global Team",
  });
  useEffect(() => {
    let active = true;
    setLoading(true);
    getAuthenticatedCrmRecords()
      .then(({ authenticated, records: remoteRecords }) => {
        if (!active) return;
        if (authenticated) {
          setRecords(remoteRecords);
          setDataSource("supabase");
        } else {
          setRecords([]);
          setDataSource("empty");
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setRecords([]);
          setDataSource("empty");
          setLoading(false);
          toast.error(
            "Supabase CRM could not be loaded. Sign in and check the database configuration."
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const scopedRecords = useMemo(
    () =>
      records.filter(
        record =>
          field.id === "all" ||
          record.company
            .toLowerCase()
            .includes(field.label.toLowerCase().split(" ")[0])
      ),
    [records, field.id, field.label]
  );
  const filteredRecords = useMemo(
    () =>
      scopedRecords.filter(
        record =>
          [record.name, record.email, record.phone, record.company]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (tab === "customers"
            ? record.kind === "Customer"
            : tab === "leads"
              ? record.kind === "Lead"
              : true)
      ),
    [scopedRecords, search, tab]
  );
  const totals = useMemo(
    () => ({
      customers: scopedRecords.filter(record => record.kind === "Customer")
        .length,
      leads: scopedRecords.filter(record => record.kind === "Lead").length,
      converted: scopedRecords.filter(record => record.status === "Converted")
        .length,
      pipeline: scopedRecords.reduce((sum, record) => sum + record.value, 0),
      openTickets: 0,
    }),
    [scopedRecords]
  );
  const saveRecord = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone number are required");
      return;
    }
    const next: Omit<CustomerRecord, "id"> = {
      name: form.name.trim(),
      email: form.email.trim() || "Not provided",
      phone: form.phone.trim(),
      company: form.company.trim() || "Independent customer",
      status: form.status,
      kind: form.kind,
      value: Number(form.value) || 0,
      source: form.source,
      owner: form.owner,
    };
    try {
      const saved = await insertCrmRecord(next);
      setRecords(current => [saved, ...current]);
      setDataSource("supabase");
      toast.success(`${saved.kind} saved to Supabase`);
    } catch {
      toast.error(
        "Could not save this record to Supabase. Nothing was saved locally."
      );
      return;
    }
    setShowForm(false);
    setTab(form.kind === "Customer" ? "customers" : "leads");
    setForm({
      kind: "Lead",
      name: "",
      email: "",
      phone: "",
      company: "",
      status: "New",
      value: "",
      source: "Website inquiry",
      owner: "SS Global Team",
    });
  };
  const advanceLead = (id: string) =>
    setRecords(current =>
      current.map(record =>
        record.id === id
          ? {
              ...record,
              status: record.status === "New" ? "Contacted" : "Converted",
              kind: record.status === "Contacted" ? "Customer" : record.kind,
            }
          : record
      )
    );
  const scopeText = field.id === "all" ? "All Workspaces" : field.label;

  return (
    <div className="relative px-5 pb-12 pt-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow">Customer relationships / {scopeText}</p>
            <h2 className="mt-3 font-display text-[34px] font-extrabold tracking-[-0.06em] sm:text-[44px]">
              CRM & Leads
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#627A88]">
              Keep customer details, new opportunities, and next actions in one
              clear workspace.
            </p>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#8CA0AB]">
              {loading
                ? "Connecting to Supabase…"
                : dataSource === "supabase"
                  ? "Synced with Supabase"
                  : "No Supabase data available"}
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0066CC] px-4 py-3 text-xs font-extrabold text-white shadow-[0_10px_20px_rgba(0,102,204,.18)] transition hover:-translate-y-0.5 hover:bg-[#0052A5]"
          >
            <Plus size={16} /> Add New Customer/Lead
          </button>
        </div>
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Summary
            label="Customers"
            value={String(totals.customers)}
            icon={UserRound}
          />
          <Summary
            label="Active leads"
            value={String(totals.leads)}
            icon={UserPlus}
          />
          <Summary
            label="Converted"
            value={String(totals.converted)}
            icon={CheckCircle2}
          />
          <Summary
            label="Open service tickets"
            value={String(totals.openTickets)}
            icon={Headphones}
          />
        </div>
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#D9E2E7] bg-white p-3 shadow-[0_8px_24px_rgba(16,38,61,.04)] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1">
            <TabButton
              active={tab === "customers"}
              onClick={() => setTab("customers")}
            >
              Customers
            </TabButton>
            <TabButton active={tab === "leads"} onClick={() => setTab("leads")}>
              Leads
            </TabButton>
            <TabButton
              active={tab === "tickets"}
              onClick={() => setTab("tickets")}
            >
              Service Tickets
            </TabButton>
          </div>
          {tab !== "tickets" && (
            <label className="flex min-w-[250px] items-center gap-2 rounded-xl border border-[#D9E2E7] px-3 py-2 text-xs text-[#627A88]">
              <Search size={15} />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search name, phone, company"
                className="w-full bg-transparent outline-none placeholder:text-[#9AAEB8]"
              />
            </label>
          )}
        </div>
        {tab === "tickets" ? (
          <section className="atlas-panel p-10 text-center">
            <Wrench className="mx-auto text-[#78909D]" size={24} />
            <p className="mt-3 text-sm font-extrabold text-[#19364D]">
              Service tickets are not connected yet
            </p>
            <p className="mt-1 text-xs font-semibold text-[#78909D]">
              No sample tickets are shown. Add a Supabase service_tickets table
              to enable this queue.
            </p>
          </section>
        ) : (
          <section className="atlas-panel overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E9ED] px-5 py-4">
              <div>
                <p className="eyebrow">
                  {tab === "customers"
                    ? "Customer register"
                    : "Opportunity pipeline"}
                </p>
                <h3 className="mt-1 font-display text-xl font-extrabold text-[#19364D]">
                  {tab === "customers" ? "Customers" : "Leads"}{" "}
                  <span className="text-sm font-semibold text-[#8CA0AB]">
                    · {filteredRecords.length}
                  </span>
                </h3>
              </div>
              <CircleDot size={19} className="text-[#0066CC]" />
            </div>
            <div className="divide-y divide-[#E2E9ED]">
              {filteredRecords.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm font-semibold text-[#78909D]">
                  No records match this view.
                </div>
              ) : (
                filteredRecords.map(record => (
                  <article
                    key={record.id}
                    className="flex flex-col gap-3 px-5 py-4 transition hover:bg-[#F7FAFB] lg:flex-row lg:items-center"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EAF3F8] text-[#0066CC]">
                      <UserRound size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-extrabold text-[#19364D]">
                          {record.name}
                        </p>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${record.status === "Converted" ? "bg-[#EDF6EF] text-[#4D775D]" : record.status === "Contacted" ? "bg-[#FFF6E2] text-[#9A6A13]" : "bg-[#EAF3F8] text-[#34647F]"}`}
                        >
                          {record.status}
                        </span>
                        <span className="rounded-full bg-[#F1F5F7] px-2 py-1 text-[10px] font-bold text-[#627A88]">
                          {record.kind}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-[#627A88]">
                        {record.company} · {record.source}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold text-[#78909D]">
                        <span className="inline-flex items-center gap-1">
                          <Mail size={12} />
                          {record.email}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Phone size={12} />
                          {record.phone}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 lg:justify-end">
                      <div className="text-left lg:text-right">
                        <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#8CA0AB]">
                          Opportunity
                        </p>
                        <p className="text-sm font-extrabold text-[#19364D]">
                          {moneyLkr(record.value)}
                        </p>
                      </div>
                      {record.kind === "Lead" && (
                        <button
                          onClick={() => advanceLead(record.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#D9E2E7] px-3 py-2 text-[10px] font-extrabold text-[#34647F] transition hover:border-[#0066CC] hover:text-[#0066CC]"
                        >
                          Advance <Send size={12} />
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        )}
        {showForm && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-[#10263D]/55 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="eyebrow">CRM master record</p>
                  <h3 className="mt-2 font-display text-2xl font-extrabold text-[#19364D]">
                    Add New Customer/Lead
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[#78909D]">
                    Capture contact details and the next relationship status.
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  aria-label="Close form"
                  className="rounded-lg p-2 text-[#627A88] hover:bg-[#F1F5F7]"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Record type">
                  <select
                    value={form.kind}
                    onChange={event =>
                      setForm({
                        ...form,
                        kind: event.target.value as CustomerRecord["kind"],
                      })
                    }
                    className="input"
                  >
                    <option>Lead</option>
                    <option>Customer</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={event =>
                      setForm({
                        ...form,
                        status: event.target.value as CRMStatus,
                      })
                    }
                    className="input"
                  >
                    <option>New</option>
                    <option>Contacted</option>
                    <option>Converted</option>
                  </select>
                </Field>
                <Field label="Name">
                  <input
                    value={form.name}
                    onChange={event =>
                      setForm({ ...form, name: event.target.value })
                    }
                    className="input"
                    placeholder="Customer or contact name"
                  />
                </Field>
                <Field label="Company">
                  <input
                    value={form.company}
                    onChange={event =>
                      setForm({ ...form, company: event.target.value })
                    }
                    className="input"
                    placeholder="Company name"
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={event =>
                      setForm({ ...form, email: event.target.value })
                    }
                    className="input"
                    placeholder="name@company.com"
                  />
                </Field>
                <Field label="Phone">
                  <input
                    value={form.phone}
                    onChange={event =>
                      setForm({ ...form, phone: event.target.value })
                    }
                    className="input"
                    placeholder="077 0000000"
                  />
                </Field>
                <Field label="Opportunity value (LKR)">
                  <input
                    type="number"
                    min="0"
                    value={form.value}
                    onChange={event =>
                      setForm({ ...form, value: event.target.value })
                    }
                    className="input"
                    placeholder="0"
                  />
                </Field>
                <Field label="Lead source">
                  <input
                    value={form.source}
                    onChange={event =>
                      setForm({ ...form, source: event.target.value })
                    }
                    className="input"
                    placeholder="Website, referral, call"
                  />
                </Field>
              </div>
              <div className="mt-6 flex justify-end gap-2 border-t border-[#E2E9ED] pt-4">
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-[#D9E2E7] px-4 py-2.5 text-xs font-extrabold text-[#627A88]"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRecord}
                  className="rounded-lg bg-[#0066CC] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#0052A5]"
                >
                  Save Record
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function Summary({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Headphones;
}) {
  return (
    <div className="rounded-2xl border border-[#D9E2E7] bg-white px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#8CA0AB]">
        <Icon size={13} />
        {label}
      </div>
      <p className="mt-1 text-xl font-extrabold text-[#19364D]">{value}</p>
    </div>
  );
}
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-xs font-extrabold transition ${active ? "bg-[#10263D] text-white" : "text-[#627A88] hover:bg-[#F1F5F7]"}`}
    >
      {children}
    </button>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[.12em] text-[#627A88]">
        {label}
      </span>
      {children}
    </label>
  );
}
