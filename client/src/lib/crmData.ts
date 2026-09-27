import supabase from "@/lib/supabase";

export type CrmStatus = "New" | "Contacted" | "Converted";
export type CrmKind = "Customer" | "Lead";
export type CrmRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  workspace: string;
  status: CrmStatus;
  kind: CrmKind;
  value: number;
  source: string;
  owner: string;
  priority?: string;
};

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  workspace: string | null;
  status: string | null;
  source: string | null;
  owner: string | null;
  opportunity_value_lkr: number | string | null;
  created_at: string | null;
};
type LeadRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  workspace: string | null;
  status: string | null;
  source: string | null;
  owner: string | null;
  priority: string | null;
  opportunity_value_lkr: number | string | null;
  created_at: string | null;
};

const normalizeStatus = (status: string | null | undefined): CrmStatus =>
  status === "Converted"
    ? "Converted"
    : status === "Contacted"
      ? "Contacted"
      : "New";

const normalizeWorkspace = (workspace?: string | null) => {
  const value = (workspace ?? "all").trim().toLowerCase();
  return ["all", "solar", "steel", "furniture", "irrigation"].includes(value)
    ? value
    : "all";
};

const normalizeText = (value: string | null | undefined) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : "";

const client = supabase;

export async function getAuthenticatedCrmRecords() {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return { authenticated: false, records: [] as CrmRecord[] };

  const [{ data: customerRows, error: customersError }, { data: leadRows, error: leadsError }] = await Promise.all([
    client
      .from("customers")
      .select(
        "id,name,email,phone,company,workspace,status,source,owner,opportunity_value_lkr,created_at"
      )
      .order("created_at", { ascending: false }),
    client
      .from("leads")
      .select(
        "id,name,email,phone,company,workspace,status,source,owner,priority,opportunity_value_lkr,created_at"
      )
      .order("created_at", { ascending: false }),
  ]);

  if (customersError) throw customersError;
  if (leadsError) throw leadsError;

  const customers: CrmRecord[] = ((customerRows ?? []) as CustomerRow[]).map(row => ({
    id: row.id,
    name: normalizeText(row.name),
    email: normalizeText(row.email),
    phone: normalizeText(row.phone),
    company: normalizeText(row.company),
    workspace: normalizeWorkspace(row.workspace),
    status: normalizeStatus(row.status),
    kind: "Customer",
    value: Number(row.opportunity_value_lkr ?? 0),
    source: normalizeText(row.source) || "Customer register",
    owner: normalizeText(row.owner) || "SS Global Team",
  }));

  const leads: CrmRecord[] = ((leadRows ?? []) as LeadRow[]).map(row => ({
    id: row.id,
    name: normalizeText(row.name),
    email: normalizeText(row.email),
    phone: normalizeText(row.phone),
    company: normalizeText(row.company),
    workspace: normalizeWorkspace(row.workspace),
    status: normalizeStatus(row.status),
    kind: "Lead",
    value: Number(row.opportunity_value_lkr ?? 0),
    source: normalizeText(row.source) || "Website inquiry",
    owner: normalizeText(row.owner) || "SS Global Team",
    priority: normalizeText(row.priority) || "Medium",
  }));

  return { authenticated: true, records: [...customers, ...leads] };
}

export async function insertCrmRecord(record: Omit<CrmRecord, "id">) {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new Error("Supabase authentication is required to save CRM records.");

  const workspace = normalizeWorkspace(record.workspace);
  const payload = {
    name: normalizeText(record.name),
    email: normalizeText(record.email) || null,
    phone: normalizeText(record.phone) || null,
    company: normalizeText(record.company) || null,
    workspace,
    status: record.status,
    source: normalizeText(record.source) || null,
    owner: normalizeText(record.owner) || null,
    opportunity_value_lkr: Number(record.value) || 0,
  };

  if (record.kind === "Customer") {
    const { data, error } = await client
      .from("customers")
      .insert(payload)
      .select("id,name,email,phone,company,workspace,status,source,owner,opportunity_value_lkr,created_at")
      .single();

    if (error) throw error;
    const row = data as CustomerRow;
    return {
      id: row.id,
      name: normalizeText(row.name),
      email: normalizeText(row.email),
      phone: normalizeText(row.phone),
      company: normalizeText(row.company),
      workspace: normalizeWorkspace(row.workspace),
      status: normalizeStatus(row.status),
      kind: "Customer" as const,
      value: Number(row.opportunity_value_lkr ?? 0),
      source: normalizeText(row.source) || "Customer register",
      owner: normalizeText(row.owner) || "SS Global Team",
    };
  }

  const { data, error } = await client
    .from("leads")
    .insert({
      ...payload,
      priority: normalizeText(record.priority) || "Medium",
      value: Number(record.value) || 0,
    })
    .select("id,name,email,phone,company,workspace,status,source,owner,priority,opportunity_value_lkr,created_at")
    .single();

  if (error) throw error;
  const row = data as LeadRow;
  return {
    id: row.id,
    name: normalizeText(row.name),
    email: normalizeText(row.email),
    phone: normalizeText(row.phone),
    company: normalizeText(row.company),
    workspace: normalizeWorkspace(row.workspace),
    status: normalizeStatus(row.status),
    kind: "Lead" as const,
    value: Number(row.opportunity_value_lkr ?? 0),
    source: normalizeText(row.source) || "Website inquiry",
    owner: normalizeText(row.owner) || "SS Global Team",
    priority: normalizeText(row.priority) || "Medium",
  };
}
