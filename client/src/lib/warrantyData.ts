import { insertErpRow } from "@/lib/erpData";
import { loadLocalValue, saveLocalValue } from "@/lib/localStore";

export type WarrantyRecord = {
 id: string;
 projectId?: string;
 invoiceId?: string;
 workspace: "solar";
 projectSource: "SS Global Direct";
 customerName: string;
 customerPhone: string;
 itemName: string;
 supplierName: string;
 serialNumber: string;
 supplierWarrantyExpiry: string;
 customerWarrantyExpiry: string;
 createdAt: string;
};

export type WarrantyStatus = "Active" | "Expired";
export const WARRANTY_STORAGE_KEY = "ss-global-item-warranties";

export function warrantyStatus(expiry: string, today = new Date()): WarrantyStatus {
 const expiryDate = new Date(`${expiry}T23:59:59`);
 return Number.isNaN(expiryDate.getTime()) || expiryDate < today ? "Expired" : "Active";
}

export function warrantyMatches(record: WarrantyRecord, query: string) {
 const needle = query.trim().toLowerCase();
 if (!needle) return true;
 return [record.serialNumber, record.customerName, record.customerPhone, record.supplierName, record.itemName]
  .some((value) => value.toLowerCase().includes(needle));
}

export function listLocalWarranties() {
 return loadLocalValue<WarrantyRecord[]>(WARRANTY_STORAGE_KEY, []);
}

export function saveLocalWarranties(records: WarrantyRecord[]) {
 saveLocalValue(WARRANTY_STORAGE_KEY, records);
}

export async function persistWarrantyRecords(records: WarrantyRecord[]) {
 if (!records.length) return;
 const existing = listLocalWarranties();
 const next = [...existing, ...records];
 saveLocalWarranties(next);
 await Promise.all(records.map(async (record) => {
  try {
   await insertErpRow("item_warranties", {
    id: record.id,
    project_id: record.projectId ?? null,
    invoice_id: record.invoiceId ?? null,
    workspace: record.workspace,
    project_source: record.projectSource,
    customer_name: record.customerName,
    customer_phone: record.customerPhone,
    item_name: record.itemName,
    supplier_name: record.supplierName,
    serial_number: record.serialNumber,
    supplier_warranty_expiry: record.supplierWarrantyExpiry,
    customer_warranty_expiry: record.customerWarrantyExpiry,
    created_at: record.createdAt,
   }, "id");
  } catch {
   // Local-first persistence remains authoritative when Supabase is unavailable.
  }
 }));
}

export function warrantyFromProjectDraft(input: Omit<WarrantyRecord, "id" | "createdAt" | "workspace" | "projectSource"> & { id?: string }): WarrantyRecord {
 return {
  ...input,
  id: input.id ?? `warranty-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  workspace: "solar",
  projectSource: "SS Global Direct",
  createdAt: new Date().toISOString(),
 };
}
export function warrantyIsDirectSolar(source: string | undefined, workspace: string | undefined) {
 return workspace === "solar" && source === "SS Global Direct";
}
export function warrantyStatusPair(record: WarrantyRecord) {
 return { supplier: warrantyStatus(record.supplierWarrantyExpiry), customer: warrantyStatus(record.customerWarrantyExpiry) };
}
