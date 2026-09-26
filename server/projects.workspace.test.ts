import { describe, expect, it } from "vitest";
import { businessFields, workspaceOptions } from "../client/src/contexts/BusinessFieldContext";
import { balanceDue, initialProjects } from "../client/src/lib/projectData";

describe("Workspace architecture", () => {
  it("exposes exactly the four prompt-defined workspaces in Solar-first order", () => {
    expect(workspaceOptions.map((workspace) => workspace.label)).toEqual(["Solar Energy", "Irrigation", "Iron Work", "Furniture"]);
    expect(workspaceOptions.map((workspace) => workspace.id)).toEqual(["solar", "irrigation", "steel", "furniture"]);
    expect(businessFields.find((workspace) => workspace.id === "solar")?.label).toBe("Solar Energy");
  });
});

describe("Solar project company drill-down data", () => {
  it("supports an empty solar project list without inventing demo data", () => {
    expect(initialProjects).toEqual([]);
    expect(initialProjects.filter((project) => project.businessField === "solar")).toEqual([]);
  });

  it("keeps customer balances derived from project receipts for legitimate partner references", () => {
    const project = {
      id: "hayleys-solar",
      partner: "Hayleys",
      businessField: "solar",
      contractValue: 120000,
      advanceReceived: 40000,
      balancePayments: [{ id: "p1", projectId: "hayleys-solar", amount: 20000, date: "2026-01-01", method: "Bank", note: "Installment" }],
    } as Parameters<typeof balanceDue>[0];

    expect(project.partner).toBe("Hayleys");
    expect(balanceDue(project)).toBe(project.contractValue - project.advanceReceived - project.balancePayments.reduce((sum, payment) => sum + payment.amount, 0));
  });
});
