import { mockCompanies } from "@/lib/hrData";
import type { BusinessFieldId } from "@/contexts/BusinessFieldContext";

export type ProjectStatus = "Planning" | "In Progress" | "Completed" | "On Hold";
export type ExpenseCategory = "Materials" | "Transport" | "Labour" | "Equipment" | "Subcontractor";
export type SettlementStatus = "Advance Paid" | "Partially Settled" | "Fully Settled";
export type ProjectPayment = { id: string; projectId: string; amount: number; date: string; method: string; note: string };
export type Project = {
 id: string;
 name: string;
 companyId: string;
 customer: string;
 customerPhone?: string;
 description?: string;
 location?: string;
 status: ProjectStatus;
 budget: number;
 contractValue: number;
 advanceReceived: number;
 balancePayments: ProjectPayment[];
 startDate: string;
 targetDate: string;
 progress: number;
 businessField?: Exclude<BusinessFieldId, "all">;
 partner?: "Hayleys" | "Deep Tech" | "SS Global Direct";
};
export type ProjectExpense = { id: string; projectId: string; category: ExpenseCategory; description: string; amount: number; date: string; vendor: string; employeeId?: string };

export const projectStatuses: ProjectStatus[] = ["Planning", "In Progress", "Completed", "On Hold"];
export const expenseCategories: ExpenseCategory[] = ["Materials", "Transport", "Labour", "Equipment", "Subcontractor"];
export const settlementStatus = (project: Project) => {
 const received = project.advanceReceived + project.balancePayments.reduce((sum, payment) => sum + payment.amount, 0);
 if (received >= project.contractValue) return "Fully Settled" as const;
 if (received > project.advanceReceived) return "Partially Settled" as const;
 return "Advance Paid" as const;
};
export const amountReceived = (project: Project) => project.advanceReceived + project.balancePayments.reduce((sum, payment) => sum + payment.amount, 0);
export const balanceDue = (project: Project) => Math.max(0, project.contractValue - amountReceived(project));

export const initialProjects: Project[] = [];
export const initialProjectExpenses: ProjectExpense[] = [];
export const companyName = (id: string) => mockCompanies.find((company) => company.id === id)?.name ?? "Unknown business type";
export const money = (value: number) => `Rs. ${value.toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
export const projectSpend = (projectId: string, expenses: ProjectExpense[]) => expenses.filter((expense) => expense.projectId === projectId).reduce((sum, expense) => sum + expense.amount, 0);
