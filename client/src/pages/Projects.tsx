import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  Download,
  FilePlus2,
  FileText,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { mockCompanies } from "@/lib/hrData";
import {
  companyName,
  money,
  projectSpend,
  projectStatuses,
  settlementStatus,
  balanceDue,
  type Project,
  type ProjectExpense,
  type ProjectStatus,
} from "@/lib/projectData";
import { useBusinessField } from "@/contexts/BusinessFieldContext";
import {
  itemsForWorkspace,
  normalizeStockItems,
  stockItems,
  type StockItem,
} from "@/lib/operationsData";
import FieldScopeBanner from "@/components/FieldScopeBanner";
import { insertErpRow, listErpRows } from "@/lib/erpData";
import { downloadBrandedPdf, printBrandedDocument } from "@/lib/pdf";
import {
  listLocalWarranties,
  persistWarrantyRecords,
  warrantyFromProjectDraft,
  warrantyMatches,
  warrantyStatusPair,
  type WarrantyRecord,
} from "@/lib/warrantyData";

type SolarPartner = "Hayleys" | "Deep Tech" | "SS Global Direct";
type WarrantyDraft = Omit<
  WarrantyRecord,
  "id" | "createdAt" | "projectId" | "invoiceId" | "workspace" | "projectSource"
>;
type ProjectForm = {
  customer: string;
  customerPhone: string;
  name: string;
  description: string;
  companyId: string;
  partner?: SolarPartner;
  location: string;
  budget: string;
  agreedPrice: string;
  advancePaid: string;
  startDate: string;
  targetDate: string;
  status: ProjectStatus;
  warrantyItems: WarrantyDraft[];
};

const solarPartners: Array<{
  name: SolarPartner;
  eyebrow: string;
  tone: string;
  accent: string;
  description: string;
}> = [
  {
    name: "Hayleys",
    eyebrow: "Solar partner network",
    tone: "bg-[#003366]",
    accent: "text-[#A8D4FF]",
    description: "Partner-managed solar heater and pump delivery programs.",
  },
  {
    name: "Deep Tech",
    eyebrow: "Solar partner network",
    tone: "bg-[#D97706]",
    accent: "text-[#FFE0A3]",
    description:
      "Partner-managed solar delivery work with tracked commercial balances.",
  },
  {
    name: "SS Global Direct",
    eyebrow: "Direct solar business",
    tone: "bg-[#0066CC]",
    accent: "text-[#CFE8FF]",
    description: "Direct B2C and B2B solar installations managed by SS Global.",
  },
];

const blankWarranty = (): WarrantyDraft => ({
  customerName: "",
  customerPhone: "",
  itemName: "",
  supplierName: "",
  serialNumber: "",
  supplierWarrantyExpiry: "",
  customerWarrantyExpiry: "",
});
const blankForm = (partner?: SolarPartner): ProjectForm => ({
  customer: "",
  customerPhone: "",
  name: "",
  description: "",
  companyId: "solar",
  partner,
  location: "",
  budget: "",
  agreedPrice: "",
  advancePaid: "",
  startDate: "",
  targetDate: "",
  status: "Planning",
  warrantyItems: partner === "SS Global Direct" ? [blankWarranty()] : [],
});
const partnerForProject = (project: Project): SolarPartner =>
  project.partner ?? "SS Global Direct";

/** SS Global Projects: Solar has partner drill-down; every other workspace keeps the standard project register. */
export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectExpenses] = useState<ProjectExpense[]>([]);
  const [statusFilter, setStatusFilter] = useState<"All" | ProjectStatus>(
    "All"
  );
  const [companyFilter, setCompanyFilter] = useState("all");
  const [selectedSolarPartner, setSelectedSolarPartner] =
    useState<SolarPartner | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProjectForm>(blankForm());
  const [dataSource, setDataSource] = useState<"empty" | "supabase">("empty");
  const [inventoryItems] = useState<StockItem[]>([]);
  const [showWarrantyOverview, setShowWarrantyOverview] = useState(false);
  const [warrantySearch, setWarrantySearch] = useState("");
  const warrantyRows = useMemo(
    () =>
      listLocalWarranties().filter(
        record =>
          record.projectSource === "SS Global Direct" &&
          warrantyMatches(record, warrantySearch)
      ),
    [warrantySearch, showWarrantyOverview, projects]
  );
  const { fieldId, field } = useBusinessField();
  const solarWorkspace = fieldId === "solar";
  const workspaceTitle =
    fieldId === "solar"
      ? "Solar"
      : fieldId === "irrigation"
        ? "Irrigation"
        : fieldId === "steel"
          ? "Iron Works"
          : field.shortLabel;

  useEffect(() => {
    setSelectedSolarPartner(null);
    setCompanyFilter("all");
  }, [fieldId]);
  useEffect(() => {
    let active = true;
    listErpRows<{
      id: string;
      workspace: string;
      source: string;
      project_name: string;
      description: string | null;
      customer_name: string;
      customer_phone: string | null;
      location: string | null;
      target_start_date: string | null;
      deadline: string | null;
      status: string;
      agreed_price: number | string;
      customer_advance_paid: number | string;
      budget: number | string;
    }>(
      "projects",
      "id,workspace,source,project_name,description,customer_name,customer_phone,location,target_start_date,deadline,status,agreed_price,customer_advance_paid,budget"
    )
      .then(rows => {
        if (!active) return;
        setProjects(
          rows.map(row => {
            const companyId =
              mockCompanies.find(company => company.name === row.workspace)
                ?.id ?? mockCompanies[0].id;
            return {
              id: row.id,
              name: row.project_name,
              companyId,
              businessField: companyId as Project["businessField"],
              customer: row.customer_name,
              customerPhone: row.customer_phone || "",
              description: row.description || "",
              location: row.location || "",
              status: (projectStatuses.includes(row.status as ProjectStatus)
                ? row.status
                : "Planning") as ProjectStatus,
              budget: Number(row.budget) || 0,
              contractValue: Number(row.agreed_price) || 0,
              advanceReceived: Number(row.customer_advance_paid) || 0,
              balancePayments: [],
              startDate: row.target_start_date || "",
              targetDate: row.deadline || "",
              progress: 0,
              partner:
                row.source === "Direct"
                  ? undefined
                  : (row.source as SolarPartner),
            };
          })
        );
        setDataSource("supabase");
      })
      .catch(() => {
        if (active) {
          setProjects([]);
          setDataSource("empty");
          toast.error("Projects could not be loaded from Supabase.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const scopedProjects = useMemo(
    () =>
      fieldId === "all"
        ? projects
        : projects.filter(project => project.businessField === fieldId),
    [projects, fieldId]
  );
  const visible = useMemo(
    () =>
      scopedProjects.filter(
        project =>
          (statusFilter === "All" || project.status === statusFilter) &&
          (companyFilter === "all" || project.companyId === companyFilter) &&
          (!selectedSolarPartner ||
            partnerForProject(project) === selectedSolarPartner)
      ),
    [scopedProjects, statusFilter, companyFilter, selectedSolarPartner]
  );
  const totalBudget = scopedProjects.reduce(
    (sum, project) => sum + project.budget,
    0
  );
  const totalExpenses = scopedProjects.reduce(
    (sum, project) => sum + projectSpend(project.id, projectExpenses),
    0
  );
  const totalOutstanding = scopedProjects.reduce(
    (sum, project) => sum + balanceDue(project),
    0
  );
  const formBalance = Math.max(
    0,
    Number(form.agreedPrice || 0) - Number(form.advancePaid || 0)
  );

  const openProjectForm = (partner?: SolarPartner) => {
    const next = blankForm(partner ?? selectedSolarPartner ?? undefined);
    if (!partner && !selectedSolarPartner && !solarWorkspace)
      next.companyId = fieldId;
    setForm(next);
    setShowForm(true);
  };
  const saveProject = (event: FormEvent) => {
    event.preventDefault();
    if (
      !form.name.trim() ||
      !form.customer.trim() ||
      !form.budget ||
      !form.agreedPrice ||
      !form.startDate
    )
      return toast.error(
        "Complete the customer, project price, budget, and start date before saving."
      );
    const directSolar = solarWorkspace && form.partner === "SS Global Direct";
    if (
      directSolar &&
      (!form.warrantyItems.length ||
        form.warrantyItems.some(
          item =>
            !item.itemName.trim() ||
            !item.supplierName.trim() ||
            !item.serialNumber.trim() ||
            !item.supplierWarrantyExpiry ||
            !item.customerWarrantyExpiry
        ))
    )
      return toast.error(
        "Complete every SS Global Direct warranty item before saving."
      );
    const advance = Number(form.advancePaid || 0);
    setSaving(true);
    const localProject: Project = {
      id: `proj-${Date.now()}`,
      name: form.name.trim(),
      companyId: form.companyId,
      partner: form.partner,
      businessField: form.companyId as Project["businessField"],
      customer: form.customer.trim(),
      customerPhone: form.customerPhone.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      status: form.status,
      budget: Number(form.budget),
      contractValue: Number(form.agreedPrice),
      advanceReceived: advance,
      balancePayments: [],
      startDate: form.startDate,
      targetDate: form.targetDate,
      progress: 0,
    };
    insertErpRow<{ id: string }>(
      "projects",
      {
        workspace: companyName(localProject.companyId),
        source: localProject.partner || "Direct",
        project_name: localProject.name,
        description: localProject.description || null,
        customer_name: localProject.customer,
        customer_phone: localProject.customerPhone || null,
        location: localProject.location || null,
        target_start_date: localProject.startDate || null,
        deadline: localProject.targetDate || null,
        status: localProject.status,
        agreed_price: localProject.contractValue,
        customer_advance_paid: localProject.advanceReceived,
        budget: localProject.budget,
      },
      "id"
    )
      .then(row => {
        setProjects(current => [{ ...localProject, id: row.id }, ...current]);
        if (directSolar)
          void persistWarrantyRecords(
            form.warrantyItems.map(item =>
              warrantyFromProjectDraft({
                ...item,
                projectId: row.id,
                customerName: localProject.customer,
                customerPhone: localProject.customerPhone ?? "",
              })
            )
          );
        setDataSource("supabase");
        toast.success(
          advance
            ? `Project saved and ${money(advance)} credited locally.`
            : "Project saved to Supabase."
        );
      })
      .catch(() => {
        toast.error(
          "Could not save the project to Supabase. Nothing was saved locally."
        );
      })
      .finally(() => {
        setForm(blankForm());
        setShowForm(false);
        setSaving(false);
      });
  };
  const projectPdf = () => ({
    title: "Project Report",
    documentNo: `PROJ-${new Date().toISOString().slice(0, 10)}`,
    date: new Date().toISOString().slice(0, 10),
    subtitle: `Project portfolio for ${workspaceTitle}`,
    summaries: [
      { label: "Projects", value: String(scopedProjects.length) },
      { label: "Total budget", value: money(totalBudget) },
      { label: "Expenses", value: money(totalExpenses), tone: "rose" as const },
      {
        label: "Outstanding",
        value: money(totalOutstanding),
        tone: "amber" as const,
      },
    ],
    columns: [
      { label: "Project", width: 52 },
      { label: "Customer", width: 42 },
      { label: "Status", width: 27 },
      { label: "Budget", width: 30, align: "right" as const },
      { label: "Spent", width: 29, align: "right" as const },
      { label: "Balance", width: 30, align: "right" as const },
    ],
    rows: visible.map(project => [
      project.name,
      project.customer,
      project.status,
      money(project.budget),
      money(projectSpend(project.id, projectExpenses)),
      money(balanceDue(project)),
    ]),
    terms: [
      "Project figures are shown in LKR (Rs.).",
      "Outstanding balances reflect recorded customer advances and balance payments.",
    ],
  });
  const downloadProjectPdf = () => {
    downloadBrandedPdf(projectPdf(), "ss-global-project-report.pdf");
    toast.success("Branded project report downloaded.");
  };
  const printProjectPdf = () => {
    printBrandedDocument(projectPdf());
    toast.success("Project report opened for printing.");
  };

  return (
    <div className="relative overflow-hidden px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="relative mx-auto max-w-[1440px]">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow text-[#0052A5]">Delivery index / projects</p>
            <h2 className="mt-4 font-display text-[36px] font-extrabold tracking-[-0.06em] text-[#0F172A] sm:text-[46px]">
              Projects & costing
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#627A88]">
              {solarWorkspace
                ? selectedSolarPartner
                  ? `${selectedSolarPartner} project register inside Solar.`
                  : "Choose a Solar company to open its project register."
                : `${workspaceTitle} uses the standard project list and create form.`}
            </p>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#6B7280]">
              {dataSource === "supabase"
                ? "Synced with Supabase"
                : "No Supabase data available"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 self-start lg:self-end">
            <button
              onClick={downloadProjectPdf}
              className="flex items-center gap-2 rounded-xl border border-[#BFD5E8] bg-white px-3 py-3 text-xs font-extrabold text-[#0052A5]"
            >
              <Download size={15} /> PDF
            </button>
            <button
              onClick={printProjectPdf}
              className="flex items-center gap-2 rounded-xl border border-[#BFD5E8] bg-white px-3 py-3 text-xs font-extrabold text-[#0052A5]"
            >
              <FileText size={15} /> Print
            </button>
            {solarWorkspace && (
              <button
                onClick={() => {
                  setWarrantySearch("");
                  setShowWarrantyOverview(true);
                }}
                className="flex items-center gap-2 rounded-xl border border-[#BFD5E8] bg-white px-3 py-3 text-xs font-extrabold text-[#0052A5] transition hover:bg-[#EAF3F8]"
              >
                <ShieldCheck size={15} /> Warranty Details
              </button>
            )}
            {(!solarWorkspace || selectedSolarPartner) && (
              <button
                onClick={() => openProjectForm()}
                className="flex items-center gap-2 rounded-xl bg-[#0066CC] px-4 py-3 text-xs font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#0052A5]"
              >
                <FilePlus2 size={16} /> New project
              </button>
            )}
          </div>
        </div>
        <FieldScopeBanner />
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Stat
            label="Total projects"
            value={String(scopedProjects.length)}
            note={`${workspaceTitle} workspace`}
            icon={BriefcaseBusiness}
          />
          <Stat
            label="In progress"
            value={String(
              scopedProjects.filter(p => p.status === "In Progress").length
            )}
            note="active delivery"
            icon={CalendarDays}
          />
          <Stat
            label="Total budget"
            value={money(totalBudget)}
            note="allocated costs"
            icon={CircleDollarSign}
          />
          <Stat
            label="Total expenses"
            value={money(totalExpenses)}
            note="logged to date"
            icon={CircleDollarSign}
          />
          <Stat
            label="Outstanding"
            value={money(totalOutstanding)}
            note="balance due"
            icon={CircleDollarSign}
          />
        </div>
        {solarWorkspace && !selectedSolarPartner ? (
          <section>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="eyebrow">Solar company workspaces</p>
                <h3 className="mt-2 font-display text-2xl font-extrabold text-[#0F172A]">
                  Select a company to continue
                </h3>
              </div>
              <span className="rounded-full bg-[#EAF3F8] px-3 py-1.5 text-[10px] font-extrabold text-[#34647F]">
                3 company views
              </span>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {solarPartners.map(partner => {
                const partnerRows = partnerProjects(partner.name);
                const contracted = partnerRows.reduce(
                  (sum, project) => sum + project.contractValue,
                  0
                );
                const collected = partnerRows.reduce(
                  (sum, project) =>
                    sum +
                    project.advanceReceived +
                    project.balancePayments.reduce(
                      (inner, payment) => inner + payment.amount,
                      0
                    ),
                  0
                );
                return (
                  <button
                    key={partner.name}
                    onClick={() => setSelectedSolarPartner(partner.name)}
                    className={`group overflow-hidden rounded-2xl text-left text-white shadow-[0_18px_42px_rgba(15,45,80,0.14)] transition hover:-translate-y-1 hover:shadow-[0_24px_52px_rgba(15,45,80,0.2)] ${partner.tone}`}
                  >
                    <div className="flex items-start justify-between p-5">
                      <div>
                        <p
                          className={`text-[10px] font-extrabold uppercase tracking-[.16em] ${partner.accent}`}
                        >
                          {partner.eyebrow}
                        </p>
                        <h4 className="mt-3 font-display text-2xl font-extrabold">
                          {partner.name}
                        </h4>
                        <p className="mt-2 max-w-xs text-xs font-semibold leading-5 text-white/75">
                          {partner.description}
                        </p>
                      </div>
                      <UsersRound size={22} className="text-white/80" />
                    </div>
                    <div className="grid grid-cols-2 gap-px bg-white/15">
                      <Metric
                        label="Total projects"
                        value={String(partnerRows.length)}
                      />
                      <Metric
                        label="Contracted amount"
                        value={money(contracted)}
                      />
                      <Metric label="Collected cash" value={money(collected)} />
                      <Metric
                        label="Pending balance"
                        value={money(Math.max(0, contracted - collected))}
                      />
                    </div>
                    <div className="flex items-center justify-between px-5 py-3 text-[10px] font-extrabold uppercase tracking-[.12em] text-white/80">
                      <span>Open project list</span>
                      <ArrowUpRight
                        size={15}
                        className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="atlas-panel overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-[#E5E7EB] px-5 py-5 sm:px-6">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex items-center gap-3">
                  {solarWorkspace && (
                    <button
                      onClick={() => setSelectedSolarPartner(null)}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-[#BFD5E8] bg-white text-[#0052A5] hover:bg-[#EAF3F8]"
                      aria-label="Back to Solar companies"
                    >
                      <ArrowLeft size={15} />
                    </button>
                  )}
                  <div>
                    <p className="eyebrow">
                      {solarWorkspace
                        ? `${selectedSolarPartner} project register`
                        : `${workspaceTitle} delivery register`}
                    </p>
                    <h3 className="mt-2 font-display text-xl font-extrabold text-[#0F172A]">
                      All projects{" "}
                      <span className="ml-1 text-sm font-semibold text-[#8CA0AB]">
                        · {visible.length} shown
                      </span>
                    </h3>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["All", ...projectStatuses] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${statusFilter === status ? "bg-[#0066CC] text-white" : "bg-[#F1F5F7] text-[#627A88]"}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCompanyFilter("all")}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${companyFilter === "all" ? "bg-[#0052A5] text-white" : "bg-[#F1F5F7] text-[#627A88]"}`}
                >
                  All business types
                </button>
                {mockCompanies.map(company => (
                  <button
                    key={company.id}
                    onClick={() => setCompanyFilter(company.id)}
                    className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${companyFilter === company.id ? "bg-[#0066CC] text-white" : "bg-[#F1F5F7] text-[#627A88]"}`}
                  >
                    {company.short} · {company.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-[#E5E7EB]">
              {visible.map(project => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  expenses={projectExpenses}
                  solar={solarWorkspace}
                />
              ))}
              {visible.length === 0 && (
                <div className="px-6 py-14 text-center">
                  <BriefcaseBusiness
                    className="mx-auto text-[#9BB1BE]"
                    size={28}
                  />
                  <p className="mt-3 text-sm font-extrabold text-[#19364D]">
                    No projects in this view yet
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#78909D]">
                    Create a project to start tracking delivery, spend, and
                    customer balances.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
        {showForm && (
          <ProjectFormModal
            form={form}
            setForm={setForm}
            saving={saving}
            balance={formBalance}
            solarPartner={selectedSolarPartner}
            inventoryItems={inventoryItems}
            onClose={() => setShowForm(false)}
            onSubmit={saveProject}
          />
        )}
        {showWarrantyOverview && solarWorkspace && (
          <WarrantyOverview
            records={warrantyRows}
            search={warrantySearch}
            setSearch={setWarrantySearch}
            onClose={() => setShowWarrantyOverview(false)}
          />
        )}
      </div>
    </div>
  );

  function partnerProjects(partner: SolarPartner) {
    return scopedProjects.filter(
      project => solarWorkspace && partnerForProject(project) === partner
    );
  }
}

function ProjectRow({
  project,
  expenses,
  solar,
}: {
  project: Project;
  expenses: ProjectExpense[];
  solar: boolean;
}) {
  const spent = projectSpend(project.id, expenses);
  const pct =
    project.budget > 0
      ? Math.min(100, Math.round((spent / project.budget) * 100))
      : 0;
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block p-5 transition hover:bg-[#F8FAFC] sm:px-6"
    >
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
        <div className="flex items-start gap-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#EAF3F8] text-[#0066CC]">
            <BriefcaseBusiness size={18} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-extrabold text-[#0F172A]">
                {project.name}
              </p>
              <StatusBadge status={project.status} />
              <SettlementBadge status={settlementStatus(project)} />
            </div>
            <p className="mt-1 text-xs font-semibold text-[#627A88]">
              {project.customer} ·{" "}
              {solar
                ? (project.partner ?? "SS Global Direct")
                : companyName(project.companyId)}
            </p>
            <p className="mt-2 text-[11px] font-semibold text-[#6B7280]">
              Value {money(project.contractValue)} · Advance{" "}
              {money(project.advanceReceived)} · Due{" "}
              {money(balanceDue(project))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-8 xl:min-w-[430px] xl:justify-end">
          <div className="w-full max-w-xs">
            <div className="mb-2 flex justify-between text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8CA0AB]">
              <span>Spend / budget</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#E8EEF1]">
              <div
                className={`h-full rounded-full ${pct > 90 ? "bg-[#C57B67]" : "bg-[#0066CC]"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 text-right text-[10px] font-semibold text-[#8CA0AB]">
              {money(spent)} / {money(project.budget)}
            </p>
          </div>
          <ArrowUpRight
            size={17}
            className="shrink-0 text-[#A9BBC6] transition group-hover:-translate-y-0.5 group-hover:text-[#0066CC]"
          />
        </div>
      </div>
    </Link>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/10 px-5 py-4">
      <p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-white/65">
        {label}
      </p>
      <p className="mt-1 text-sm font-extrabold text-white">{value}</p>
    </div>
  );
}
function Stat({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof BriefcaseBusiness;
}) {
  return (
    <div className="atlas-panel p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#78909D]">
            {label}
          </p>
          <p className="mt-2 font-display text-2xl font-extrabold tracking-[-0.05em] text-[#0F172A]">
            {value}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#8CA0AB]">
            {note}
          </p>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#EAF3F8] text-[#0066CC]">
          <Icon size={17} />
        </div>
      </div>
    </div>
  );
}
function StatusBadge({ status }: { status: ProjectStatus }) {
  const classes = {
    Planning: "bg-[#EAF3F8] text-[#34647F]",
    "In Progress": "bg-[#FFF6E2] text-[#9A6A13]",
    Completed: "bg-[#EDF6EF] text-[#4D775D]",
    "On Hold": "bg-[#FBEFEB] text-[#A35749]",
  };
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${classes[status]}`}
    >
      {status}
    </span>
  );
}
function SettlementBadge({
  status,
}: {
  status: ReturnType<typeof settlementStatus>;
}) {
  const classes = {
    "Advance Paid": "bg-[#FFF6E2] text-[#9A6A13]",
    "Partially Settled": "bg-[#EAF3F8] text-[#34647F]",
    "Fully Settled": "bg-[#EDF6EF] text-[#4D775D]",
  };
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${classes[status]}`}
    >
      {status}
    </span>
  );
}
function ProjectFormModal({
  form,
  setForm,
  saving,
  balance,
  solarPartner,
  inventoryItems,
  onClose,
  onSubmit,
}: {
  form: ProjectForm;
  setForm: (form: ProjectForm) => void;
  saving: boolean;
  balance: number;
  solarPartner: SolarPartner | null;
  inventoryItems: StockItem[];
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#0F172A]/50 p-5 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="my-8 w-full max-w-2xl rounded-2xl border border-[#D9E2E7] bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">New delivery line</p>
            <h3 className="mt-2 font-display text-2xl font-extrabold text-[#0F172A]">
              Create project
            </h3>
            <p className="mt-2 text-xs font-semibold text-[#78909D]">
              {solarPartner
                ? `${solarPartner} is pre-selected for this Solar project.`
                : "Standard project creation form"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#78909D] hover:bg-[#F1F5F7]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <div className="mb-4 flex items-center gap-2">
              <BriefcaseBusiness size={16} className="text-[#0066CC]" />
              <p className="text-xs font-extrabold uppercase tracking-[.12em] text-[#0052A5]">
                Project details
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Customer name"
                value={form.customer}
                onChange={value => setForm({ ...form, customer: value })}
                placeholder="e.g. Harbour View Residences"
                required
              />
              <Field
                label="Phone number"
                type="tel"
                value={form.customerPhone}
                onChange={value => setForm({ ...form, customerPhone: value })}
                placeholder="e.g. 077 123 4567"
              />
              <Field
                label="Project title / description"
                value={form.name}
                onChange={value => setForm({ ...form, name: value })}
                placeholder="e.g. 10kW rooftop installation"
                required
              />
              <Field
                label="Location"
                value={form.location}
                onChange={value => setForm({ ...form, location: value })}
                placeholder="e.g. Colombo 07"
              />
              <Select
                label="Assigned Workspace"
                value={form.companyId}
                onChange={value => setForm({ ...form, companyId: value })}
                options={mockCompanies.map(company => ({
                  value: company.id,
                  label: company.name,
                }))}
                disabled={Boolean(solarPartner)}
              />
              <Field
                label="Target start date"
                type="date"
                value={form.startDate}
                onChange={value => setForm({ ...form, startDate: value })}
                required
              />
              <Field
                label="Target completion date"
                type="date"
                value={form.targetDate}
                onChange={value => setForm({ ...form, targetDate: value })}
              />
              <label className="block">
                <span className="field-label">Project Status</span>
                <select
                  required
                  value={form.status}
                  onChange={event =>
                    setForm({
                      ...form,
                      status: event.target.value as ProjectStatus,
                    })
                  }
                  className="field-input"
                >
                  {projectStatuses.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="Project cost budget (LKR)"
                type="number"
                value={form.budget}
                onChange={value => setForm({ ...form, budget: value })}
                placeholder="e.g. 250000"
                required
              />
              <label className="block sm:col-span-2">
                <span className="field-label">Project notes</span>
                <textarea
                  value={form.description}
                  onChange={event =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="Scope, equipment, or delivery notes"
                  className="min-h-20 w-full rounded-lg border border-[#D9E2E7] bg-white px-3 py-3 text-sm font-semibold text-[#19364D] outline-none placeholder:text-[#A9BBC6] focus:border-[#0066CC]"
                />
              </label>
            </div>
            {solarPartner && (
              <div className="mt-4">
                <Field
                  label="Solar company"
                  value={solarPartner}
                  onChange={() => undefined}
                  disabled
                />
                <p className="mt-1 text-[11px] font-semibold text-[#627A88]">
                  Locked because this project was started from the{" "}
                  {solarPartner} card.
                </p>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-[#BFD5E8] bg-[#F4F9FD] p-4">
            <div className="mb-4 flex items-center gap-2">
              <CircleDollarSign size={16} className="text-[#0066CC]" />
              <p className="text-xs font-extrabold uppercase tracking-[.12em] text-[#0052A5]">
                Customer payment plan
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Agreed Project Price (LKR)"
                type="number"
                value={form.agreedPrice}
                onChange={value => setForm({ ...form, agreedPrice: value })}
                placeholder="e.g. 450000"
                required
              />
              <Field
                label="Customer Advance Paid (LKR)"
                type="number"
                value={form.advancePaid}
                onChange={value => setForm({ ...form, advancePaid: value })}
                placeholder="e.g. 100000"
              />
              <div className="rounded-lg border border-[#9CC5E5] bg-white p-3 sm:col-span-2">
                <p className="field-label">Remaining Customer Balance (LKR)</p>
                <p className="mt-2 font-display text-2xl font-extrabold text-[#0066CC]">
                  {money(balance)}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[#627A88]">
                  Agreed price minus customer advance paid
                </p>
              </div>
            </div>
          </div>
        </div>
        {solarPartner === "SS Global Direct" && (
          <WarrantyEditor
            form={form}
            setForm={setForm}
            inventoryItems={itemsForWorkspace(inventoryItems, "solar")}
          />
        )}
        <p className="mt-4 text-xs font-semibold text-[#627A88]">
          Any advance entered here is credited to the selected Workspace
          cash/bank ledger when the project is created.
        </p>
        <button
          disabled={saving}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0066CC] text-sm font-extrabold text-white disabled:opacity-60"
        >
          {saving && <Loader2 size={16} className="animate-spin" />} Save
          project & credit advance
        </button>
      </form>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        required={required}
        disabled={disabled}
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="field-input disabled:cursor-not-allowed disabled:bg-[#EEF3F6] disabled:text-[#78909D]"
      />
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <select
        disabled={disabled}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="field-input disabled:cursor-not-allowed disabled:bg-[#EEF3F6] disabled:text-[#78909D]"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function WarrantyEditor({
  form,
  setForm,
  inventoryItems,
}: {
  form: ProjectForm;
  setForm: (form: ProjectForm) => void;
  inventoryItems: StockItem[];
}) {
  const updateItem = (index: number, patch: Partial<WarrantyDraft>) =>
    setForm({
      ...form,
      warrantyItems: form.warrantyItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  const addItem = () =>
    setForm({
      ...form,
      warrantyItems: [...form.warrantyItems, blankWarranty()],
    });
  const removeItem = (index: number) =>
    setForm({
      ...form,
      warrantyItems: form.warrantyItems.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    });
  return (
    <section className="rounded-xl border border-[#A8D4FF] bg-[#F3F9FE] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#0066CC]" />
            <p className="text-xs font-extrabold uppercase tracking-[.12em] text-[#0052A5]">
              Warranty Details
            </p>
          </div>
          <p className="mt-1 text-[11px] font-semibold text-[#627A88]">
            Add every hardware item used in this SS Global Direct project.
          </p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-extrabold text-[#34647F]">
          {form.warrantyItems.length} item
          {form.warrantyItems.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-4 space-y-4">
        {form.warrantyItems.map((item, index) => (
          <div
            key={`warranty-${index}`}
            className="rounded-lg border border-[#D9E2E7] bg-white p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-extrabold text-[#19364D]">
                Hardware item {index + 1}
              </p>
              {form.warrantyItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="rounded-md p-1.5 text-[#A35749] hover:bg-[#FBEFEB]"
                  aria-label={`Remove warranty item ${index + 1}`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Item Name · Solar Energy</span>
                <select
                  required
                  value={item.itemName}
                  onChange={event =>
                    updateItem(index, { itemName: event.target.value })
                  }
                  className="field-input"
                >
                  <option value="">Select Solar inventory item</option>
                  {inventoryItems.map(inventoryItem => (
                    <option key={inventoryItem.id} value={inventoryItem.name}>
                      {inventoryItem.name}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="Supplier Name"
                value={item.supplierName}
                onChange={value => updateItem(index, { supplierName: value })}
                placeholder="Where SS Global bought it"
                required
              />
              <Field
                label="Serial Number"
                value={item.serialNumber}
                onChange={value => updateItem(index, { serialNumber: value })}
                placeholder="Serial / asset number"
                required
              />
              <Field
                label="Supplier Warranty Expiry Date"
                type="date"
                value={item.supplierWarrantyExpiry}
                onChange={value =>
                  updateItem(index, { supplierWarrantyExpiry: value })
                }
                required
              />
              <Field
                label="Customer Warranty Expiry Date"
                type="date"
                value={item.customerWarrantyExpiry}
                onChange={value =>
                  updateItem(index, { customerWarrantyExpiry: value })
                }
                required
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-2 rounded-lg border border-[#9CC5E5] bg-white px-3 py-2 text-xs font-extrabold text-[#0052A5] hover:bg-[#EAF3F8]"
        >
          <Plus size={14} /> Add another item
        </button>
      </div>
    </section>
  );
}

function WarrantyOverview({
  records,
  search,
  setSearch,
  onClose,
}: {
  records: WarrantyRecord[];
  search: string;
  setSearch: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#10263D]/45 p-4 backdrop-blur-sm">
      <section className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-[#D9E2E7] bg-white text-[#10263D] shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-[#E2E9ED] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <p className="eyebrow text-[#0052A5]">
              Solar Energy / SS Global Direct
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold tracking-[-.05em]">
              Warranty Overview
            </h2>
            <p className="mt-1 text-xs font-semibold text-[#627A88]">
              All item warranty records from direct Solar projects in one
              searchable view.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#78909D] hover:bg-[#F1F5F7]"
            aria-label="Close warranty overview"
          >
            <X size={18} />
          </button>
        </div>
        <div className="border-b border-[#E2E9ED] bg-[#F8FAFC] px-5 py-4 sm:px-6">
          <label className="relative block max-w-xl">
            <ShieldCheck
              size={15}
              className="absolute left-3 top-3 text-[#0066CC]"
            />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search serial number, customer name, phone, or supplier"
              className="field-input pl-9"
              autoFocus
            />
          </label>
        </div>
        <div className="max-h-[58vh] overflow-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead className="sticky top-0 bg-[#F8FAFC] text-[10px] font-extrabold uppercase tracking-[.12em] text-[#627A88]">
              <tr>
                <th className="px-5 py-3 sm:px-6">Item / Serial</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Supplier</th>
                <th className="px-5 py-3">Supplier warranty</th>
                <th className="px-5 py-3">Customer warranty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E9ED]">
              {records.map(record => {
                const status = warrantyStatusPair(record);
                return (
                  <tr key={record.id} className="transition hover:bg-[#F8FAFC]">
                    <td className="px-5 py-4 sm:px-6">
                      <p className="text-sm font-extrabold text-[#19364D]">
                        {record.itemName}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-[#627A88]">
                        {record.serialNumber}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-[#476174]">
                      <p>{record.customerName}</p>
                      <p className="mt-1 text-[10px] text-[#8CA0AB]">
                        {record.customerPhone || "No phone"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-[#476174]">
                      {record.supplierName}
                    </td>
                    <td className="px-5 py-4">
                      <StatusChip status={status.supplier} />
                      <p className="mt-1 text-[10px] font-semibold text-[#8CA0AB]">
                        {record.supplierWarrantyExpiry}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <StatusChip status={status.customer} />
                      <p className="mt-1 text-[10px] font-semibold text-[#8CA0AB]">
                        {record.customerWarrantyExpiry}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {records.length === 0 && (
            <div className="px-6 py-14 text-center">
              <ShieldCheck className="mx-auto text-[#9BB1BE]" size={28} />
              <p className="mt-3 text-sm font-extrabold text-[#19364D]">
                No warranty records found
              </p>
              <p className="mt-1 text-xs font-semibold text-[#78909D]">
                Add item warranties from an SS Global Direct project or adjust
                your search.
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-[#E2E9ED] px-5 py-3 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#78909D] sm:px-6">
          <span>
            {records.length} matching item{records.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#0066CC] px-3 py-2 text-white hover:bg-[#0052A5]"
          >
            Done
          </button>
        </div>
      </section>
    </div>
  );
}
function StatusChip({ status }: { status: "Active" | "Expired" }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-extrabold ${status === "Active" ? "bg-[#EDF6EF] text-[#4D775D]" : "bg-[#FBEFEB] text-[#A35749]"}`}
    >
      {status}
    </span>
  );
}
