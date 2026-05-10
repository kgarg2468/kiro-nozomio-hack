import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  fetchResendReceivedEmail,
  normalizeResendWebhookEvent,
  verifyResendWebhookSignature
} from "@/lib/resend";

describe("resend email capture", () => {
  it("normalizes email.received webhooks into citation and context event shape", () => {
    const capture = normalizeResendWebhookEvent(
      {
        type: "email.received",
        created_at: "2026-05-09T20:30:00.000Z",
        data: {
          email_id: "email_123",
          from: "Acme <buyer@example.com>",
          to: ["capture@kiro.dev"],
          subject: "Retry escalation",
          message_id: "<message-123>",
          tags: { decision_id: "decision-retry-policy" }
        }
      },
      {
        eventId: "msg_delivery_123",
        fetchedEmail: {
          id: "email_123",
          from: "Acme <buyer@example.com>",
          to: ["capture@kiro.dev"],
          created_at: "2026-05-09T20:30:00.000Z",
          subject: "Retry escalation",
          text: "The customer is blocked because webhook retries stalled.",
          message_id: "<message-123>",
          headers: { "x-kiro-thread-id": "thread-retry-policy-142" }
        }
      }
    );

    expect(capture).toMatchObject({
      eventId: "msg_delivery_123",
      emailId: "email_123",
      citation: {
        id: "resend-email-123",
        sourceType: "gmail",
        title: "Resend inbound: Retry escalation",
        snippet: "The customer is blocked because webhook retries stalled.",
        live: true,
        decisionId: "decision-retry-policy",
        threadId: "thread-retry-policy-142",
        captureMethod: "connector",
        decisionRole: "originated"
      },
      contextEvent: {
        id: "evt-msg-delivery-123",
        stage: "assemble",
        citationIds: ["resend-email-123"]
      }
    });
  });

  it("ignores unsupported webhook event types", () => {
    expect(normalizeResendWebhookEvent({ type: "email.sent", data: {} })).toBeNull();
  });

  it("verifies Svix-style Resend webhook signatures", () => {
    const payload = JSON.stringify({ type: "email.received", data: { email_id: "email_123" } });
    const secret = `whsec_${Buffer.from("test-secret").toString("base64")}`;
    const timestamp = "1778353200";
    const signedContent = `msg_123.${timestamp}.${payload}`;
    const signature = crypto
      .createHmac("sha256", Buffer.from("test-secret"))
      .update(signedContent)
      .digest("base64");
    const headers = new Headers({
      "svix-id": "msg_123",
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${signature}`
    });

    expect(
      verifyResendWebhookSignature({
        payload,
        headers,
        secret,
        now: 1778353200000
      })
    ).toEqual({ ok: true });
  });

  it("fetches received email details only when a Resend key exists", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await fetchResendReceivedEmail("email_123")).toBeNull();

    vi.stubEnv("RESEND_API_KEY", "re_test");
    const fetcher = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          id: "email_123",
          subject: "Customer context",
          text: "Body text"
        }),
        { status: 200 }
      );
    });

    await expect(fetchResendReceivedEmail("email_123", fetcher)).resolves.toMatchObject({
      id: "email_123",
      subject: "Customer context"
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.resend.com/emails/receiving/email_123",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer re_test" })
      })
    );
  });
});
