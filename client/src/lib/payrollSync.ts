import { initialProjectExpenses } from "@/lib/projectData";

export type LaborAllocation = {
  id: string;
  projectId: string;
  employeeId: string;
  amount: number;
  date: string;
  note: string;
};

export type SalaryAdvance = {
  id: string;
  employeeId: string;
  amount: number;
  note: string;
  date: string;
};

const LABOR_KEY = "ss-global-project-labor-ledger";
const ADVANCE_KEY = "ss-global-salary-advance-ledger";

export const initialLaborAllocations: LaborAllocation[] = initialProjectExpenses
  .filter(expense => expense.category === "Labour" && expense.employeeId)
  .map(expense => ({
    id: `labor-${expense.id}`,
    projectId: expense.projectId,
    employeeId: expense.employeeId as string,
    amount: expense.amount,
    date: expense.date,
    note: expense.description,
  }));

export const initialSalaryAdvances: SalaryAdvance[] = [];

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window !== "undefined")
    window.localStorage.setItem(key, JSON.stringify(value));
}

export const loadLaborAllocations = () =>
  read(LABOR_KEY, initialLaborAllocations);
export const loadSalaryAdvances = () =>
  read(ADVANCE_KEY, initialSalaryAdvances);
export const saveLaborAllocation = (allocation: LaborAllocation) => {
  const next = [...loadLaborAllocations(), allocation];
  write(LABOR_KEY, next);
  window.dispatchEvent(new CustomEvent("ss-global-payroll-sync"));
  return next;
};
export const saveSalaryAdvance = (advance: SalaryAdvance) => {
  const next = [...loadSalaryAdvances(), advance];
  write(ADVANCE_KEY, next);
  window.dispatchEvent(new CustomEvent("ss-global-payroll-sync"));
  return next;
};

export const laborForEmployee = (
  allocations: LaborAllocation[],
  employeeId: string,
  from?: string,
  to?: string
) =>
  allocations.filter(
    item =>
      item.employeeId === employeeId &&
      (!from || item.date >= from) &&
      (!to || item.date <= to)
  );
export const advancesForEmployee = (
  advances: SalaryAdvance[],
  employeeId: string,
  from?: string,
  to?: string
) =>
  advances.filter(
    item =>
      item.employeeId === employeeId &&
      (!from || item.date >= from) &&
      (!to || item.date <= to)
  );
