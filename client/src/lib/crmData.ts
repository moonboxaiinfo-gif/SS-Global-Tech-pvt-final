import supabase from "@/lib/supabase";

export type CrmStatus = "New" | "Contacted" | "Converted";
export type CrmKind = "Customer" | "Lead";
export type CrmRecord = { id: string; name: string; email: string; phone: string; company: string; status: CrmStatus; kind: CrmKind; value: number; source: string; owner: string };

type CustomerRow = { id: string; name: string; email: string | null; phone: string; company: string | null; status: string; created_at: string };
type LeadRow = { id: string; name: string; source: string | null; status: string; priority: string | null; value: number | string | null; created_at: string };

const normalizeStatus = (status: string): CrmStatus => status === "Converted" ? "Converted" : status === "Contacted" ? "Contacted" : "New";
const client = supabase;

export async function getAuthenticatedCrmRecords() {
 const { data: sessionData, error: sessionError } = await client.auth.getSession();
 if (sessionError) throw sessionError;
 if (!sessionData.session) return { authenticated: false, records: [] as CrmRecord[] };

 const [{ data: customerRows, error: customersError }, { data: leadRows, error: leadsError }] = await Promise.all([
 client.from("customers").select("id,name,email,phone,company,status,created_at").order("created_at", { ascending: false }),
 client.from("leads").select("id,name,source,status,priority,value,created_at").order("created_at", { ascending: false }),
 ]);
 if (customersError) throw customersError;
 if (leadsError) throw leadsError;

 const customers: CrmRecord[] = ((customerRows ?? []) as CustomerRow[]).map((row) => ({ id: row.id, name: row.name, email: row.email || "Not provided", phone: row.phone, company: row.company || "Independent customer", status: normalizeStatus(row.status), kind: "Customer", value: 0, source: "Customer register", owner: "SS Global Team" }));
 const leads: CrmRecord[] = ((leadRows ?? []) as LeadRow[]).map((row) => ({ id: row.id, name: row.name, email: "Not provided", phone: "Not provided", company: "Lead record", status: normalizeStatus(row.status), kind: "Lead", value: Number(row.value) || 0, source: row.source || "Unspecified", owner: row.priority ? `${row.priority} priority` : "SS Global Team" }));
 return { authenticated: true, records: [...customers, ...leads] };
}

export async function insertCrmRecord(record: Omit<CrmRecord, "id">) {
 const { data: sessionData, error: sessionError } = await client.auth.getSession();
 if (sessionError) throw sessionError;
 if (!sessionData.session) throw new Error("Supabase authentication is required to save CRM records.");

 if (record.kind === "Customer") {
 const { data, error } = await client.from("customers").insert({ name: record.name, email: record.email === "Not provided" ? null : record.email, phone: record.phone, company: record.company, status: record.status }).select("id,name,email,phone,company,status,created_at").single();
 if (error) throw error;
 const row = data as CustomerRow;
 return { id: row.id, name: row.name, email: row.email || "Not provided", phone: row.phone, company: row.company || "Independent customer", status: normalizeStatus(row.status), kind: "Customer" as const, value: 0, source: record.source, owner: record.owner };
 }

 const { data, error } = await client.from("leads").insert({ name: record.name, source: record.source, status: record.status, priority: "Medium", value: record.value }).select("id,name,source,status,priority,value,created_at").single();
 if (error) throw error;
 const row = data as LeadRow;
 return { id: row.id, name: row.name, email: "Not provided", phone: "Not provided", company: "Lead record", status: normalizeStatus(row.status), kind: "Lead" as const, value: Number(row.value) || 0, source: row.source || record.source, owner: record.owner };
}
