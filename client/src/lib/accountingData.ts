import { money } from "@/lib/projectData";

export type ClientType =
  | "Direct Customer (B2C)"
  | "Main Contractor / Partner Company (B2B Sub-Contract)";
export type PayoutType =
  | "Project Advance / Allowance"
  | "Daily / Task Wage"
  | "Final Monthly Salary Settlement";
export type ClaimStatus = "Draft" | "Submitted" | "Partially Paid" | "Paid";

export const accountingCompanies = [];

export const cashPosition = {
  bank: 0,
  pettyCash: 0,
  receivables: 0,
  subContractClaims: 0,
  monthlyNetProfit: 0,
};
export const monthlyTrend: Array<{
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}> = [];
export const projectProfitability: Array<{ name: string; margin: number }> = [];
export const receivableItems: Array<{
  id: string;
  customer: string;
  company: string;
  due: string;
  amount: number;
}> = [];
export type ContractScope = "Material Only" | "Material + Labor";
export type SubcontractWorkOrder = {
  id: string;
  partner: "Hayleys" | "Deep Tech";
  poNumber: string;
  project: string;
  location: string;
  scope: ContractScope;
  agreedAmount: number;
  advancePaid: number;
  retentionPercent: number;
  retentionAmount: number;
  materialCost: number;
  laborCost: number;
  claimed: number;
  paid: number;
  claims: {
    label: string;
    percent: number;
    amount: number;
    status: ClaimStatus;
  }[];
};
export const subcontractWorkOrders: SubcontractWorkOrder[] = [];
export type PayoutRecord = {
  id: string;
  employeeId: string;
  type: PayoutType;
  amount: number;
  project: string;
  fieldId: string;
};
export const initialPayouts: PayoutRecord[] = [];
export const employeeAdvanceBalances: Array<{
  employeeId: string;
  amount: number;
}> = [];
export const equityLedger: Array<{
  id: string;
  date: string;
  type: string;
  company: string;
  amount: number;
  note: string;
}> = [];
export const bankStatementRows: Array<{
  date: string;
  reference: string;
  description: string;
  amount: number;
}> = [];
export const currency = (value: number) => money(value);

export const emptyFieldMetrics = {
  revenue: 0,
  profit: 0,
  projects: 0,
  cash: 0,
  employees: 0,
  pendingPayroll: 0,
  expenses: 0,
};
export const fieldMetrics: Record<string, typeof emptyFieldMetrics> = {
  solar: { ...emptyFieldMetrics },
  steel: { ...emptyFieldMetrics },
  furniture: { ...emptyFieldMetrics },
  irrigation: { ...emptyFieldMetrics },
};
export const businessFieldChart = Object.entries(fieldMetrics).map(
  ([id, metrics]) => ({ id, ...metrics })
);
