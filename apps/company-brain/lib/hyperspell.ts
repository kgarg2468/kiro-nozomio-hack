import "server-only";

import { getFixtureBrainSources } from "@/lib/demo-data";
import { packetFromProviderResponse } from "@/lib/source-normalizers";
import type { BrainSourcePacket } from "@/lib/types";

const HYPERSPELL_BASE_URL =
  process.env.HYPERSPELL_BASE_URL ?? "https://api.hyperspell.com";
const DEFAULT_HYPERSPELL_SOURCES = ["vault", "notion"];

export async function fetchHyperspellBrainPacket(
  employeeId: string
): Promise<BrainSourcePacket> {
  const key = process.env.HYPERSPELL_API_KEY;
  const userId = process.env.HYPERSPELL_USER_ID;
  const targetRepo = process.env.HYPERSPELL_TARGET_REPO ?? "aayu22809/crackstack";
  const sources = splitEnv(process.env.HYPERSPELL_SOURCES, DEFAULT_HYPERSPELL_SOURCES);
  if (!key) return fixtureHyperspellPacket("fallback");

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    };
    if (userId) headers["X-As-User"] = userId;

    const res = await fetch(`${HYPERSPELL_BASE_URL}/memories/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: `Kiro onboarding context for ${employeeId} in ${targetRepo}. Prioritize company decisions, Slack debates, Notion policies, GitHub PR history, owners, guardrails, and prior implementation examples that mention ${targetRepo}, crackstack, CLAUDE.original.md, caveman, or skills/caveman.`,
        answer: true,
        effort: "medium",
        sources,
        options: { max_results: 8 }
      }),
      cache: "no-store"
    });

    if (!res.ok) {
      const detail = await safeResponseText(res);
      console.warn("[kiro] Hyperspell query failed", {
        status: res.status,
        detail
      });
      return fixtureHyperspellPacket("error");
    }

    const response = await res.json();
    const queryId = stringField(isRecord(response) ? response : {}, ["query_id", "queryId"]);
    const providerErrors = hyperspellErrors(response);
    if (providerErrors.length) {
      console.warn("[kiro] Hyperspell returned query warnings", {
        errors: providerErrors,
        queryId
      });
    }

    const packet = packetFromProviderResponse({
      provider: "hyperspell",
      status: "connected",
      live: true,
      response,
      fallbackSummary: "Hyperspell returned cross-source company memory."
    });
    if (packet.citations.length) {
      return packet;
    }

    if (providerErrors.length) {
      return fixtureHyperspellPacket("error");
    }

    console.warn("[kiro] Hyperspell returned no documents", {
      queryId,
      sources,
      userConfigured: Boolean(userId)
    });
    return fixtureHyperspellPacket("fallback");
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    console.warn("[kiro] Hyperspell query threw", { message });
    return fixtureHyperspellPacket("error");
  }
}

function fixtureHyperspellPacket(status: BrainSourcePacket["status"]) {
  const packet = getFixtureBrainSources().find((item) => item.provider === "hyperspell");
  if (!packet) throw new Error("Fixture Hyperspell packet missing");
  return { ...packet, status };
}

function splitEnv(value: string | undefined, fallback: string[]) {
  const items = (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : fallback;
}

function hyperspellErrors(response: unknown) {
  if (!isRecord(response) || !Array.isArray(response.errors)) return [];
  return response.errors
    .map((error) => {
      if (!isRecord(error)) return safeString(error);
      const code = stringField(error, ["error", "code", "type"]);
      const message = stringField(error, ["message", "detail", "reason"]);
      return [code, message].filter(Boolean).join(": ");
    })
    .filter(Boolean);
}

async function safeResponseText(res: Response) {
  try {
    const text = await res.text();
    return text.trim().slice(0, 300) || "empty response body";
  } catch {
    return "response body unavailable";
  }
}

function stringField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
}

function safeString(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
