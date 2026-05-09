import "server-only";

import { getFixtureBrainSources } from "@/lib/demo-data";
import { packetFromProviderResponse } from "@/lib/source-normalizers";
import type { BrainSourcePacket } from "@/lib/types";

const HYPERSPELL_BASE_URL =
  process.env.HYPERSPELL_BASE_URL ?? "https://api.hyperspell.com";

export async function fetchHyperspellBrainPacket(
  employeeId: string
): Promise<BrainSourcePacket> {
  const key = process.env.HYPERSPELL_API_KEY;
  const userId = process.env.HYPERSPELL_USER_ID;
  if (!key) return fixtureHyperspellPacket("fallback");

  try {
    const query = new URLSearchParams({
      q: `Onboarding context for ${employeeId}: Slack decisions, Notion docs, GitHub PR history, owners, guardrails`
    });
    if (userId) query.set("user_id", userId);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    };
    if (userId) headers["X-As-User"] = userId;

    const res = await fetch(`${HYPERSPELL_BASE_URL}/v1/search?${query}`, {
      method: "GET",
      headers,
      cache: "no-store"
    });

    if (!res.ok) return fixtureHyperspellPacket("error");

    const packet = packetFromProviderResponse({
      provider: "hyperspell",
      status: "connected",
      live: true,
      response: await res.json(),
      fallbackSummary: "Hyperspell returned cross-source company memory."
    });
    return packet.citations.length ? packet : fixtureHyperspellPacket("fallback");
  } catch {
    return fixtureHyperspellPacket("error");
  }
}

function fixtureHyperspellPacket(status: BrainSourcePacket["status"]) {
  const packet = getFixtureBrainSources().find((item) => item.provider === "hyperspell");
  if (!packet) throw new Error("Fixture Hyperspell packet missing");
  return { ...packet, status };
}
