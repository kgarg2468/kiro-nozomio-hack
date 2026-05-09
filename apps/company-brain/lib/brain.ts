import "server-only";

import { readBrainSnapshot, writeBrainSnapshot } from "@/lib/convex-brain";
import { fetchConvexDemoState } from "@/lib/convex-dashboard";
import { getFixtureDemoState } from "@/lib/demo-data";
import { fetchHyperspellBrainPacket } from "@/lib/hyperspell";
import { fetchNiaBrainPacket } from "@/lib/nia";
import type { DemoState, SourceCitation } from "@/lib/types";

export type BrainMode = DemoState["mode"];
export type LiveSource = "providers" | "convex";

export async function assembleBrainForEmployee(
  employeeId: string,
  modeOverride?: BrainMode,
  sourceOverride?: LiveSource
): Promise<DemoState> {
  const fixture = getFixtureDemoState();
  const mode = modeOverride ?? demoMode();
  const source = sourceOverride ?? liveSource();

  if (mode === "fixture") {
    await writeBrainSnapshot(employeeId, fixture);
    return fixture;
  }

  if (source === "convex") {
    const convexState = await fetchConvexDemoState();
    if (convexState) {
      const state = { ...convexState, mode };
      await writeBrainSnapshot(employeeId, state);
      return state;
    }
  }

  const cached = await readBrainSnapshot(employeeId);

  const [hyperspell, nia] = await Promise.all([
    fetchHyperspellBrainPacket(employeeId),
    fetchNiaBrainPacket(employeeId)
  ]);

  const liveCitations = [...hyperspell.citations, ...nia.citations];
  const assembled = {
    ...fixture,
    mode,
    brainSources: [hyperspell, nia, ...fixture.brainSources.filter((p) => p.provider === "fixture")],
    citations: liveCitations.length ? uniqueCitations([...liveCitations, ...fixture.citations]) : fixture.citations
  };

  if (!hasConnectedProvider(assembled) && cached) return { ...cached, mode };

  await writeBrainSnapshot(employeeId, assembled);
  return assembled;
}

export function demoMode(value?: string | string[] | null): BrainMode {
  const normalized = firstParam(value) ?? process.env.KIRO_DEMO_MODE;
  if (normalized === "live" || normalized === "hybrid" || normalized === "fixture") {
    return normalized;
  }
  return "fixture";
}

export function liveSource(value?: string | string[] | null): LiveSource {
  return firstParam(value) === "convex" ? "convex" : "providers";
}

export function employeeIdParam(value?: string | string[] | null): string {
  return firstParam(value)?.trim() || "sam";
}

function firstParam(value?: string | string[] | null): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function uniqueCitations(citations: SourceCitation[]): SourceCitation[] {
  const seen = new Set<string>();
  return citations.filter((citation) => {
    if (seen.has(citation.id)) return false;
    seen.add(citation.id);
    return true;
  });
}

function hasConnectedProvider(state: DemoState) {
  return state.brainSources.some(
    (source) => source.provider !== "fixture" && source.status === "connected"
  );
}
