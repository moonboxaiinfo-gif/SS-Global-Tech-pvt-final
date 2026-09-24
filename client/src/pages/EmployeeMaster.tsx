import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Search, UserRound } from "lucide-react";
import { money } from "@/lib/hrData";
import { listErpRows } from "@/lib/erpData";
import { toast } from "sonner";
import FieldScopeBanner from "@/components/FieldScopeBanner";
import { useBusinessField } from "@/contexts/BusinessFieldContext";

type EmployeeRow = {
  id: string;
  name: string;
  phone: string;
  skills: string[];
  company_id: string;
  daily_wage: number;
  basic_salary: number;
};
export default function EmployeeMaster() {
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const { fieldId } = useBusinessField();
  useEffect(() => {
    void listErpRows<any>(
      "employees",
      "id,full_name,phone,job_title,department,basic_salary,daily_wage,skills,status"
    )
      .then(rows =>
        setEmployees(
          rows.map(row => ({
            id: row.id,
            name: row.full_name,
            phone: row.phone || "—",
            skills: row.skills?.length
              ? row.skills
              : [row.job_title || "General operations"],
            company_id: row.department || "Unassigned",
            daily_wage: Number(row.daily_wage) || 0,
            basic_salary: Number(row.basic_salary) || 0,
          }))
        )
      )
      .catch(cause =>
        toast.error(
          cause instanceof Error
            ? cause.message
            : "Employees could not be loaded from Supabase."
        )
      );
  }, []);
  const visible = useMemo(
    () =>
      employees.filter(employee => {
        const haystack =
          `${employee.name} ${employee.skills.join(" ")}`.toLowerCase();
        const fieldMatch =
          fieldId === "all" ||
          employee.skills.some(skill =>
            fieldId === "solar"
              ? /solar|inverter|pump/i.test(skill)
              : fieldId === "steel"
                ? /steel|weld|fabric/i.test(skill)
                : fieldId === "furniture"
                  ? /furniture|assembly/i.test(skill)
                  : /irrigation|pump/i.test(skill)
          );
        return fieldMatch && haystack.includes(search.toLowerCase());
      }),
    [employees, fieldId, search]
  );
  return (
    <div className="relative overflow-hidden px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-8">
          <p className="eyebrow text-[#0052A5]">
            People architecture / Supabase register
          </p>
          <h2 className="mt-4 font-display text-[36px] font-extrabold tracking-[-.06em] text-[#0F172A] sm:text-[46px]">
            Employee master
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#627A88]">
            Live workforce records loaded from the Supabase employees table.
          </p>
        </div>
        <FieldScopeBanner />
        <section className="atlas-panel mt-6 overflow-hidden">
          <div className="flex flex-col justify-between gap-4 border-b border-[#E5E7EB] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <p className="eyebrow">Shared employee pool</p>
              <h3 className="mt-2 font-display text-xl font-extrabold text-[#0F172A]">
                {visible.length} visible employees
              </h3>
            </div>
            <label className="relative w-full sm:w-80">
              <Search
                size={15}
                className="absolute left-3 top-3 text-[#6B7280]"
              />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search name or skill"
                className="h-10 w-full rounded-lg border border-[#D9E2E7] bg-[#F8FAFC] pl-9 pr-3 text-xs font-semibold outline-none focus:border-[#0066CC]"
              />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[#F8FAFC] text-[10px] font-extrabold uppercase tracking-[.14em] text-[#6B7280]">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Skills</th>
                  <th className="px-6 py-3">Daily wage</th>
                  <th className="px-6 py-3 text-right">Monthly base</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {visible.map(employee => (
                  <tr
                    key={employee.id}
                    className="transition hover:bg-[#F8FAFC]"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#EAF3F8] text-[#0052A5]">
                          <UserRound size={16} />
                        </span>
                        <div>
                          <p className="text-sm font-extrabold text-[#0F172A]">
                            {employee.name}
                          </p>
                          <p className="text-[10px] font-semibold text-[#6B7280]">
                            {employee.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-[#6B7280]">
                      {employee.company_id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {employee.skills.map(skill => (
                          <span
                            key={skill}
                            className="rounded-full bg-[#E5E7EB] px-2 py-1 text-[10px] font-extrabold text-[#0052A5]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-extrabold text-[#0052A5]">
                      {money(employee.daily_wage)} / day
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-extrabold text-[#0F172A]">
                      {money(employee.basic_salary)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && (
              <p className="px-5 py-10 text-center text-sm font-semibold text-[#78909D]">
                No employee records found in Supabase.
              </p>
            )}
          </div>
        </section>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Summary
            icon={UserRound}
            label="Supabase employees"
            value={String(employees.length)}
          />
          <Summary
            icon={BriefcaseBusiness}
            label="Skills represented"
            value={String(
              new Set(employees.flatMap(employee => employee.skills)).size
            )}
          />
          <Summary
            icon={BriefcaseBusiness}
            label="Monthly base pool"
            value={money(
              employees.reduce(
                (sum, employee) => sum + employee.basic_salary,
                0
              )
            )}
          />
        </div>
      </div>
    </div>
  );
}
function Summary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="atlas-panel p-5">
      <Icon size={16} className="text-[#0066CC]" />
      <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#6B7280]">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-extrabold text-[#0F172A]">
        {value}
      </p>
    </div>
  );
}
