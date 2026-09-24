import { describe, expect, it } from "vitest";
import { itemsForWorkspace, normalizeStockItems, type StockItem } from "./operationsData";

const items: StockItem[] = [
  { id: "solar-1", name: "Panel", category: "Solar", businessField: "solar", company: "SS Global", warehouse: "Colombo Central", quantity: 10, safety: 2, unit: "units", serials: [], value: 100 },
  { id: "irrigation-1", name: "Pipe", category: "Pipes", businessField: "irrigation", company: "SS Global", warehouse: "Colombo Central", quantity: 10, safety: 2, unit: "meters", serials: [], value: 100 },
  { id: "steel-1", name: "Angle bar", category: "Steel", businessField: "steel", company: "SS Global", warehouse: "Colombo Central", quantity: 10, safety: 2, unit: "feet", serials: [], value: 100 },
  { id: "furniture-1", name: "Chair frame", category: "Furniture", businessField: "furniture", company: "SS Global", warehouse: "Colombo Central", quantity: 10, safety: 2, unit: "units", serials: [], value: 100 },
];

describe("workspace-specific inventory selection", () => {
  it("shows only Solar Energy items in Solar scope", () => {
    expect(itemsForWorkspace(items, "solar").map((item) => item.id)).toEqual(["solar-1"]);
  });

  it("keeps each supported workspace isolated and allows consolidated scope", () => {
    expect(itemsForWorkspace(items, "irrigation").map((item) => item.id)).toEqual(["irrigation-1"]);
    expect(itemsForWorkspace(items, "steel").map((item) => item.id)).toEqual(["steel-1"]);
    expect(itemsForWorkspace(items, "furniture").map((item) => item.id)).toEqual(["furniture-1"]);
    expect(itemsForWorkspace(items, "all")).toHaveLength(4);
  });

  it("normalizes invalid legacy workspace tags to Solar Energy", () => {
    const legacy = [{ ...items[0], businessField: "legacy" as StockItem["businessField"] }];
    expect(normalizeStockItems(legacy)[0].businessField).toBe("solar");
  });
});

