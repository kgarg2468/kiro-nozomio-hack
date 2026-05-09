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
});
