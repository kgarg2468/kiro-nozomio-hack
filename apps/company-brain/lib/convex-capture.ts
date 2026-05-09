import "server-only";

import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import type { ResendEmailCapture } from "@/lib/resend";

type RecordInboundEmailCaptureArgs = {
  citation: {
    external_id: string;
    title: string;
    snippet: string;
    freshness?: number;
    live: boolean;
    decision_external_id?: string;
    thread_external_id?: string;
    captured_at?: number;
  };
  context_event: {
    external_id: string;
    title: string;
    body: string;
    citation_external_ids: string[];
  };
};

const recordInboundEmailCapture = makeFunctionReference<
  "mutation",
  RecordInboundEmailCaptureArgs,
  { citationId: string; contextEventId: string }
>("onboarding:recordInboundEmailCapture");

export async function persistResendEmailCapture(capture: ResendEmailCapture): Promise<{
  persisted: boolean;
  reason?: "convex_not_configured" | "convex_error";
}> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return { persisted: false, reason: "convex_not_configured" };

  try {
    const client = new ConvexHttpClient(url, { logger: false });
    await client.mutation(
      recordInboundEmailCapture,
      {
        citation: {
          external_id: capture.citation.id,
          title: capture.citation.title,
          snippet: capture.citation.snippet,
          freshness: capture.citation.freshness,
          live: capture.citation.live,
          decision_external_id: capture.citation.decisionId,
          thread_external_id: capture.citation.threadId,
          captured_at: capture.citation.capturedAt
        },
        context_event: {
          external_id: capture.contextEvent.id,
          title: capture.contextEvent.title,
          body: capture.contextEvent.body,
          citation_external_ids: capture.contextEvent.citationIds
        }
      },
      { skipQueue: true }
    );
    return { persisted: true };
  } catch (error) {
    console.warn("[kiro] Convex email capture persistence failed", error);
    return { persisted: false, reason: "convex_error" };
  }
}
