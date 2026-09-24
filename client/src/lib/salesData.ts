import { mockCompanies } from "@/lib/hrData";

export type SaleItem = { id: string; product: string; category: string; amount: number; quantity?: number; serial: string; warrantyYears: number | string; supplierName?: string; buyingCost?: number; inventoryId?: string; workspace?: "solar" | "steel" | "furniture" | "irrigation" };
export type SaleInternalDetails = { supplierName?: string; buyingPrice?: number; profitMargin?: number; supplierWarranty?: string; orderSource?: string };
export type Sale = { id: string; invoiceNo: string; companyId: string; customer: string; customerPhone?: string; date: string; items: SaleItem[]; total: number; discount?: number; internalDetails?: SaleInternalDetails };
export type Warranty = { id: string; saleId: string; companyId: string; customer: string; product: string; serial: string; startDate: string; expiryDate: string; warrantyYears: number | string; status?: "active" | "expiring" | "expired" };

export const productOptions = ["Solar Panels", "Inverters", "Batteries", "Mounting Structure"];
export const warrantyOptions = [5, 10, 25];
export const initialSales: Sale[] = [];

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);
const addYears = (start: string, years: number) => { const date = new Date(`${start}T00:00:00`); date.setFullYear(date.getFullYear() + years); return dateOnly(date); };
export const buildWarranties = (sales: Sale[]): Warranty[] => sales.flatMap((sale) => sale.items.map((item) => ({ id: `${sale.id}-${item.id}`, saleId: sale.id, companyId: sale.companyId, customer: sale.customer, product: item.product, serial: item.serial, startDate: sale.date, expiryDate: addYears(sale.date, Number(item.warrantyYears) || 0), warrantyYears: item.warrantyYears })));
export const companyName = (id: string) => mockCompanies.find((company) => company.id === id)?.name ?? "Unknown company";
export const money = (value: number) => `Rs. ${value.toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
