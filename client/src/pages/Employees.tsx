import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Loader2, Plus, Search, UserRound, X } from "lucide-react";
import { mockCompanies, money, type Employee } from "@/lib/hrData";
import { insertErpRow, listErpRows } from "@/lib/erpData";

/** Field Atlas: personnel is an indexed field sheet—quiet surfaces, hairline rules, amber actions. */
export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dataSource, setDataSource] = useState<"empty" | "supabase">("empty");
  useEffect(() => {
    let active = true;
    listErpRows<{
      id: string;
      full_name: string;
      salary: number | string;
      status: string;
      department: string | null;
      role: string | null;
    }>("employees", "id,full_name,salary,status,department,role")
      .then(rows => {
        if (!active) return;
        setEmployees(
          rows.map(row => ({
            id: row.id,
            name: row.full_name,
            phone: "—",
            nic: "Pending",
            basic_salary: Number(row.salary) || 0,
            daily_wage: Math.round((Number(row.salary) || 0) / 26),
            skills: row.role ? [row.role] : [],
            company_id: row.department || mockCompanies[0].id,
            status: row.status === "Inactive" ? "Inactive" : "Active",
          }))
        );
        setDataSource("supabase");
      })
      .catch(() => {
        if (active) {
          setEmployees([]);
          setDataSource("empty");
          toast.error("Employees could not be loaded from Supabase.");
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    basic_salary: "",
    company_id: mockCompanies[0].id,
  });

  const filtered = useMemo(
    () =>
      employees.filter(employee => {
        const matchesSearch =
          employee.name.toLowerCase().includes(search.toLowerCase()) ||
          employee.phone.includes(search);
        return (
          matchesSearch &&
          (companyFilter === "all" || employee.company_id === companyFilter)
        );
      }),
    [employees, search, companyFilter]
  );
  const companyName = (id: string) =>
    mockCompanies.find(company => company.id === id)?.name ?? "Unassigned";
  const initials = (name: string) =>
    name
      .split(" ")
      .map(part => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const addEmployee = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.basic_salary)
      return toast.error("Name and basic salary are required.");
    setSaving(true);
    insertErpRow<{ id: string }>(
      "employees",
      {
        full_name: form.name.trim(),
        salary: Number(form.basic_salary),
        department: form.company_id,
        status: "Active",
      },
      "id"
    )
      .then(row => {
        setEmployees(current => [
          {
            id: row.id,
            name: form.name.trim(),
            phone: form.phone.trim() || "—",
            nic: "Pending",
            basic_salary: Number(form.basic_salary),
            daily_wage: Math.round(Number(form.basic_salary) / 26),
            skills: ["General operations"],
            company_id: form.company_id,
            status: "Active",
          },
          ...current,
        ]);
        setDataSource("supabase");
        setForm({
          name: "",
          phone: "",
          basic_salary: "",
          company_id: mockCompanies[0].id,
        });
        setShowForm(false);
        toast.success("Employee saved to Supabase.");
      })
      .catch(() =>
        toast.error(
          "Could not save the employee to Supabase. Nothing was saved locally."
        )
      )
      .finally(() => setSaving(false));
  };

  return (
    <div className="relative overflow-hidden px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="relative mx-auto max-w-[1440px]">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow">People index / 05</p>
            <h2 className="mt-4 font-display text-[36px] font-extrabold tracking-[-0.06em] sm:text-[46px]">
              Employee directory
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#627A88]">
              Keep the shared team pool current across every operating company.
              Records are loaded from the authenticated Supabase employee table.
            </p>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#8CA0AB]">
              {dataSource === "supabase"
                ? "Synced with Supabase"
                : "No Supabase data available"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/payroll"
              className="rounded-xl border border-[#D9E2E7] bg-white px-4 py-3 text-xs font-extrabold text-[#476174] transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              Open payroll
            </Link>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-xl bg-[#E5A83B] px-4 py-3 text-xs font-extrabold text-[#10263D] transition hover:-translate-y-0.5 hover:bg-[#efb84f]"
            >
              <Plus size={16} /> Add employee
            </button>
          </div>
        </div>
        <div className="atlas-panel overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-[#E2E9ED] px-5 py-5 sm:px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="eyebrow">Shared team pool</p>
                <h3 className="mt-2 font-display text-xl font-extrabold tracking-[-0.04em]">
                  {employees.length} employees{" "}
                  <span className="ml-1 text-sm font-semibold text-[#8CA0AB]">
                    · {filtered.length} shown
                  </span>
                </h3>
              </div>
              <label className="relative block w-full sm:w-72">
                <Search
                  size={16}
                  className="absolute left-3 top-3 text-[#8CA0AB]"
                />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search name or phone"
                  className="h-10 w-full rounded-lg border border-[#D9E2E7] bg-[#F7FAFB] pl-9 pr-3 text-xs font-semibold outline-none transition focus:border-[#E5A83B]"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCompanyFilter("all")}
                className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold transition ${companyFilter === "all" ? "bg-[#10263D] text-white" : "bg-[#F1F5F7] text-[#627A88] hover:bg-[#E8EEF1]"}`}
              >
                All companies
              </button>
              {mockCompanies.map(company => (
                <button
                  key={company.id}
                  onClick={() => setCompanyFilter(company.id)}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold transition ${companyFilter === company.id ? "bg-[#E5A83B] text-[#10263D]" : "bg-[#F1F5F7] text-[#627A88] hover:bg-[#E8EEF1]"}`}
                >
                  {company.short} · {company.name}
                </button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <UserRound size={30} className="text-[#A9BBC6]" />
              <p className="mt-3 text-sm font-extrabold text-[#19364D]">
                No employees found
              </p>
              <p className="mt-1 text-xs text-[#78909D]">
                Add the first record or adjust your filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead className="bg-[#F7FAFB] text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#8CA0AB]">
                  <tr>
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Phone</th>
                    <th className="px-6 py-3">Company</th>
                    <th className="px-6 py-3 text-right">Basic salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E9ED]">
                  {filtered.map(employee => (
                    <tr
                      key={employee.id}
                      className="transition hover:bg-[#F7FAFB]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#EAF3F8] text-xs font-extrabold text-[#34647F]">
                            {initials(employee.name)}
                          </div>
                          <span className="text-sm font-extrabold text-[#19364D]">
                            {employee.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#627A88]">
                        {employee.phone}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#627A88]">
                        {companyName(employee.company_id)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-extrabold text-[#19364D]">
                        {money(employee.basic_salary)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {showForm && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-[#10263D]/40 p-5 backdrop-blur-sm">
            <form
              onSubmit={addEmployee}
              className="w-full max-w-md rounded-2xl border border-[#D9E2E7] bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow">New record</p>
                  <h3 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.05em]">
                    Add employee
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg p-2 text-[#78909D] hover:bg-[#F1F5F7]"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-6 space-y-4">
                <Field
                  label="Name"
                  value={form.name}
                  onChange={value => setForm({ ...form, name: value })}
                  placeholder="e.g. Maya Perera"
                  required
                />
                <Field
                  label="Phone"
                  value={form.phone}
                  onChange={value => setForm({ ...form, phone: value })}
                  placeholder="e.g. +94 77 123 4567"
                />
                <Field
                  label="Basic salary"
                  type="number"
                  value={form.basic_salary}
                  onChange={value => setForm({ ...form, basic_salary: value })}
                  placeholder="e.g. 85000"
                  required
                />
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#78909D]">
                    Company
                  </span>
                  <select
                    value={form.company_id}
                    onChange={event =>
                      setForm({ ...form, company_id: event.target.value })
                    }
                    className="h-11 w-full rounded-lg border border-[#D9E2E7] bg-white px-3 text-sm font-semibold text-[#19364D] outline-none focus:border-[#E5A83B]"
                  >
                    {mockCompanies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                disabled={saving}
                className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#10263D] text-sm font-extrabold text-white transition hover:bg-[#193B57] disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />} Save
                employee
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#78909D]">
        {label}
      </span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-[#D9E2E7] bg-white px-3 text-sm font-semibold text-[#19364D] outline-none placeholder:text-[#A9BBC6] focus:border-[#E5A83B]"
      />
    </label>
  );
}
