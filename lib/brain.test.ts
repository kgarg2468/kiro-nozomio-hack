import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchConvexDemoState } from "@/lib/convex-dashboard";
import { getFixtureBrainSources, getFixtureDemoState } from "@/lib/demo-data";
import { assembleBrainForEmployee, demoMode, liveSource } from "@/lib/brain";
import { fetchHyperspellBrainPacket } from "@/lib/hyperspell";
import { fetchNiaBrainPacket } from "@/lib/nia";

vi.mock("@/lib/convex-dashboard", () => ({
  fetchConvexDemoState: vi.fn()
}));

vi.mock("@/lib/hyperspell", () => ({
  fetchHyperspellBrainPacket: vi.fn()
}));

vi.mock("@/lib/nia", () => ({
  fetchNiaBrainPacket: vi.fn()
}));

const mockedFetchConvexDemoState = vi.mocked(fetchConvexDemoState);
const mockedFetchHyperspell = vi.mocked(fetchHyperspellBrainPacket);
const mockedFetchNia = vi.mocked(fetchNiaBrainPacket);

describe("brain assembly fallback", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("defaults to fixture mode", () => {
    vi.stubEnv("KIRO_DEMO_MODE", "");
    expect(demoMode()).toBe("fixture");
  });

  it("normalizes explicit mode query values before falling back to env/default", () => {
    vi.stubEnv("KIRO_DEMO_MODE", "hybrid");

    expect(demoMode("live")).toBe("live");
    expect(demoMode("fixture")).toBe("fixture");
    expect(demoMode(["live"])).toBe("live");
    expect(demoMode("invalid")).toBe("hybrid");

    vi.stubEnv("KIRO_DEMO_MODE", "");
    expect(demoMode("invalid")).toBe("fixture");
  });

  it("normalizes live source values", () => {
    vi.stubEnv("KIRO_LIVE_SOURCE", "convex");

    expect(liveSource()).toBe("convex");
    expect(liveSource("providers")).toBe("providers");
    expect(liveSource("convex")).toBe("convex");
    expect(liveSource(["convex"])).toBe("convex");
  });

  it("returns fixture data without calling providers in fixture mode", async () => {
    vi.stubEnv("KIRO_DEMO_MODE", "fixture");
    const state = await assembleBrainForEmployee("sam");

    expect(state.profile.employeeId).toBe("sam");
    expect(state.brainSources.some((packet) => packet.provider === "hyperspell")).toBe(true);
    expect(state.brainSources.some((packet) => packet.provider === "nia")).toBe(true);
    expect(mockedFetchHyperspell).not.toHaveBeenCalled();
    expect(mockedFetchNia).not.toHaveBeenCalled();
  });

  it("calls live providers and preserves mixed live/fallback packets", async () => {
    const fallbackNia = getFixtureBrainSources().find((packet) => packet.provider === "nia");
    if (!fallbackNia) throw new Error("Fixture Nia packet missing");

    mockedFetchHyperspell.mockResolvedValueOnce({
      provider: "hyperspell",
      status: "connected",
      counts: { messages: 12, docs: 3, prs: 2, decisions: 1 },
      summary: "Live company memory from Hyperspell.",
      citations: [
        {
          id: "live-slack-decision",
          sourceType: "slack",
          title: "Slack #engineering live decision",
          snippet: "Use bounded async retry backoff.",
          confidence: "Decided",
          live: true
        }
      ]
    });
    mockedFetchNia.mockResolvedValueOnce({ ...fallbackNia, status: "fallback" });

    const state = await assembleBrainForEmployee("sam", "live");

    expect(state.mode).toBe("live");
    expect(mockedFetchHyperspell).toHaveBeenCalledWith("sam");
    expect(mockedFetchNia).toHaveBeenCalledWith("sam");
    expect(state.brainSources.find((packet) => packet.provider === "hyperspell")?.status).toBe(
      "connected"
    );
    expect(state.brainSources.find((packet) => packet.provider === "nia")?.status).toBe(
      "fallback"
    );
    expect(state.citations.some((citation) => citation.id === "live-slack-decision")).toBe(true);
    expect(
      state.citations
        .filter((citation) => citation.sourceType === "nia")
        .every((citation) => citation.live === false)
    ).toBe(true);
    expect(new Set(state.citations.map((citation) => citation.id)).size).toBe(
      state.citations.length
    );
  });

  it("uses Convex live state when requested", async () => {
    const fallbackNia = getFixtureBrainSources().find((packet) => packet.provider === "nia");
    if (!fallbackNia) throw new Error("Fixture Nia packet missing");

    mockedFetchConvexDemoState.mockResolvedValueOnce({
      ...getFixtureDemoState(),
      mode: "live",
      brainSources: [{ ...fallbackNia, status: "connected" }],
      citations: fallbackNia.citations.map((citation) => ({ ...citation, live: true }))
    });

    const state = await assembleBrainForEmployee("sam", "live", "convex");

    expect(mockedFetchConvexDemoState).toHaveBeenCalled();
    expect(mockedFetchHyperspell).not.toHaveBeenCalled();
    expect(mockedFetchNia).not.toHaveBeenCalled();
    expect(state.mode).toBe("live");
    expect(state.brainSources[0]?.status).toBe("connected");
  });
});
