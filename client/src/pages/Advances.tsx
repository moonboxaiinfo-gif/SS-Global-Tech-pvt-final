import { useEffect, useMemo, useState } from "react";
import { Check, Plus, UserRound, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { insertErpRow, listErpRows } from "@/lib/erpData";
import { currency } from "@/lib/accountingData";

type Advance = {
  id: string;
  employee_id?: string;
  employee_name: string;
  payout_type: string;
  project: string;
  amount: number;
  payout_date: string;
  status: string;
};
export default function Advances() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<Advance[]>([]);
  const [type, setType] = useState("Project Advance / Allowance");
  const [employeeId, setEmployeeId] = useState("");
  const [project, setProject] = useState("");
  const [amount, setAmount] = useState("");
  useEffect(() => {
    void Promise.all([
      listErpRows<any>("employees", "id,full_name"),
      listErpRows<Advance>(
        "employee_advances",
        "id,employee_id,employee_name,payout_type,project,amount,payout_date,status"
      ),
    ])
      .then(([employeeRows, advanceRows]) => {
        setEmployees(employeeRows);
        setPayouts(
          advanceRows.map(row => ({ ...row, amount: Number(row.amount) || 0 }))
        );
        setEmployeeId(employeeRows[0]?.id ?? "");
      })
      .catch(cause =>
        toast.error(
          cause instanceof Error
            ? cause.message
            : "Advances could not be loaded from Supabase."
        )
      );
  }, []);
  const addPayout = async () => {
    const employee = employees.find(row => row.id === employeeId);
    const value = Number(amount);
    if (!employee || !value || value <= 0 || !project.trim())
      return toast.error("Select an employee and enter project and amount.");
    try {
      const row = await insertErpRow<Advance>(
        "employee_advances",
        {
          employee_id: employee.id,
          employee_name: employee.full_name,
          payout_type: type,
          project: project.trim(),
          amount: value,
          status:
            type === "Project Advance / Allowance"
              ? "Deduct from salary"
              : "Paid",
        },
        "id,employee_id,employee_name,payout_type,project,amount,payout_date,status"
      );
      setPayouts(items => [
        { ...row, amount: Number(row.amount) || 0 },
        ...items,
      ]);
      setAmount("");
      setProject("");
      toast.success("Employee advance saved to Supabase.");
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Advance could not be saved to Supabase."
      );
    }
  };
  const outstanding = useMemo(
    () =>
      payouts
        .filter(item => item.status === "Deduct from salary")
        .reduce((sum, item) => sum + item.amount, 0),
    [payouts]
  );
  return (
    <div className="relative overflow-hidden px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8">
          <p className="eyebrow text-[#0052A5]">
            People & payouts / Supabase ledger
          </p>
          <h2 className="mt-4 font-display text-[36px] font-extrabold tracking-[-.06em] text-[#0F172A] sm:text-[46px]">
            Employee advances
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#627A88]">
            Issue allowances and task wages using live employee records. Every
            payout is saved in Supabase.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
          <section className="atlas-panel p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EAF3F8] text-[#0052A5]">
                <WalletCards size={18} />
              </span>
              <div>
                <p className="eyebrow">New payout</p>
                <h3 className="mt-1 font-display text-xl font-extrabold text-[#0F172A]">
                  Record a payment
                </h3>
              </div>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="field-label">Payout type</span>
                <select
                  value={type}
                  onChange={event => setType(event.target.value)}
                  className="field"
                >
                  <option>Project Advance / Allowance</option>
                  <option>Daily / Task Wage</option>
                  <option>Final Monthly Salary Settlement</option>
                </select>
              </label>
              <label className="block">
                <span className="field-label">Employee</span>
                <select
                  value={employeeId}
                  onChange={event => setEmployeeId(event.target.value)}
                  className="field"
                >
                  <option value="">Select employee</option>
                  {employees.map(row => (
                    <option key={row.id} value={row.id}>
                      {row.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="field-label">Project / settlement</span>
                <input
                  value={project}
                  onChange={event => setProject(event.target.value)}
                  className="field"
                />
              </label>
              <label className="block">
                <span className="field-label">Amount (LKR)</span>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={event => setAmount(event.target.value)}
                  className="field"
                />
              </label>
              <button
                type="button"
                onClick={() => void addPayout()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0066CC] px-4 py-3 text-xs font-extrabold text-white"
              >
                <Plus size={15} /> Save payout to Supabase
              </button>
            </div>
          </section>
          <section className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <Summary
                label="Outstanding advances"
                value={currency(outstanding)}
              />
              <Summary
                label="Employees with payouts"
                value={String(
                  new Set(payouts.map(item => item.employee_id)).size
                )}
              />
              <Summary
                label="Payouts this period"
                value={currency(
                  payouts.reduce((sum, item) => sum + item.amount, 0)
                )}
              />
            </div>
            <div className="atlas-panel overflow-hidden">
              <div className="border-b border-[#E5E7EB] px-5 py-4">
                <p className="eyebrow">Supabase payout register</p>
                <h3 className="mt-1 font-display text-xl font-extrabold text-[#0F172A]">
                  Recent payments
                </h3>
              </div>
              <div className="divide-y divide-[#E5E7EB]">
                {payouts.slice(0, 20).map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-5 py-4"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#EDF6EF] text-[#4D775D]">
                      <Check size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold text-[#0F172A]">
                        {item.employee_name}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-[#6B7280]">
                        {item.payout_type} · {item.project} · {item.payout_date}
                      </p>
                    </div>
                    <span className="font-display text-sm font-extrabold text-[#0F172A]">
                      {currency(item.amount)}
                    </span>
                  </div>
                ))}
                {!payouts.length && (
                  <p className="px-5 py-10 text-center text-sm font-semibold text-[#78909D]">
                    No advance records in Supabase.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="atlas-panel p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#6B7280]">
        {label}
      </p>
      <p className="mt-2 font-display text-lg font-extrabold text-[#0F172A]">
        {value}
      </p>
    </div>
  );
}
