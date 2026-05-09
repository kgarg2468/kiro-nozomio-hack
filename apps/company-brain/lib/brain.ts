import "server-only";

import { getFixtureDemoState } from "@/lib/demo-data";
import { fetchHyperspellBrainPacket } from "@/lib/hyperspell";
import { fetchNiaBrainPacket } from "@/lib/nia";
import type { DemoState } from "@/lib/types";

export async function assembleBrainForEmployee(employeeId: string): Promise<DemoState> {
  const fixture = getFixtureDemoState();
  const mode = demoMode();

  if (mode === "fixture") return fixture;

  const [hyperspell, nia] = await Promise.all([
    fetchHyperspellBrainPacket(employeeId),
    fetchNiaBrainPacket(employeeId)
  ]);

  const liveCitations = [...hyperspell.citations, ...nia.citations];
  return {
    ...fixture,
    mode,
    brainSources: [hyperspell, nia, ...fixture.brainSources.filter((p) => p.provider === "fixture")],
    citations: liveCitations.length ? [...liveCitations, ...fixture.citations] : fixture.citations
  };
}

export function demoMode(): DemoState["mode"] {
  const value = process.env.KIRO_DEMO_MODE;
  if (value === "live" || value === "hybrid" || value === "fixture") return value;
  return "fixture";
}
