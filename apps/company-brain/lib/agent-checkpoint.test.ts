import { describe, expect, it } from "vitest";
import { evaluateAgentCheckpoint, recordAgentPlan } from "@/lib/agent-checkpoint";
import { getFixtureDemoState } from "@/lib/demo-data";

describe("decision-aware agent checkpoints", () => {
  it("pauses risky agent work and returns the relevant decision trail", () => {
    const state = getFixtureDemoState();
    const result = evaluateAgentCheckpoint({
      sessionId: "agent-codex",
      plan: "Fix issue #142 in notifications/webhook_handler.py",
      changedFiles: ["notifications/webhook_handler.py"],
      proposedChange: "Use time.sleep between retry attempts.",
      state
    });

    expect(result.pause).toBe(true);
    expect(result.risk).toBe("medium");
    expect(result.guardrails.map((guardrail) => guardrail.id)).toContain("guard-async-sleep");
    expect(result.decisionTrails[0]).toMatchObject({
      decisionId: "decision-retry-policy",
      title: "Retry policy decision"
    });
    expect(result.decisionTrails[0]?.lifecycle.map((item) => item.role)).toEqual([
      "originated",
      "debated",
      "finalized",
      "codified",
      "implemented"
    ]);
    expect(result.citations.map((citation) => citation.id)).toContain("meeting-retry-finalized");
  });

  it("reports capture gaps instead of pretending full certainty", () => {
    const result = evaluateAgentCheckpoint({
      sessionId: "agent-codex",
      plan: "Add a small notification retry test.",
      changedFiles: ["tests/notifications/test_retry_backoff.py"],
      state: getFixtureDemoState()
    });

    expect(result.pause).toBe(false);
    expect(result.captureGaps.map((gap) => gap.label)).toContain("SMS / hallway");
    expect(result.warnings.join(" ")).toContain("outside the capture window");
  });

  it("records a plan on an existing agent session without mutating fixture state", () => {
    const state = getFixtureDemoState();
    const next = recordAgentPlan(state, {
      sessionId: "agent-codex",
      plan: "Use time.sleep between retry attempts."
    });

    expect(next).not.toBe(state);
    expect(next.agents.find((agent) => agent.id === "agent-codex")?.currentPlan).toBe(
      "Use time.sleep between retry attempts."
    );
    expect(next.agents.find((agent) => agent.id === "agent-codex")?.status).toBe("working");
    expect(state.agents.find((agent) => agent.id === "agent-codex")?.currentPlan).toBe(
      "Patch retry wait to bounded asyncio backoff and add coverage."
    );
  });

  it("creates a missing agent session with safe defaults", () => {
    const state = getFixtureDemoState();
    const next = recordAgentPlan(state, {
      sessionId: "agent-new",
      plan: "Inspect notification retry behavior."
    });
    const created = next.agents.find((agent) => agent.id === "agent-new");

    expect(created).toMatchObject({
      id: "agent-new",
      kind: "codex",
      displayName: "agent-new",
      ownerEmployeeId: "sam",
      currentPlan: "Inspect notification retry behavior.",
      status: "working"
    });
    expect(state.agents.find((agent) => agent.id === "agent-new")).toBeUndefined();
  });

  it("falls back to the recorded session plan when checkpoint has no explicit plan", () => {
    const state = recordAgentPlan(getFixtureDemoState(), {
      sessionId: "agent-codex",
      plan: "Use time.sleep between retry attempts."
    });
    const result = evaluateAgentCheckpoint({
      sessionId: "agent-codex",
      changedFiles: ["notifications/webhook_handler.py"],
      state
    });

    expect(result.pause).toBe(true);
    expect(result.guardrails.map((guardrail) => guardrail.id)).toContain("guard-async-sleep");
  });

  it("lets an explicit checkpoint plan override a risky recorded plan", () => {
    const state = recordAgentPlan(getFixtureDemoState(), {
      sessionId: "agent-codex",
      plan: "Use time.sleep between retry attempts."
    });
    const result = evaluateAgentCheckpoint({
      sessionId: "agent-codex",
      plan: "Add a small notification retry test.",
      changedFiles: ["tests/notifications/test_retry_backoff.py"],
      state
    });

    expect(result.pause).toBe(false);
    expect(result.guardrails).toEqual([]);
  });
});
