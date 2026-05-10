import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHyperspellBrainPacket } from "@/lib/hyperspell";

describe("fetchHyperspellBrainPacket", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("queries Hyperspell with only an API key configured", async () => {
    vi.stubEnv("HYPERSPELL_API_KEY", "test-key");
    vi.stubEnv("HYPERSPELL_USER_ID", "");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: "Live Hyperspell context",
        results: [{ id: "memory-1", title: "Decision note", snippet: "Use the retry guardrail." }]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const packet = await fetchHyperspellBrainPacket("sam");

    expect(packet.status).toBe("connected");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.hyperspell.com/memories/query");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      answer: true,
      effort: "medium",
      sources: ["vault", "notion"],
      options: { max_results: 8 }
    });
    expect(body.query).toContain("aayu22809/crackstack");
    expect(body.query).toContain("CLAUDE.original.md");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json"
    });
    expect(init.headers).not.toHaveProperty("X-As-User");
  });

  it("includes the user identity when configured", async () => {
    vi.stubEnv("HYPERSPELL_API_KEY", "test-key");
    vi.stubEnv("HYPERSPELL_USER_ID", "sandbox:person@example.com");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ id: "memory-1", title: "Decision note", snippet: "Use the retry guardrail." }]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchHyperspellBrainPacket("sam");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({
      "X-As-User": "sandbox:person@example.com"
    });
  });

  it("lets the target repository be configured", async () => {
    vi.stubEnv("HYPERSPELL_API_KEY", "test-key");
    vi.stubEnv("HYPERSPELL_TARGET_REPO", "aayu22809/other-repo");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        documents: [{ resource_id: "doc-1", source: "github", title: "Repo note" }]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchHyperspellBrainPacket("sam");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).query).toContain("aayu22809/other-repo");
  });

  it("returns an error packet when Hyperspell reports connection errors", async () => {
    vi.stubEnv("HYPERSPELL_API_KEY", "test-key");
    vi.stubEnv("HYPERSPELL_USER_ID", "sandbox:person@example.com");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        query_id: "query-1",
        errors: [
          {
            error: "ConnectionNotFound",
            message: "User hasn't connected their slack account yet"
          }
        ],
        documents: []
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const packet = await fetchHyperspellBrainPacket("sam");

    expect(packet.status).toBe("error");
  });

  it("keeps successful empty searches on the fixture fallback", async () => {
    vi.stubEnv("HYPERSPELL_API_KEY", "test-key");
    vi.stubEnv("HYPERSPELL_USER_ID", "sandbox:person@example.com");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ query_id: "query-empty", documents: [] })
    });
    vi.stubGlobal("fetch", fetchMock);

    const packet = await fetchHyperspellBrainPacket("sam");

    expect(packet.status).toBe("fallback");
  });
});
