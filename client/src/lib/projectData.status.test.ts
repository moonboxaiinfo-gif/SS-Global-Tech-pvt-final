import { describe, expect, it } from "vitest";
import { initialProjects, projectStatuses } from "./projectData";

describe("project status workflow", () => {
  it("defines the exact allowed statuses in the required order", () => {
    expect(projectStatuses).toEqual(["Planning", "In Progress", "Completed", "On Hold"]);
  });

  it("keeps seeded projects within the allowed status set", () => {
    expect(initialProjects.every((project) => projectStatuses.includes(project.status))).toBe(true);
  });
});
