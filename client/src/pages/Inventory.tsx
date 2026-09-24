import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  ChevronRight,
  Download,
  FileText,
  PackageCheck,
  Plus,
  Search,
  Warehouse,
  X,
} from "lucide-react";
import {
  normalizeStockItems,
  operationsCompanies,
  stockItems,
  stockMovements,
  warehouses,
  moneyLkr,
  type StockField,
  type StockItem,
  type StockMovement,
} from "@/lib/operationsData";
import { mockCompanies } from "@/lib/hrData";
import { useBusinessField } from "@/contexts/BusinessFieldContext";
import FieldScopeBanner from "@/components/FieldScopeBanner";
import { toast } from "sonner";
import { insertErpRow, listErpRows, updateErpRow } from "@/lib/erpData";
import { downloadBrandedPdf, printBrandedDocument } from "@/lib/pdf";

/** Multi-field inventory: movements are the source of truth for stock in, stock out, and project allocation. */
export default function Inventory() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState("All companies");
  const [warehouse, setWarehouse] = useState("All warehouses");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [direction, setDirection] = useState<"Stock In" | "Stock Out">(
    "Stock Out"
  );
  const [quantity, setQuantity] = useState("1");
  const [project, setProject] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: "",
    businessField: "solar" as StockField,
    unit: "Units / PCS",
    unitCost: "",
    initialQuantity: "",
    safety: "",
  });
  const { fieldId } = useBusinessField();
  useEffect(() => {
    void (async () => {
      try {
        const rows = await listErpRows<any>(
          "inventory_items",
          "id,item_name,workspace,unit_of_measure,unit_cost,stock_quantity,low_stock_alert,warehouse"
        );
        const remoteItems = rows.map(row => ({
          id: row.id,
          name: row.item_name,
          category: "General stock",
          businessField: row.workspace,
          company: row.workspace,
          warehouse: row.warehouse || "Main warehouse",
          quantity: Number(row.stock_quantity) || 0,
          initialQuantity: Number(row.stock_quantity) || 0,
          safety: Number(row.low_stock_alert) || 0,
          lowStockAlertLevel: Number(row.low_stock_alert) || 0,
          unit: row.unit_of_measure || "Units/PCS",
          serials: [],
          unitCostPrice: Number(row.unit_cost) || 0,
          value:
            (Number(row.stock_quantity) || 0) * (Number(row.unit_cost) || 0),
        }));
        setItems(remoteItems);
        setSelectedId(remoteItems[0]?.id ?? "");
        const movementRows = await listErpRows<any>(
          "inventory_movements",
          "id,item_id,movement_type,quantity,reference,created_at"
        );
        setMovements(
          movementRows.map(row => ({
            id: row.id,
            stockId: row.item_id,
            direction: row.movement_type === "in" ? "Stock In" : "Stock Out",
            quantity: Number(row.quantity) || 0,
            date: String(row.created_at).slice(0, 10),
            note: row.reference || "Inventory movement",
          }))
        );
      } catch (cause) {
        toast.error(
          cause instanceof Error
            ? cause.message
            : "Inventory could not be loaded from Supabase."
        );
        setItems([]);
        setMovements([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  useEffect(() => {
    if (selectedId && !items.some(item => item.id === selectedId))
      setSelectedId(items[0]?.id ?? "");
  }, [items, selectedId]);
  const visible = useMemo(
    () =>
      items.filter(
        item =>
          (fieldId === "all" || item.businessField === fieldId) &&
          (company === "All companies" || item.company === company) &&
          (warehouse === "All warehouses" || item.warehouse === warehouse) &&
          item.name.toLowerCase().includes(search.toLowerCase())
      ),
    [items, fieldId, company, warehouse, search]
  );
  const low = visible.filter(item => item.quantity < item.safety);
  const totalValue = visible.reduce((sum, item) => sum + item.value, 0);
  const selected = items.find(item => item.id === selectedId) ?? items[0];
  const inventoryPdf = () => ({
    title: "Inventory Report",
    documentNo: `INV-${new Date().toISOString().slice(0, 10)}`,
    date: new Date().toISOString().slice(0, 10),
    subtitle: "Filtered stock valuation and replenishment report",
    summaries: [
      { label: "Items tracked", value: String(visible.length) },
      {
        label: "Stock value",
        value: moneyLkr(totalValue),
        tone: "blue" as const,
      },
      {
        label: "Below safety",
        value: String(low.length),
        tone: low.length ? ("rose" as const) : ("green" as const),
      },
    ],
    columns: [
      { label: "Item", width: 64 },
      { label: "Workspace", width: 42 },
      { label: "Available", width: 25, align: "right" as const },
      { label: "Safety", width: 22, align: "right" as const },
      { label: "Value", width: 41, align: "right" as const },
    ],
    rows: visible.map(item => [
      item.name,
      item.businessField,
      `${item.quantity} ${item.unit}`,
      item.safety,
      moneyLkr(item.value),
    ]),
    terms: [
      low.length
        ? `Replenishment required for: ${low.map(item => item.name).join(", ")}`
        : "All visible stock positions are above safety thresholds.",
      "Inventory values are calculated from Supabase operational stock records.",
    ],
  });
  const downloadInventoryPdf = () => {
    downloadBrandedPdf(inventoryPdf(), "ss-global-inventory-report.pdf");
    toast.success("Branded inventory report downloaded.");
  };
  const printInventoryPdf = () => {
    printBrandedDocument(inventoryPdf());
    toast.success("Inventory report opened for printing.");
  };
  const saveItem = async (event: FormEvent) => {
    event.preventDefault();
    const initialQuantity = Number(itemForm.initialQuantity);
    const unitCost = Number(itemForm.unitCost);
    const safety = Number(itemForm.safety);
    if (!itemForm.name.trim() || !unitCost || initialQuantity < 0 || safety < 0)
      return toast.error(
        "Complete the item name, unit cost, opening stock, and alert level."
      );
    try {
      const row = await insertErpRow<any>(
        "inventory_items",
        {
          item_name: itemForm.name.trim(),
          workspace: itemForm.businessField,
          unit_of_measure: itemForm.unit.replace(" / ", "/"),
          unit_cost: unitCost,
          stock_quantity: initialQuantity,
          low_stock_alert: safety,
          warehouse: "Main warehouse",
        },
        "id,item_name,workspace,unit_of_measure,unit_cost,stock_quantity,low_stock_alert,warehouse"
      );
      const item: StockItem = {
        id: row.id,
        name: row.item_name,
        category: "General stock",
        businessField: row.workspace,
        company: row.workspace,
        warehouse: row.warehouse,
        quantity: Number(row.stock_quantity),
        initialQuantity: Number(row.stock_quantity),
        safety: Number(row.low_stock_alert),
        lowStockAlertLevel: Number(row.low_stock_alert),
        unit: row.unit_of_measure,
        serials: [],
        unitCostPrice: Number(row.unit_cost),
        value: Number(row.stock_quantity) * Number(row.unit_cost),
      };
      setItems(current => [item, ...current]);
      setSelectedId(item.id);
      setItemForm({
        name: "",
        businessField: fieldId === "all" ? "solar" : (fieldId as StockField),
        unit: "Units / PCS",
        unitCost: "",
        initialQuantity: "",
        safety: "",
      });
      setShowAddItem(false);
      toast.success(`${item.name} added to the Supabase stock ledger.`);
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Inventory item could not be saved to Supabase."
      );
    }
  };
  const recordMovement = async () => {
    const qty = Number(quantity);
    if (!selected || !qty || qty < 1)
      return toast.error("Enter a valid movement quantity.");
    if (direction === "Stock Out" && qty > selected.quantity)
      return toast.error("Stock out cannot exceed available quantity.");
    try {
      const nextQuantity =
        direction === "Stock In"
          ? selected.quantity + qty
          : selected.quantity - qty;
      const row = await updateErpRow<any>(
        "inventory_items",
        selected.id,
        { stock_quantity: nextQuantity },
        "id,item_name,workspace,unit_of_measure,unit_cost,stock_quantity,low_stock_alert,warehouse"
      );
      const movement = await insertErpRow<any>(
        "inventory_movements",
        {
          item_id: selected.id,
          movement_type: direction === "Stock In" ? "in" : "out",
          quantity: qty,
          reference:
            project ||
            (direction === "Stock In" ? "Supplier receipt" : "Warehouse issue"),
        },
        "id,item_id,movement_type,quantity,reference,created_at"
      );
      setItems(current =>
        current.map(item =>
          item.id === selected.id
            ? {
                ...item,
                quantity: Number(row.stock_quantity),
                value: Number(row.stock_quantity) * Number(row.unit_cost),
              }
            : item
        )
      );
      setMovements(current => [
        {
          id: movement.id,
          stockId: movement.item_id,
          direction,
          quantity: qty,
          project,
          date: String(movement.created_at).slice(0, 10),
          note: movement.reference,
        },
        ...current,
      ]);
      setQuantity("1");
      setProject("");
      toast.success(`${direction} saved to Supabase for ${selected.name}.`);
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Inventory movement could not be saved to Supabase."
      );
    }
  };
  return (
    <div className="relative overflow-hidden px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="relative mx-auto max-w-[1440px]">
        <div className="dashboard-enter mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow text-[#0052A5]">
              Operations index / multi-field inventory
            </p>
            <h2 className="mt-4 font-display text-[36px] font-extrabold tracking-[-0.06em] text-[#0F172A] sm:text-[46px]">
              Inventory control
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#627A88] ">
              Track raw materials and high-value equipment across Solar, Steel,
              Furniture, and Irrigation fields.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="h-11 rounded-xl border border-[#D9E2E7] bg-white px-3 text-xs font-bold text-[#476174] outline-none"
            >
              <option>{operationsCompanies[0]}</option>
              {operationsCompanies.slice(1).map(item => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              value={warehouse}
              onChange={e => setWarehouse(e.target.value)}
              className="h-11 rounded-xl border border-[#D9E2E7] bg-white px-3 text-xs font-bold text-[#476174] outline-none"
            >
              {warehouses.map(item => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <button
              onClick={downloadInventoryPdf}
              className="flex h-11 items-center gap-2 rounded-xl border border-[#BFD5E8] bg-white px-3 text-xs font-extrabold text-[#0052A5]"
            >
              <Download size={15} /> PDF
            </button>
            <button
              onClick={printInventoryPdf}
              className="flex h-11 items-center gap-2 rounded-xl border border-[#BFD5E8] bg-white px-3 text-xs font-extrabold text-[#0052A5]"
            >
              <FileText size={15} /> Print
            </button>
            <button
              onClick={() => setShowAddItem(true)}
              className="flex h-11 items-center gap-2 rounded-xl bg-[#0066CC] px-4 text-xs font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#0052A5]"
            >
              <Plus size={15} /> Add New Item
            </button>
          </div>
        </div>
        <FieldScopeBanner />
        {low.length > 0 && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#E6C98B] bg-[#FFFBF2] p-4 text-[#8A641D]">
            <AlertTriangle size={19} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-extrabold">
                {low.length} low-stock item{low.length > 1 ? "s" : ""} need
                attention
              </p>
              <p className="mt-1 text-xs font-semibold">
                {low.map(item => item.name).join(" · ")}
              </p>
            </div>
          </div>
        )}
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <Metric
            label="Items tracked"
            value={String(visible.length)}
            note="across active field scope"
            icon={Boxes}
          />
          <Metric
            label="Stock value"
            value={moneyLkr(totalValue)}
            note="current inventory value"
            icon={PackageCheck}
          />
          <Metric
            label="Below safety"
            value={String(low.length)}
            note={
              low.length ? "replenishment required" : "all thresholds healthy"
            }
            icon={AlertTriangle}
          />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1fr_.42fr]">
          <section className="atlas-panel overflow-hidden">
            <div className="flex flex-col justify-between gap-4 border-b border-[#E2E9ED] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
              <div>
                <p className="eyebrow">Warehouse ledger</p>
                <h3 className="mt-2 font-display text-xl font-extrabold text-[#19364D] ">
                  Stock positions{" "}
                  <span className="text-sm font-semibold text-[#8CA0AB]">
                    · {visible.length} records
                  </span>
                </h3>
              </div>
              <label className="relative block w-full sm:w-72">
                <Search
                  size={15}
                  className="absolute left-3 top-3 text-[#8CA0AB]"
                />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search inventory"
                  className="h-10 w-full rounded-lg border border-[#D9E2E7] bg-[#F7FAFB] pl-9 pr-3 text-xs font-semibold outline-none focus:border-[#0066CC]"
                />
              </label>
            </div>
            <div className="grid gap-3 p-4 sm:p-6 md:grid-cols-2">
              {visible.map(item => {
                const isLow = item.quantity < item.safety;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`group rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-1 hover:border-[#0066CC] ${selectedId === item.id ? "border-[#0066CC] bg-[#EAF3F8] " : "border-[#E2E9ED] bg-white "}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`grid h-10 w-10 place-items-center rounded-xl ${isLow ? "bg-[#FFF6E2] text-[#9A6A13]" : "bg-[#EAF3F8] text-[#0052A5]"}`}
                      >
                        <Boxes size={18} />
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${isLow ? "bg-[#FBEFEB] text-[#A35749]" : "bg-[#EDF6EF] text-[#4D775D]"}`}
                      >
                        {isLow ? "Low stock" : item.businessField}
                      </span>
                    </div>
                    <h4 className="mt-5 text-sm font-extrabold text-[#19364D] ">
                      {item.name}
                    </h4>
                    <p className="mt-1 text-[11px] font-semibold text-[#78909D]">
                      {item.category} · {item.company}
                    </p>
                    <div className="mt-5 flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#8CA0AB]">
                          Available
                        </p>
                        <p className="mt-1 font-display text-2xl font-extrabold text-[#10263D] ">
                          {item.quantity}{" "}
                          <span className="text-xs font-bold text-[#78909D]">
                            {item.unit}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#8CA0AB]">
                          Safety
                        </p>
                        <p className="mt-1 text-sm font-extrabold text-[#19364D] ">
                          {item.safety}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#E8EEF1]">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${isLow ? "bg-[#C57B67]" : "bg-[#0066CC]"}`}
                        style={{
                          width: `${Math.min(100, (item.quantity / Math.max(item.safety * 2, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-[#78909D]">
                      <span className="flex items-center gap-1">
                        <Warehouse size={12} />
                        {item.warehouse}
                      </span>
                      <span>{moneyLkr(item.value)}</span>
                    </div>
                    {item.serials.length > 0 && (
                      <div className="mt-4 border-t border-[#E2E9ED] pt-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#8CA0AB]">
                          Serial log
                        </p>
                        <p className="mt-1 truncate text-[11px] font-semibold text-[#34647F]">
                          {item.serials.join(" · ")}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
          <aside className="space-y-6">
            <section className="atlas-panel p-5">
              <p className="eyebrow">Record movement</p>
              <h3 className="mt-2 font-display text-xl font-extrabold text-[#0F172A] ">
                {selected?.name}
              </h3>
              <div className="mt-5 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDirection("Stock In")}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-extrabold ${direction === "Stock In" ? "bg-[#0066CC] text-white" : "bg-[#F1F5F7] text-[#627A88]"}`}
                  >
                    <ArrowDownToLine size={14} /> Stock In
                  </button>
                  <button
                    onClick={() => setDirection("Stock Out")}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-extrabold ${direction === "Stock Out" ? "bg-[#A35749] text-white" : "bg-[#F1F5F7] text-[#627A88]"}`}
                  >
                    <ArrowUpFromLine size={14} /> Stock Out
                  </button>
                </div>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="field"
                  placeholder="Quantity"
                />
                <input
                  value={project}
                  onChange={e => setProject(e.target.value)}
                  className="field"
                  placeholder="Project allocation (optional)"
                />
                <button
                  onClick={recordMovement}
                  className="w-full rounded-xl bg-[#0F172A] px-4 py-3 text-xs font-extrabold text-white transition hover:bg-[#0052A5]"
                >
                  Save movement
                </button>
              </div>
            </section>
            <section className="atlas-panel overflow-hidden">
              <div className="border-b border-[#E2E9ED] px-5 py-4">
                <p className="eyebrow">Recent movement</p>
              </div>
              <div className="divide-y divide-[#E2E9ED]">
                {movements.slice(0, 5).map(movement => (
                  <div key={movement.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-extrabold text-[#19364D] ">
                        {movement.direction} · {movement.quantity}
                      </p>
                      <p className="text-[10px] font-semibold text-[#6B7280]">
                        {movement.date}
                      </p>
                    </div>
                    <p className="mt-1 text-[10px] font-semibold text-[#78909D]">
                      {movement.project ?? movement.note}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
        {showAddItem && (
          <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#0F172A]/50 p-5 backdrop-blur-sm">
            <form
              onSubmit={saveItem}
              className="my-8 w-full max-w-2xl rounded-2xl border border-[#D9E2E7] bg-white p-6 shadow-2xl "
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow">Inventory / stock master</p>
                  <h3 className="mt-2 font-display text-2xl font-extrabold text-[#0F172A] ">
                    Add new item
                  </h3>
                  <p className="mt-2 text-xs font-semibold text-[#627A88]">
                    Create an opening position for the selected Workspace and
                    set the threshold that should trigger replenishment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddItem(false)}
                  className="rounded-lg p-2 text-[#78909D] transition hover:bg-[#F1F5F7]"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="field-label">Item name</span>
                  <input
                    required
                    value={itemForm.name}
                    onChange={e =>
                      setItemForm({ ...itemForm, name: e.target.value })
                    }
                    placeholder="e.g. Solar Panel 550W"
                    className="field-input"
                  />
                </label>
                <label className="block">
                  <span className="field-label">Assigned Workspace</span>
                  <select
                    value={itemForm.businessField}
                    onChange={e =>
                      setItemForm({
                        ...itemForm,
                        businessField: e.target.value as StockField,
                      })
                    }
                    className="field-input"
                  >
                    {mockCompanies.map(workspace => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="field-label">Unit of Measure</span>
                  <select
                    value={itemForm.unit}
                    onChange={e =>
                      setItemForm({ ...itemForm, unit: e.target.value })
                    }
                    className="field-input"
                  >
                    {[
                      "Units / PCS",
                      "Meters",
                      "Feet",
                      "KG",
                      "Liters",
                      "Boxes",
                    ].map(unit => (
                      <option key={unit}>{unit}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="field-label">Unit Cost Price (LKR)</span>
                  <input
                    required
                    min="0"
                    type="number"
                    value={itemForm.unitCost}
                    onChange={e =>
                      setItemForm({ ...itemForm, unitCost: e.target.value })
                    }
                    placeholder="e.g. 125000"
                    className="field-input"
                  />
                </label>
                <label className="block">
                  <span className="field-label">Initial Stock Quantity</span>
                  <input
                    required
                    min="0"
                    type="number"
                    value={itemForm.initialQuantity}
                    onChange={e =>
                      setItemForm({
                        ...itemForm,
                        initialQuantity: e.target.value,
                      })
                    }
                    placeholder="e.g. 25"
                    className="field-input"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="field-label">Low-Stock Alert Level</span>
                  <input
                    required
                    min="0"
                    type="number"
                    value={itemForm.safety}
                    onChange={e =>
                      setItemForm({ ...itemForm, safety: e.target.value })
                    }
                    placeholder="e.g. 5"
                    className="field-input"
                  />
                  <span className="mt-1 block text-[11px] font-semibold text-[#8CA0AB]">
                    A low-stock tag appears whenever available quantity falls
                    below this threshold.
                  </span>
                </label>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddItem(false)}
                  className="rounded-xl border border-[#D9E2E7] px-4 py-3 text-xs font-extrabold text-[#627A88]"
                >
                  Cancel
                </button>
                <button className="rounded-xl bg-[#0066CC] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#0052A5]">
                  Save & Add to Stock Ledger
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
function Metric({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Boxes;
}) {
  return (
    <article className="atlas-panel rounded-2xl p-5 shadow-[0_10px_24px_rgba(16,38,61,.04)]">
      <div className="flex items-start justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#EAF3F8] text-[#0052A5]">
          <Icon size={16} />
        </span>
        <ChevronRight size={16} className="text-[#A9BBC6]" />
      </div>
      <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#78909D]">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-extrabold text-[#10263D] ">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-semibold text-[#8CA0AB]">{note}</p>
    </article>
  );
}
