import "server-only";

import { getFixtureBrainSources } from "@/lib/demo-data";
import { packetFromProviderResponse } from "@/lib/source-normalizers";
import type { BrainSourcePacket } from "@/lib/types";

const NIA_BASE_URL = process.env.NIA_BASE_URL ?? "https://apigcp.trynia.ai/v2";

export async function fetchNiaBrainPacket(employeeId: string): Promise<BrainSourcePacket> {
  const key = process.env.NIA_API_KEY;
  if (!key) return fixtureNiaPacket("fallback");

  try {
    const res = await fetch(`${NIA_BASE_URL}/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({
        mode: "query",
        search_mode: "unified",
        repositories: splitEnv(process.env.NIA_REPOSITORIES),
        data_sources: splitEnv(process.env.NIA_DATA_SOURCES),
        messages: [
          {
            role: "user",
            content: `Assemble codebase onboarding context for employee ${employeeId}. Return source-backed conventions, owners, starter tasks, tests, and PR patterns.`
          }
        ]
      })
    });

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
