import { describe, expect, it } from "vitest";
import { getFixtureDemoState } from "@/lib/demo-data";
import { officeEntitiesForStage } from "@/lib/office-entities";

describe("officeEntitiesForStage", () => {
  it("maps Sam across onboarding demo stages", () => {
    const state = getFixtureDemoState();

    expect(officeEntitiesForStage(state, "assemble").find((e) => e.id === "sam")).toMatchObject({
      coverage: state.profile.sourceCoverage,
      progress: state.task.progress,
      risk: state.profile.contextRiskScore
    });
    expect(officeEntitiesForStage(state, "assemble").find((e) => e.id === "sam")?.status).toBe(
      "onboarding"
    );
    expect(officeEntitiesForStage(state, "task").find((e) => e.id === "sam")?.status).toBe(
      "coding"
    );
    expect(officeEntitiesForStage(state, "guardrail").find((e) => e.id === "sam")?.status).toBe(
      "blocked"
    );
    expect(officeEntitiesForStage(state, "readiness").find((e) => e.id === "sam")?.status).toBe(
      "ready"
    );
  });

  it("maps agent sessions into stable agent entities", () => {
    const state = getFixtureDemoState();
    const entities = officeEntitiesForStage(state, "task").filter((entity) =>
      entity.id.startsWith("agent-")
    );

    expect(entities).toHaveLength(2);
    expect(entities.map((entity) => entity.kind)).toEqual(["agent", "agent"]);
    expect(entities.map((entity) => entity.paletteIdx)).toEqual([3, 4]);
    expect(entities.map((entity) => entity.busy)).toEqual([true, true]);
  });
});
