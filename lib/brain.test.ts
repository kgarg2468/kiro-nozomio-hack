import { describe, expect, it, vi } from "vitest";
import { assembleBrainForEmployee, demoMode } from "@/lib/brain";

describe("brain assembly fallback", () => {
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
  });

  it("keeps hybrid mode alive with labeled provider fallbacks when keys are missing", async () => {
    vi.stubEnv("KIRO_DEMO_MODE", "hybrid");
    vi.stubEnv("NIA_API_KEY", "");
    vi.stubEnv("HYPERSPELL_API_KEY", "");
    vi.stubEnv("HYPERSPELL_USER_ID", "");

    const state = await assembleBrainForEmployee("sam");
    expect(state.mode).toBe("hybrid");
    expect(state.brainSources.find((packet) => packet.provider === "nia")?.status).toBe("fallback");
    expect(state.brainSources.find((packet) => packet.provider === "hyperspell")?.status).toBe(
      "fallback"
    );
  });
});
