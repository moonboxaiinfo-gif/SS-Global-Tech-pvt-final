import { Filter } from "lucide-react";
import { useBusinessField } from "@/contexts/BusinessFieldContext";

export default function FieldScopeBanner() {
 const { field, isConsolidated } = useBusinessField();
 return <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#BFD5E8] bg-[#EAF3F8] px-4 py-3 text-xs font-semibold text-[#0052A5] "><span className="grid h-7 w-7 place-items-center rounded-lg bg-white/70 text-sm ">{field.icon}</span><Filter size={14} /><span>{isConsolidated ? "Consolidated view · showing all business fields" : `Scoped to ${field.label} · dashboard, finance, projects, inventory, and reports follow this filter`}</span></div>;
}
