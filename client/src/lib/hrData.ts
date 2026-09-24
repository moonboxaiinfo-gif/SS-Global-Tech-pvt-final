export type Company = { id: string; name: string; short: string; tone: string };
export type EmployeeStatus = "Active" | "Inactive";
export type Employee = {
 id: string;
 name: string;
 phone: string;
 nic: string;
 basic_salary: number;
 daily_wage: number;
 skills: string[];
 company_id: string;
 status: EmployeeStatus;
 bank_name?: string;
 branch_code?: string;
 account_number?: string;
 account_name?: string;
};
export type PayrollRecord = { id: string; employee_id: string; company_id: string; work_days: number; ot_hours: number; advances: number; basic_salary: number; net_salary: number; processed_at: string };

export const mockCompanies: Company[] = [
 { id: "solar", name: "Solar Energy", short: "SOLAR", tone: "blue" },
 { id: "steel", name: "Steel & Welding Projects", short: "STEEL", tone: "slate" },
 { id: "furniture", name: "Steel Furniture Manufacturing", short: "FURN", tone: "silver" },
 { id: "irrigation", name: "Irrigation Systems", short: "IRRIG", tone: "cyan" },
];

export const initialEmployees: Employee[] = [];

export const initialPayroll: PayrollRecord[] = [];

export const money = (value: number) => `Rs. ${value.toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
export const companyName = (id: string) => mockCompanies.find((company) => company.id === id)?.name ?? "Unassigned";
