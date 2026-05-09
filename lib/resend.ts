import crypto from "node:crypto";
import type { ContextEvent, SourceCitation } from "@/lib/types";

const RESEND_API_BASE_URL = "https://api.resend.com";
const RESEND_SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

type UnknownRecord = Record<string, unknown>;

export interface ResendWebhookPayload {
  type?: string;
  created_at?: string;
  data?: UnknownRecord;
}

export interface ResendReceivedEmail {
  id?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  created_at?: string;
  subject?: string;
  text?: string | null;
  html?: string | null;
  message_id?: string;
  headers?: Record<string, string>;
}

export interface ResendEmailCapture {
  eventId: string;
  emailId: string;
  citation: SourceCitation;
  contextEvent: ContextEvent;
}

export interface ResendSignatureVerification {
  ok: boolean;
  reason?: "missing_secret" | "missing_headers" | "stale_timestamp" | "invalid_signature";
}

export function normalizeResendWebhookEvent(
  payload: unknown,
  options: {
    eventId?: string;
    fetchedEmail?: ResendReceivedEmail | null;
    receivedAt?: number;
  } = {}
): ResendEmailCapture | null {
  const root = isRecord(payload) ? payload : {};
  const eventType = stringField(root, ["type"]);
  if (eventType && eventType !== "email.received") return null;

  const data = isRecord(root.data) ? root.data : root;
  const fetched = options.fetchedEmail ?? null;
  const emailId =
    fetched?.id ??
    stringField(data, ["email_id", "emailId", "id"]) ??
    stringField(root, ["email_id", "emailId", "id"]);
  if (!emailId) return null;

  const subject = fetched?.subject ?? stringField(data, ["subject"]) ?? "(no subject)";
  const from = fetched?.from ?? stringField(data, ["from"]) ?? "unknown sender";
  const to = fetched?.to ?? stringArrayField(data, ["to"]);
  const createdAt =
    timestampFromIso(fetched?.created_at) ??
    timestampFromIso(stringField(data, ["created_at", "createdAt"])) ??
    timestampFromIso(stringField(root, ["created_at", "createdAt"])) ??
    options.receivedAt ??
    Date.now();
  const messageId =
    fetched?.message_id ?? stringField(data, ["message_id", "messageId"]) ?? emailId;
  const body = fetched?.text ?? htmlToText(fetched?.html) ?? metadataSnippet({ from, to, subject });
  const snippet = body.slice(0, 500);
  const decisionId =
    fetched?.headers?.["x-kiro-decision-id"] ??
    stringField(data, ["decision_id", "decisionId"]) ??
    stringField(isRecord(data.tags) ? data.tags : {}, ["decision_id", "decisionId"]);
  const threadId =
    fetched?.headers?.["x-kiro-thread-id"] ??
    stringField(data, ["thread_id", "threadId"]) ??
    messageId;
  const eventId = options.eventId ?? `resend-${emailId}`;

  const citation: SourceCitation = {
    id: `resend-${slugify(emailId)}`,
    sourceType: "gmail",
    title: `Resend inbound: ${subject}`,
    snippet,
    confidence: "Decided",
    freshness: createdAt,
    live: true,
    decisionId,
    threadId,
    captureMethod: "connector",
    capturedAt: createdAt,
    decisionRole: "originated"
  };

  const contextEvent: ContextEvent = {
    id: `evt-${slugify(eventId)}`,
    stage: "assemble",
    title: `Inbound email captured: ${subject}`,
    body: `${from} -> ${to.length ? to.join(", ") : "Kiro capture inbox"}. ${snippet}`,
    citationIds: [citation.id]
  };

  return { eventId, emailId, citation, contextEvent };
}

export async function fetchResendReceivedEmail(
  emailId: string,
  fetcher: typeof fetch = fetch
): Promise<ResendReceivedEmail | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;

  const res = await fetcher(
    `${RESEND_API_BASE_URL}/emails/receiving/${encodeURIComponent(emailId)}`,
    {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      cache: "no-store"
    }
  );
  if (!res.ok) return null;
  return (await res.json()) as ResendReceivedEmail;
}

export function verifyResendWebhookSignature(input: {
  payload: string;
  headers: Headers;
  secret?: string;
  now?: number;
  toleranceMs?: number;
}): ResendSignatureVerification {
  const secret = input.secret ?? process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, reason: "missing_secret" };
    }
    return { ok: true };
  }

  const id = input.headers.get("svix-id");
  const timestamp = input.headers.get("svix-timestamp");
  const signature = input.headers.get("svix-signature");
  if (!id || !timestamp || !signature) return { ok: false, reason: "missing_headers" };

  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs)) return { ok: false, reason: "missing_headers" };
  const now = input.now ?? Date.now();
  const tolerance = input.toleranceMs ?? RESEND_SIGNATURE_TOLERANCE_MS;
  if (Math.abs(now - timestampMs) > tolerance) {
    return { ok: false, reason: "stale_timestamp" };
  }

  const signedContent = `${id}.${timestamp}.${input.payload}`;
  const expected = crypto
    .createHmac("sha256", decodeSvixSecret(secret))
    .update(signedContent)
    .digest();

  const signatures = signature
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^v\d+,/, ""));

  const ok = signatures.some((candidate) => safeCompareBase64(candidate, expected));
  return ok ? { ok: true } : { ok: false, reason: "invalid_signature" };
}

function decodeSvixSecret(secret: string) {
  if (secret.startsWith("whsec_")) {
    return Buffer.from(secret.slice("whsec_".length), "base64");
  }
  return Buffer.from(secret, "utf8");
}

function safeCompareBase64(candidate: string, expected: Buffer) {
  try {
    const provided = Buffer.from(candidate, "base64");
    return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
  } catch {
    return false;
  }
}

function stringField(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
}

function stringArrayField(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string" && Boolean(item));
    }
    if (typeof value === "string" && value.trim()) return [value.trim()];
  }
  return [];
}

function timestampFromIso(value: string | undefined) {
  if (!value) return undefined;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : undefined;
}

function htmlToText(value: string | null | undefined) {
  if (!value) return undefined;
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function metadataSnippet(input: { from: string; to: string[]; subject: string }) {
  return `Inbound email from ${input.from} to ${
    input.to.length ? input.to.join(", ") : "Kiro capture inbox"
  }: ${input.subject}`;
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
