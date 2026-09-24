export type StockField = "solar" | "steel" | "furniture" | "irrigation";
export type StockItem = {
  id: string;
  name: string;
  category: string;
  businessField: StockField;
  company: string;
  warehouse: string;
  quantity: number;
  safety: number;
  unit: string;
  serials: string[];
  value: number;
  unitCostPrice?: number;
  initialQuantity?: number;
  lowStockAlertLevel?: number;
};
export const workspaceStockFields: StockField[] = [
  "solar",
  "irrigation",
  "steel",
  "furniture",
];
export const itemsForWorkspace = (
  items: StockItem[],
  workspace: StockField | "all"
) =>
  workspace === "all"
    ? items
    : items.filter(item => item.businessField === workspace);
export const normalizeStockItems = (
  items: StockItem[],
  fallback: StockItem[] = []
) =>
  (Array.isArray(items) ? items : fallback).map(item => ({
    ...item,
    businessField: workspaceStockFields.includes(item.businessField)
      ? item.businessField
      : ("solar" as StockField),
  }));
export type StockMovement = {
  id: string;
  stockId: string;
  direction: "Stock In" | "Stock Out";
  quantity: number;
  projectId?: string;
  project?: string;
  date: string;
  note: string;
};
export type Lead = {
  id: string;
  customer: string;
  company: string;
  source: string;
  value: number;
  stage: "New" | "Qualified" | "Proposal" | "Won";
  owner: string;
};
export type Ticket = {
  id: string;
  customer: string;
  site: string;
  issue: string;
  technician: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Resolved";
  created: string;
};
export type Role = {
  name: string;
  description: string;
  color: string;
  permissions: Record<string, boolean>;
};
export const operationsCompanies = [
  "All companies",
  "SunPeak Energy",
  "Northline Electrical",
  "Cedar Works",
  "Aster Fabrication",
  "BlueCurrent Services",
];
export const warehouses = [
  "All warehouses",
  "Colombo Central",
  "Kandy Depot",
  "Galle Yard",
];
export const stockItems: StockItem[] = [];
export const stockMovements: StockMovement[] = [];
export const leads: Lead[] = [];
export const tickets: Ticket[] = [];
export const roles: Role[] = [];
export type AuditEvent = {
  id: string;
  role: string;
  action: string;
  detail: string;
  user: string;
  time: string;
  tone: "coral" | "amber" | "green" | "blue";
};
export const auditEvents: AuditEvent[] = [];
export const moneyLkr = (value: number) =>
  `Rs. ${value.toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
