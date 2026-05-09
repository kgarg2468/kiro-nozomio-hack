import { NextResponse } from "next/server";
import { persistResendEmailCapture } from "@/lib/convex-capture";
import {
  fetchResendReceivedEmail,
  normalizeResendWebhookEvent,
  verifyResendWebhookSignature
} from "@/lib/resend";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const verification = verifyResendWebhookSignature({
    payload: rawBody,
    headers: req.headers
  });
  if (!verification.ok) {
    return NextResponse.json(
      { ok: false, error: "invalid_resend_signature", reason: verification.reason },
      { status: 401 }
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const emailId = inboundEmailId(payload);
  const fetchedEmail = emailId ? await fetchResendReceivedEmail(emailId).catch(() => null) : null;
  const capture = normalizeResendWebhookEvent(payload, {
    eventId: req.headers.get("svix-id") ?? undefined,
    fetchedEmail
  });

  if (!capture) {
    return NextResponse.json({ ok: true, ignored: true, reason: "unsupported_event" });
  }

  const persistence = await persistResendEmailCapture(capture);
  return NextResponse.json({
    ok: true,
    persisted: persistence.persisted,
    persistenceReason: persistence.reason,
    capture: {
      eventId: capture.eventId,
      emailId: capture.emailId,
      citation: capture.citation,
      contextEvent: capture.contextEvent
    }
  });
}

function inboundEmailId(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const root = payload as Record<string, unknown>;
  const data = root.data && typeof root.data === "object" && !Array.isArray(root.data) ? root.data : root;
  const value = (data as Record<string, unknown>).email_id ?? (data as Record<string, unknown>).emailId;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
