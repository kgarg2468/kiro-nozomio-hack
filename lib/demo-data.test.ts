import { describe, expect, it } from "vitest";
import { getFixtureDemoState } from "@/lib/demo-data";

describe("fixture demo decision capture", () => {
  it("includes a cross-source retry policy decision chain", () => {
    const state = getFixtureDemoState();
    const decision = state.decisions.find((item) => item.id === "decision-retry-policy");

    expect(decision).toBeDefined();
    expect(decision?.status).toBe("decided");
    expect(decision?.sourceCitationIds).toEqual([
      "crm-customer-handoff",
      "gmail-customer-complaint",
      "slack-async-decision",
      "meeting-retry-finalized",
      "notion-notifications-v2",
      "pr-89-pattern",
      "nia-tests-path"
    ]);

    const citationTypes = new Set(
      state.citations
        .filter((citation) => decision?.sourceCitationIds.includes(citation.id))
        .map((citation) => citation.sourceType)
    );

    expect(citationTypes).toEqual(
      new Set(["crm", "gmail", "slack", "meeting", "notion", "pr", "nia"])
    );
  });

  it("labels fixture-only capture sources and keeps PR readiness grounded", () => {
    const state = getFixtureDemoState();

    expect(state.captureCoverage.find((item) => item.label === "Gmail / CRM")?.status).toBe(
      "fixture"
    );
    expect(
      state.captureCoverage.find((item) => item.label === "Meeting transcript")?.status
    ).toBe("fixture");
    expect(state.captureCoverage.find((item) => item.label === "SMS / hallway")?.status).toBe(
      "missing"
    );
    expect(state.readiness.citationIds).toContain("meeting-retry-finalized");
    expect(state.contextEvents[0]?.body).toContain("outside the capture window");
  });
});
