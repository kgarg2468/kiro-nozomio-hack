import "server-only";

import { readBrainSnapshot, writeBrainSnapshot } from "@/lib/convex-brain";
import { getFixtureDemoState } from "@/lib/demo-data";
import { fetchHyperspellBrainPacket } from "@/lib/hyperspell";
import { fetchNiaBrainPacket } from "@/lib/nia";
import type { DemoState, SourceCitation } from "@/lib/types";

export async function assembleBrainForEmployee(employeeId: string): Promise<DemoState> {
  const fixture = getFixtureDemoState();
  const mode = demoMode();

  if (mode === "fixture") {
    await writeBrainSnapshot(employeeId, fixture);
    return fixture;
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

export function demoMode(): DemoState["mode"] {
  const value = process.env.KIRO_DEMO_MODE;
  if (value === "live" || value === "hybrid" || value === "fixture") return value;
  return "fixture";
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
