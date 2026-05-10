import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFixtureDemoState } from "@/lib/demo-data";

vi.mock("@/lib/convex-brain", () => ({
  readBrainSnapshot: vi.fn(async () => null),
  writeBrainSnapshot: vi.fn(async () => false)
}));

import { assembleBrainForEmployee, demoMode } from "@/lib/brain";
import { readBrainSnapshot, writeBrainSnapshot } from "@/lib/convex-brain";

const readBrainSnapshotMock = vi.mocked(readBrainSnapshot);
const writeBrainSnapshotMock = vi.mocked(writeBrainSnapshot);

describe("brain assembly fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readBrainSnapshotMock.mockResolvedValue(null);
    writeBrainSnapshotMock.mockResolvedValue(false);
  });

  it("defaults to fixture mode", () => {
    vi.stubEnv("KIRO_DEMO_MODE", "");
    expect(demoMode()).toBe("fixture");
  });

  it("returns fixture data without provider keys", async () => {
    vi.stubEnv("KIRO_DEMO_MODE", "fixture");
    const state = await assembleBrainForEmployee("sam");
    expect(state.profile.employeeId).toBe("sam");
    expect(state.brainSources.some((packet) => packet.provider === "hyperspell")).toBe(true);
    expect(state.brainSources.some((packet) => packet.provider === "nia")).toBe(true);
    expect(writeBrainSnapshotMock).toHaveBeenCalledWith("sam", state);
  });

  it("keeps hybrid mode alive with labeled provider fallbacks when keys are missing", async () => {
    vi.stubEnv("KIRO_DEMO_MODE", "hybrid");
    vi.stubEnv("NIA_API_KEY", "");
    vi.stubEnv("HYPERSPELL_API_KEY", "");
    vi.stubEnv("HYPERSPELL_USER_ID", "");

    const state = await assembleBrainForEmployee("sam");
    const citationIds = state.citations.map((citation) => citation.id);

    expect(state.mode).toBe("hybrid");
    expect(state.brainSources.find((packet) => packet.provider === "nia")?.status).toBe("fallback");
    expect(state.brainSources.find((packet) => packet.provider === "hyperspell")?.status).toBe(
      "fallback"
    );
    expect(new Set(citationIds).size).toBe(citationIds.length);
    expect(writeBrainSnapshotMock).toHaveBeenCalledWith("sam", state);
  });

  it("uses the last Convex brain snapshot when live providers fail", async () => {
    vi.stubEnv("KIRO_DEMO_MODE", "hybrid");
    vi.stubEnv("NIA_API_KEY", "");
    vi.stubEnv("HYPERSPELL_API_KEY", "");
    vi.stubEnv("HYPERSPELL_USER_ID", "");
    const cached = {
      ...getFixtureDemoState(),
      profile: { ...getFixtureDemoState().profile, employeeId: "cached-sam" }
    };
    readBrainSnapshotMock.mockResolvedValueOnce(cached);

    const state = await assembleBrainForEmployee("sam");

    expect(state.mode).toBe("hybrid");
    expect(state.profile.employeeId).toBe("cached-sam");
    expect(writeBrainSnapshotMock).not.toHaveBeenCalled();
  });
});
