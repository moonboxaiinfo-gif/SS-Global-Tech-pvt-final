import { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  CircleDollarSign,
  FolderKanban,
  Plus,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import FieldScopeBanner from "@/components/FieldScopeBanner";
import { useBusinessField } from "@/contexts/BusinessFieldContext";
import { initialEmployees, mockCompanies, money } from "@/lib/hrData";
import {
  advancesForEmployee,
  laborForEmployee,
  loadLaborAllocations,
  loadSalaryAdvances,
  saveSalaryAdvance,
  type SalaryAdvance,
} from "@/lib/payrollSync";
import { queuePayrollBatch } from "@/lib/operationsSync";

export type Advance = SalaryAdvance;
export const salaryAdvances: Advance[] = loadSalaryAdvances();

/** SS Global Salary: daily wages, employee-linked project labor, and advances stay synchronized through the shared local ledger. */
export default function Salary() {
  const { fieldId } = useBusinessField();
  const [employeeId, setEmployeeId] = useState(initialEmployees[0]?.id ?? "");
  const [daysWorked, setDaysWorked] = useState("26");
  const [laborAllocations, setLaborAllocations] =
    useState(loadLaborAllocations);
  const [advances, setAdvances] = useState(loadSalaryAdvances);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceNote, setAdvanceNote] = useState("");
  const employees = useMemo(
    () =>
      initialEmployees.filter(
        employee => fieldId === "all" || employee.company_id === fieldId
      ),
    [fieldId]
  );
  const employee = initialEmployees.find(item => item.id === employeeId) ??
    employees[0] ?? {
      id: "",
      name: "No employees available",
      daily_wage: 0,
      basic_salary: 0,
      phone: "—",
      nic: "—",
      skills: [],
      company_id: "",
      status: "Inactive" as const,
    };
  const employeeLabor = useMemo(
    () => laborForEmployee(laborAllocations, employee.id),
    [laborAllocations, employee.id]
  );
  const employeeAdvances = useMemo(
    () => advancesForEmployee(advances, employee.id),
    [advances, employee.id]
  );
  const dailyGross = Number(daysWorked || 0) * employee.daily_wage;
  const projectLaborTotal = employeeLabor.reduce(
    (sum, labor) => sum + labor.amount,
    0
  );
  const gross = dailyGross + projectLaborTotal;
  const advanceTotal = employeeAdvances.reduce(
    (sum, advance) => sum + advance.amount,
    0
  );
  const net = Math.max(0, gross - advanceTotal);

  useEffect(() => {
    const sync = () => {
      setLaborAllocations(loadLaborAllocations());
      setAdvances(loadSalaryAdvances());
    };
    window.addEventListener("ss-global-payroll-sync", sync);
    return () => window.removeEventListener("ss-global-payroll-sync", sync);
  }, []);

  const queueCurrentPayroll = async () => {
    const batch = {
      id: `PAY-${new Date().toISOString().slice(0, 10)}-${employee.id}`,
      date: new Date().toISOString().slice(0, 10),
      workerCount: 1,
      total: net,
      status: "Queued" as const,
      bank: "Sampath Bank",
      workers: [
        {
          id: `entry-${employee.id}`,
          employeeId: employee.id,
          employeeName: employee.name,
          bankName: employee.bank_name || "Bank pending",
          branchCode: employee.branch_code || "—",
          accountNumber: employee.account_number || "Pending account details",
          accountName: employee.account_name || employee.name,
          grossAmount: gross,
          advanceDeduction: advanceTotal,
          netPayable: net,
          paymentReference: `PAY-${employee.id}-${new Date().toISOString().slice(0, 10)}`,
        },
      ],
    };
    const result = await queuePayrollBatch(batch);
    toast.success(
      result.source === "supabase"
        ? "Payroll batch queued in Supabase and Finance."
        : "Payroll batch queued locally; sign in to sync Finance."
    );
  };

  const addAdvance = () => {
    const amount = Number(advanceAmount);
    if (!amount || amount <= 0)
      return toast.error("Enter a valid advance amount.");
    const advance = {
      id: `adv-${Date.now()}`,
      employeeId: employee.id,
      amount,
      note: advanceNote || "Ad-hoc employee advance",
      date: new Date().toISOString().slice(0, 10),
    };
    setAdvances(saveSalaryAdvance(advance));
    setAdvanceAmount("");
    setAdvanceNote("");
    toast.success(
      "Advance added and deducted from the synchronized salary preview."
    );
  };

  return (
    <div className="relative overflow-hidden px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-8">
          <p className="eyebrow text-[#0052A5]">Employees / salary</p>
          <h2 className="mt-4 font-display text-[36px] font-extrabold tracking-[-.06em] text-[#0F172A] sm:text-[46px]">
            Salary & payroll management
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#627A88] ">
            Daily wages, project labor allocations, and employee advances now
            flow into one real-time salary preview.
          </p>
        </div>
        <FieldScopeBanner />
        <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
          <section className="atlas-panel p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#EAF3F8] text-[#0066CC]">
                <Calculator size={20} />
              </span>
              <div>
                <p className="eyebrow">Synchronized salary calculation</p>
                <h3 className="mt-1 font-display text-xl font-extrabold text-[#0F172A] ">
                  Salary preview
                </h3>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="field-label">Employee</span>
                <select
                  value={employee.id}
                  onChange={event => setEmployeeId(event.target.value)}
                  className="field-input"
                >
                  {employees.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ·{" "}
                      {
                        mockCompanies.find(
                          company => company.id === item.company_id
                        )?.name
                      }
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="field-label">Days worked</span>
                  <input
                    type="number"
                    min="0"
                    value={daysWorked}
                    onChange={event => setDaysWorked(event.target.value)}
                    className="field-input"
                  />
                </label>
                <div className="rounded-xl bg-[#F8FAFC] p-4 ">
                  <span className="field-label">Daily wage rate</span>
                  <p className="mt-2 text-xl font-extrabold text-[#0066CC]">
                    {money(employee.daily_wage)}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Metric label="Total gross salary" value={money(gross)} />
              <Metric
                label="Advances deducted"
                value={money(advanceTotal)}
                tone="rose"
              />
              <Metric label="Net payable" value={money(net)} tone="green" />
            </div>
            <div className="mt-4 rounded-xl border border-[#BFD5E8] bg-[#F4F9FD] p-4 ">
              <div className="flex items-center gap-2">
                <FolderKanban size={15} className="text-[#0066CC]" />
                <p className="text-xs font-extrabold text-[#0052A5]">
                  Gross salary includes {money(projectLaborTotal)} from{" "}
                  {employeeLabor.length} project labor allocation
                  {employeeLabor.length === 1 ? "" : "s"}.
                </p>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-[#627A88]">
                Daily wages {money(dailyGross)} + project labor allocations{" "}
                {money(projectLaborTotal)} − advances {money(advanceTotal)} =
                net payable {money(net)}.
              </p>
            </div>
            <button
              onClick={queueCurrentPayroll}
              className="mt-6 w-full rounded-xl bg-[#0066CC] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#0052A5]"
            >
              Queue payroll batch for Finance
            </button>
          </section>
          <section className="atlas-panel p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#FFF7E6] text-[#B77900]">
                <WalletCards size={20} />
              </span>
              <div>
                <p className="eyebrow">Ledger activity</p>
                <h3 className="mt-1 font-display text-xl font-extrabold text-[#0F172A] ">
                  Project labor & advances
                </h3>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              {employeeLabor.map(labor => (
                <div
                  key={labor.id}
                  className="flex items-center justify-between rounded-xl border border-[#BFD5E8] bg-[#F4F9FD] px-4 py-3 "
                >
                  <div>
                    <p className="text-xs font-extrabold text-[#0F172A] ">
                      {labor.note}
                    </p>
                    <p className="mt-1 text-[10px] text-[#6B7280]">
                      Project {labor.projectId} · {labor.date}
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-[#0066CC]">
                    + {money(labor.amount)}
                  </span>
                </div>
              ))}
              {employeeLabor.length === 0 && (
                <p className="rounded-xl bg-[#F8FAFC] px-4 py-4 text-xs font-semibold text-[#627A88] ">
                  No project labor allocations are linked to this employee yet.
                </p>
              )}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <input
                type="number"
                min="0"
                value={advanceAmount}
                onChange={event => setAdvanceAmount(event.target.value)}
                placeholder="Amount (LKR)"
                className="field-input"
              />
              <input
                value={advanceNote}
                onChange={event => setAdvanceNote(event.target.value)}
                placeholder="Purpose or project note"
                className="field-input"
              />
            </div>
            <button
              onClick={addAdvance}
              className="mt-3 flex items-center gap-2 rounded-xl border border-[#BFD5E8] px-4 py-3 text-xs font-extrabold text-[#0052A5] transition hover:bg-[#EAF3F8]"
            >
              <Plus size={15} /> Add advance
            </button>
            <div className="mt-6 space-y-2">
              {employeeAdvances.map(advance => (
                <div
                  key={advance.id}
                  className="flex items-center justify-between rounded-xl border border-[#E5E7EB] px-4 py-3"
                >
                  <div>
                    <p className="text-xs font-extrabold text-[#0F172A] ">
                      {advance.note}
                    </p>
                    <p className="mt-1 text-[10px] text-[#6B7280]">
                      {advance.date}
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-rose-500">
                    − {money(advance.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
function Metric({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] p-4">
      <p className="field-label">{label}</p>
      <p
        className={`mt-2 text-lg font-extrabold ${tone === "rose" ? "text-rose-500" : tone === "green" ? "text-emerald-600" : "text-[#0066CC]"}`}
      >
        {value}
      </p>
    </div>
  );
}
