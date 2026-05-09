import { describe, expect, it } from "vitest";
import {
  normalizeCaptureMethod,
  normalizeConfidence,
  normalizeDecisionRole,
  normalizeProviderCitation,
  normalizeSourceType,
  packetFromProviderResponse
} from "@/lib/source-normalizers";

describe("source normalization", () => {
  it("normalizes provider citations into Kiro citation shape", () => {
    const citation = normalizeProviderCitation(
      "nia",
      {
        source_id: "src_1",
        type: "github",
        name: "PR #89",
        summary: "Retry fix used exponential backoff.",
        label: "Convention",
        decision_id: "decision-retry-policy",
        thread_id: "thread-retry-policy-142",
        capture_method: "agent checkpoint",
        captured_at: 1778353200000,
        decision_role: "implemented"
      },
      0,
      true
    );

    expect(citation).toMatchObject({
      id: "src_1",
      sourceType: "github",
      title: "PR #89",
      confidence: "Convention",
      live: true,
      decisionId: "decision-retry-policy",
      threadId: "thread-retry-policy-142",
      captureMethod: "agent_checkpoint",
      capturedAt: 1778353200000,
      decisionRole: "implemented"
    });
  });

  it("builds packets from flexible provider response shapes", () => {
    const packet = packetFromProviderResponse({
      provider: "hyperspell",
      status: "connected",
      live: true,
      fallbackSummary: "fallback",
      response: {
        summary: "company memory",
        message_count: 12,
        emailsIndexed: 3,
        meetingsIndexed: 1,
        decisionsExtracted: 2,
        documents: [{ type: "slack", title: "Decision", text: "Use async workers." }]
      }
    });

    expect(packet.summary).toBe("company memory");
    expect(packet.counts.messages).toBe(12);
    expect(packet.counts.emails).toBe(3);
    expect(packet.counts.meetings).toBe(1);
    expect(packet.counts.decisions).toBe(2);
    expect(packet.citations).toHaveLength(1);
    expect(packet.citations[0]?.sourceType).toBe("slack");
  });

  it("normalizes source types and confidence labels conservatively", () => {
    expect(normalizeSourceType("pull_request")).toBe("pr");
    expect(normalizeSourceType("Codebase search")).toBe("nia");
    expect(normalizeSourceType("Salesforce CRM")).toBe("crm");
    expect(normalizeSourceType("Gmail thread")).toBe("gmail");
    expect(normalizeSourceType("Granola meeting")).toBe("meeting");
    expect(normalizeSourceType("Drive doc")).toBe("drive");
    expect(normalizeSourceType("call transcript")).toBe("transcript");
    expect(normalizeConfidence("old stale thread")).toBe("Stale");
    expect(normalizeConfidence(undefined)).toBe("Decided");
    expect(normalizeCaptureMethod("manual decision note")).toBe("manual_note");
    expect(normalizeDecisionRole("final decision")).toBe("finalized");
  });
});
