import { mockCompanies } from "@/lib/hrData";

export type TransactionType = "Income" | "Expense";
export type TransactionStatus = "Cleared" | "Pending" | "Reconciled";
export type Transaction = {
  id: string;
  companyId: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  date: string;
  paymentMethod: string;
  status: TransactionStatus;
  vendorName?: string;
  bankName?: string;
  branchCode?: string;
  accountNumber?: string;
};
export const transactionCategories = [
  "Sales revenue",
  "Project milestone",
  "Materials",
  "Payroll",
  "Transport",
  "Utilities",
  "Other",
];
export const paymentMethods = ["Bank transfer", "Card", "Cash", "Cheque"];
export const initialTransactions: Transaction[] = [];
export const initialBankBalances: Record<string, number> = {};
export const revenueByCompany: Array<{ company: string; revenue: number }> = [];
export const expensesByCategory: Array<{ category: string; amount: number }> =
  [];
export const projectMargins: Array<{
  name: string;
  value: number;
  margin: number;
}> = [];
export const companyName = (id: string) =>
  mockCompanies.find(company => company.id === id)?.name ?? "All companies";
export const money = (value: number) =>
  `Rs. ${value.toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
