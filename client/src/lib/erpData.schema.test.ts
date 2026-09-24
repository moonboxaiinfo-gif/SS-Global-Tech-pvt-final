import { describe, expect, it } from "vitest";
import { currentErpTables } from "./erpData";

describe("current ERP Supabase table registry", () => {
  it("contains the current schema tables used by repaired CRUD flows", () => {
    expect(currentErpTables).toEqual(expect.arrayContaining([
      "employees",
      "projects",
      "project_expenses",
      "bank_transactions",
    ]));
  });

  it("does not omit the legacy compatibility entities used by local-first modules", () => {
    expect(currentErpTables).toEqual(expect.arrayContaining([
      "inventory_items",
      "item_warranties",
      "payroll_batches",
      "payroll_batch_entries",
    ]));
  });
});
