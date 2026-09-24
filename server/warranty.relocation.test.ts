import { describe, expect, it } from "vitest";
import { warrantyMatches, warrantyStatusPair, type WarrantyRecord } from "@/lib/warrantyData";

const record: WarrantyRecord = {
 id: "w-1",
 projectId: "p-1",
 workspace: "solar",
 projectSource: "SS Global Direct",
 customerName: "Nadeesha Perera",
 customerPhone: "0771234567",
 itemName: "Solar Inverter",
 supplierName: "Lanka Solar Supplies",
 serialNumber: "INV-0091",
 supplierWarrantyExpiry: "2099-12-31",
 customerWarrantyExpiry: "2000-01-01",
 createdAt: "2026-08-25T00:00:00.000Z",
};

describe("SS Global Direct warranty overview", () => {
 it("matches serial, customer, phone, supplier, and item searches", () => {
  expect(warrantyMatches(record, "INV-0091")).toBe(true);
  expect(warrantyMatches(record, "nadeesha")).toBe(true);
  expect(warrantyMatches(record, "0771234567")).toBe(true);
  expect(warrantyMatches(record, "Lanka Solar")).toBe(true);
  expect(warrantyMatches(record, "nonexistent")).toBe(false);
 });

 it("resolves supplier and customer warranty statuses independently", () => {
  const statuses = warrantyStatusPair(record);
  expect(statuses.supplier).toBe("Active");
  expect(statuses.customer).toBe("Expired");
 });
});
