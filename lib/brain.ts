import "server-only";

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

  if (mode === "fixture") return fixture;

  if (source === "convex") {
    const convexState = await fetchConvexDemoState();
    if (convexState) return { ...convexState, mode };
  }

  const [hyperspell, nia] = await Promise.all([
    fetchHyperspellBrainPacket(employeeId),
    fetchNiaBrainPacket(employeeId)
  ]);

  const providerCitations = [...hyperspell.citations, ...nia.citations];
  return {
    ...fixture,
    mode,
    brainSources: [hyperspell, nia, ...fixture.brainSources.filter((p) => p.provider === "fixture")],
    citations: mergeCitations([...providerCitations, ...fixture.citations])
  };
}

export function demoMode(
  value: string | string[] | null | undefined = process.env.KIRO_DEMO_MODE
): BrainMode {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (normalized === "live" || normalized === "hybrid" || normalized === "fixture") {
    return normalized;
  }
  if (value !== process.env.KIRO_DEMO_MODE) return demoMode();
  return "fixture";
}

export function liveSource(
  value: string | string[] | null | undefined = process.env.KIRO_LIVE_SOURCE
): LiveSource {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized === "convex" ? "convex" : "providers";
}

export function employeeIdParam(value: string | string[] | null | undefined): string {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized?.trim() || "sam";
}

function mergeCitations(citations: SourceCitation[]): SourceCitation[] {
  const byId = new Map<string, SourceCitation>();
  for (const citation of citations) {
    if (!byId.has(citation.id)) byId.set(citation.id, citation);
  }
  return [...byId.values()];
}
