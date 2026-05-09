import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHyperspellBrainPacket } from "@/lib/hyperspell";
import { fetchNiaBrainPacket } from "@/lib/nia";

describe("provider fetch fallbacks", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does not call Hyperspell without required credentials", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const packet = await fetchHyperspellBrainPacket("sam");

    expect(fetch).not.toHaveBeenCalled();
    expect(packet.provider).toBe("hyperspell");
    expect(packet.status).toBe("fallback");
    expect(packet.citations.every((citation) => citation.live === false)).toBe(true);
  });

  it("returns a labeled Hyperspell fallback when the provider errors", async () => {
    vi.stubEnv("HYPERSPELL_API_KEY", "test-key");
    vi.stubEnv("HYPERSPELL_USER_ID", "test-user");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

    const packet = await fetchHyperspellBrainPacket("sam");

    expect(packet.provider).toBe("hyperspell");
    expect(packet.status).toBe("error");
    expect(packet.citations.every((citation) => citation.live === false)).toBe(true);
  });

  it("returns a labeled Nia fallback when the provider errors", async () => {
    vi.stubEnv("NIA_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

    const packet = await fetchNiaBrainPacket("sam");

    expect(packet.provider).toBe("nia");
    expect(packet.status).toBe("error");
    expect(packet.citations.every((citation) => citation.live === false)).toBe(true);
  });

  it("retries Nia without source filters when configured sources are unresolved", async () => {
    vi.stubEnv("NIA_API_KEY", "test-key");
    vi.stubEnv("NIA_REPOSITORIES", "missing/repo");
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: "No sources were successfully resolved."
          }),
          { status: 400 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            summary: "Nia context",
            reposIndexed: 1,
            results: [{ type: "repository", title: "Code convention", text: "Use tests." }]
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetch);

    const packet = await fetchNiaBrainPacket("sam");

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetch.mock.calls[0]?.[1]?.body as string).repositories).toEqual([
      "missing/repo"
    ]);
    expect(JSON.parse(fetch.mock.calls[1]?.[1]?.body as string).repositories).toEqual([]);
    expect(packet.provider).toBe("nia");
    expect(packet.status).toBe("connected");
    expect(packet.citations[0]?.live).toBe(true);
  });
});
