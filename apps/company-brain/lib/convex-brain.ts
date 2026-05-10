import "server-only";

import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import type { DemoState } from "@/lib/types";

type BrainSnapshot = {
  state: DemoState;
  updated_at: number;
};

const brainSnapshot = makeFunctionReference<
  "query",
  { key: string },
  BrainSnapshot | null
>("onboarding:brainSnapshot");

const upsertDemoState = makeFunctionReference<
  "mutation",
  { key: string; state: DemoState; updated_at?: number },
  {
    employees: number;
    brainSources: number;
    citations: number;
    decisions: number;
    events: number;
  }
>("onboarding:upsertDemoState");

export async function readBrainSnapshot(employeeId: string): Promise<DemoState | null> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;

  try {
    const client = new ConvexHttpClient(url, { logger: false });
    const snapshot = await client.query(brainSnapshot, { key: snapshotKey(employeeId) });
    return snapshot?.state ?? null;
  } catch (error) {
    console.warn("[kiro] Convex brain snapshot read failed", error);
    return null;
  }
}

export async function writeBrainSnapshot(employeeId: string, state: DemoState): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return false;

  try {
    const client = new ConvexHttpClient(url, { logger: false });
    await client.mutation(
      upsertDemoState,
      {
        key: snapshotKey(employeeId),
        state,
        updated_at: Date.now()
      },
      { skipQueue: true }
    );
    return true;
  } catch (error) {
    console.warn("[kiro] Convex brain snapshot write failed", error);
    return false;
  }
}

function snapshotKey(employeeId: string) {
  return `employee:${employeeId}`;
}
