import supabase from "@/lib/supabase";

export const currentErpTables = [
  "customers",
  "leads",
  "employees",
  "projects",
  "invoices",
  "expenses",
  "inventory_items",
  "inventory_movements",
  "quotations",
  "quotation_items",
  "subcontracts",
  "subcontract_claims",
  "payroll_batches",
  "payroll_batch_entries",
  "payroll",
  "employee_advances",
  "item_warranties",
  "bank_transactions",
  "project_expenses",
  "finance_accounts",
  "finance_entries",
] as const;
export type CrmEntity = (typeof currentErpTables)[number];
export type ErpRow = Record<string, unknown> & { id: string };

async function requireSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session)
    throw new Error(
      "A signed-in Supabase user is required for ERP database access."
    );
  return data.session;
}

export async function listErpRows<T extends ErpRow>(
  table: CrmEntity,
  columns = "*"
) {
  await requireSession();
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function insertErpRow<T extends ErpRow>(
  table: CrmEntity,
  payload: Record<string, unknown>,
  columns = "*"
) {
  await requireSession();
  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select(columns)
    .single();
  if (error) throw error;
  return data as T;
}

export async function updateErpRow<T extends ErpRow>(
  table: CrmEntity,
  id: string,
  payload: Record<string, unknown>,
  columns = "*"
) {
  await requireSession();
  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq("id", id)
    .select(columns)
    .single();
  if (error) throw error;
  return data as T;
}

export async function deleteErpRow(table: CrmEntity, id: string) {
  await requireSession();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function hasSupabaseSession() {
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}
