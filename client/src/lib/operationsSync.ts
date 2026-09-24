import { insertErpRow } from "@/lib/erpData";

export type PayrollBatchEntry = {
 id: string;
 employeeId?: string;
 employeeName: string;
 bankName: string;
 branchCode?: string;
 accountNumber: string;
 accountName?: string;
 grossAmount: number;
 advanceDeduction: number;
 netPayable: number;
 paymentReference: string;
};

export type PayrollBatchRecord = {
 id: string;
 date: string;
 workerCount: number;
 total: number;
 status: "Queued" | "Paid";
 bank: string;
 workers: PayrollBatchEntry[];
};

const PAYROLL_BATCH_KEY = "ss-global-payroll-batches";

function readLocal(): PayrollBatchRecord[] {
 if (typeof window === "undefined") return [];
 try {
 const value = window.localStorage.getItem(PAYROLL_BATCH_KEY);
 return value ? (JSON.parse(value) as PayrollBatchRecord[]) : [];
 } catch {
 return [];
 }
}

function writeLocal(value: PayrollBatchRecord[]) {
 if (typeof window !== "undefined") window.localStorage.setItem(PAYROLL_BATCH_KEY, JSON.stringify(value));
}

export function loadLocalPayrollBatches() {
 return readLocal();
}

export async function queuePayrollBatch(batch: PayrollBatchRecord) {
 const next = [batch, ...readLocal().filter((item) => item.id !== batch.id)];
 writeLocal(next);
 window.dispatchEvent(new CustomEvent("ss-global-payroll-batch-queued", { detail: batch }));
 try {
 const persisted = await insertErpRow<{ id: string }>("payroll_batches", {
 batch_code: batch.id,
 batch_date: batch.date,
 bank_name: batch.bank,
 status: "Queued",
 worker_count: batch.workerCount,
 total_amount: batch.total,
 }, "id");
 await Promise.all(batch.workers.map((worker) => insertErpRow<{ id: string }>("payroll_batch_entries", {
 batch_id: persisted.id,
 employee_id: worker.employeeId ?? null,
 employee_name: worker.employeeName,
 bank_name: worker.bankName,
 branch_code: worker.branchCode ?? null,
 account_number: worker.accountNumber,
 account_name: worker.accountName ?? null,
 gross_amount: worker.grossAmount,
 advance_deduction: worker.advanceDeduction,
 net_payable: worker.netPayable,
 payment_reference: worker.paymentReference,
 }, "id")));
 return { source: "supabase" as const, batch };
 } catch {
 return { source: "local" as const, batch };
 }
}

export async function markPayrollBatchPaid(batch: PayrollBatchRecord) {
 const next = readLocal().map((item) => item.id === batch.id ? { ...item, status: "Paid" as const } : item);
 writeLocal(next);
 window.dispatchEvent(new CustomEvent("ss-global-payroll-batch-paid", { detail: { ...batch, status: "Paid" } }));
 return next;
}
