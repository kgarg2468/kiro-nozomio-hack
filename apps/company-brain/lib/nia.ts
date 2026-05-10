import "server-only";

import { getFixtureBrainSources } from "@/lib/demo-data";
import { packetFromProviderResponse } from "@/lib/source-normalizers";
import type { BrainSourcePacket } from "@/lib/types";

const NIA_BASE_URL = process.env.NIA_BASE_URL ?? "https://apigcp.trynia.ai/v2";

export async function fetchNiaBrainPacket(employeeId: string): Promise<BrainSourcePacket> {
  const key = process.env.NIA_API_KEY;
  if (!key) return fixtureNiaPacket("fallback");

  try {
    let res = await searchNia(employeeId, key, {
      repositories: splitEnv(process.env.NIA_REPOSITORIES),
      data_sources: splitEnv(process.env.NIA_DATA_SOURCES)
    });

    if (res.status === 400) {
      const body = await res.text();
      if (body.includes("No sources were successfully resolved")) {
        res = await searchNia(employeeId, key, { repositories: [], data_sources: [] });
      } else {
        return fixtureNiaPacket("error");
      }
    }

    if (!res.ok) return fixtureNiaPacket("error");

    const packet = packetFromProviderResponse({
      provider: "nia",
      status: "connected",
      live: true,
      response: await res.json(),
      fallbackSummary: "Nia returned codebase onboarding context."
    });
    return packet.citations.length ? packet : fixtureNiaPacket("fallback");
  } catch {
    return fixtureNiaPacket("error");
  }
}

function searchNia(
  employeeId: string,
  key: string,
  filters: { repositories: string[]; data_sources: string[] }
) {
  return fetch(`${NIA_BASE_URL}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    cache: "no-store",
    body: JSON.stringify({
      mode: "query",
      search_mode: "unified",
      repositories: filters.repositories,
      data_sources: filters.data_sources,
      messages: [
        {
          role: "user",
          content: `Assemble codebase onboarding context for employee ${employeeId}. Return source-backed conventions, owners, starter tasks, tests, and PR patterns.`
        }
      ]
    })
  });
}

function fixtureNiaPacket(status: BrainSourcePacket["status"]) {
  const packet = getFixtureBrainSources().find((item) => item.provider === "nia");
  if (!packet) throw new Error("Fixture Nia packet missing");
  return { ...packet, status };
}

function splitEnv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
