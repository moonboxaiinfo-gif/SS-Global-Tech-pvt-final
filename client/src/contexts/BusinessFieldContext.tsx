import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type BusinessFieldId = "all" | "solar" | "steel" | "furniture" | "irrigation";
export type BusinessField = { id: BusinessFieldId; label: string; shortLabel: string; icon: string; color: string };
export const businessFields: BusinessField[] = [
 { id: "all", label: "All Workspaces", shortLabel: "Consolidated", icon: "🌐", color: "#0066CC" },
 { id: "solar", label: "Solar Energy", shortLabel: "Solar", icon: "☀️", color: "#F59E0B" },
 { id: "irrigation", label: "Irrigation", shortLabel: "Irrigation", icon: "💧", color: "#0EA5E9" },
 { id: "steel", label: "Iron Work", shortLabel: "Iron Work", icon: "🛠️", color: "#64748B" },
 { id: "furniture", label: "Furniture", shortLabel: "Furniture", icon: "🪑", color: "#8B5CF6" },
];
export const workspaceOptions = businessFields.filter((item) => item.id === "solar" || item.id === "irrigation" || item.id === "steel" || item.id === "furniture");
const STORAGE_KEY = "ss-global-business-field";
const normalizeActiveWorkspace = (value: unknown): BusinessFieldId => value === "solar" || value === "irrigation" || value === "steel" || value === "furniture" ? value : "solar";
const BusinessFieldContext = createContext<{ field: BusinessField; fieldId: BusinessFieldId; setFieldId: (id: BusinessFieldId) => void; isConsolidated: boolean }>({ field: businessFields[1], fieldId: "solar", setFieldId: () => undefined, isConsolidated: false });
export function BusinessFieldProvider({ children }: { children: React.ReactNode }) {
 const [fieldId, setFieldId] = useState<BusinessFieldId>(() => {
  if (typeof window === "undefined") return "solar";
  try {
   return normalizeActiveWorkspace(window.localStorage.getItem(STORAGE_KEY));
  } catch {
   return "solar";
  }
 });
 useEffect(() => {
  try { window.localStorage.setItem(STORAGE_KEY, fieldId); } catch { /* Keep the in-memory workspace selection usable. */ }
 }, [fieldId]);
 const value = useMemo(() => ({ field: businessFields.find((item) => item.id === fieldId) ?? businessFields[0], fieldId, setFieldId, isConsolidated: fieldId === "all" }), [fieldId]);
 return <BusinessFieldContext.Provider value={value}>{children}</BusinessFieldContext.Provider>;
}
export const useBusinessField = () => useContext(BusinessFieldContext);
