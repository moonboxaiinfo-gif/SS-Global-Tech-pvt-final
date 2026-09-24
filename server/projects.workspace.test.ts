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
  it("includes Hayleys and Deep Tech Solar partner projects", () => {
    const partners = initialProjects.filter((project) => project.businessField === "solar").map((project) => project.partner);
    expect(partners).toEqual(expect.arrayContaining(["Hayleys", "Deep Tech"]));
  });

  it("keeps customer balances derived from project receipts", () => {
    const project = initialProjects.find((item) => item.partner === "Hayleys");
    expect(project).toBeDefined();
    expect(balanceDue(project!)).toBe(project!.contractValue - project!.advanceReceived - project!.balancePayments.reduce((sum, payment) => sum + payment.amount, 0));
  });
});
