import type {
  BrainSourcePacket,
  CaptureMethod,
  ConfidenceLabel,
  DecisionRole,
  SourceCitation,
  SourceType
} from "@/lib/types";

type UnknownRecord = Record<string, unknown>;

export function normalizeProviderCitation(
  provider: "hyperspell" | "nia" | "fixture",
  value: unknown,
  index: number,
  live: boolean
): SourceCitation {
  const record = isRecord(value) ? value : {};
  const sourceType = normalizeSourceType(
    stringField(record, ["sourceType", "source_type", "type", "kind"]) ?? provider
  );
  const title =
    stringField(record, ["title", "name", "source", "url", "path"]) ??
    `${provider} source ${index + 1}`;
  const snippet =
    stringField(record, ["snippet", "summary", "content", "text", "body"]) ??
    (safeJson(value).slice(0, 500) ||
      "Source returned without readable body text.");
  return {
    id:
      stringField(record, ["id", "source_id", "sourceId"]) ??
      `${provider}_${slugify(title)}_${index}`,
    sourceType,
    title,
    url: stringField(record, ["url", "uri", "href"]),
    snippet,
    confidence: normalizeConfidence(
      stringField(record, ["confidence", "confidenceLabel", "label"])
    ),
    freshness:
      numberField(record, ["freshness", "freshness_ms", "updated_at", "updatedAt"]) ??
      Date.now(),
    live,
    decisionId: stringField(record, ["decisionId", "decision_id"]),
    threadId: stringField(record, ["threadId", "thread_id"]),
    captureMethod: normalizeCaptureMethod(
      stringField(record, ["captureMethod", "capture_method"])
    ),
    capturedAt: numberField(record, ["capturedAt", "captured_at"]),
    decisionRole: normalizeDecisionRole(
      stringField(record, ["decisionRole", "decision_role", "role"])
    )
  };
}

export function packetFromProviderResponse(input: {
  provider: "hyperspell" | "nia" | "fixture";
  status: BrainSourcePacket["status"];
  response: unknown;
  fallbackSummary: string;
  live: boolean;
}): BrainSourcePacket {
  const root = isRecord(input.response) ? input.response : {};
  const candidates = [
    root.sources,
    root.citations,
    root.results,
    root.documents,
    root.references
  ].filter(Array.isArray) as unknown[][];
  const citations = candidates
    .flat()
    .slice(0, 8)
    .map((value, index) =>
      normalizeProviderCitation(input.provider, value, index, input.live)
    );

  return {
    provider: input.provider,
    status: input.status,
    counts: {
      messages: numberField(root, ["messages", "message_count", "messagesIndexed"]),
      docs: numberField(root, ["docs", "document_count", "documentsIndexed"]),
      prs: numberField(root, ["prs", "pull_request_count", "prsAnalyzed"]),
      repos: numberField(root, ["repos", "repository_count", "reposIndexed"]),
      crm: numberField(root, ["crm", "crm_count", "crmRecords"]),
      emails: numberField(root, ["emails", "email_count", "emailsIndexed"]),
      meetings: numberField(root, ["meetings", "meeting_count", "meetingsIndexed"]),
      decisions: numberField(root, ["decisions", "decision_count", "decisionsExtracted"])
    },
    summary:
      stringField(root, ["summary", "answer", "result", "text", "content"]) ??
      input.fallbackSummary,
    citations
  };
}

export function normalizeSourceType(value: string): SourceType {
  const lower = value.toLowerCase();
  if (lower.includes("hyper")) return "hyperspell";
  if (lower.includes("crm") || lower.includes("salesforce") || lower.includes("hubspot")) return "crm";
  if (lower.includes("drive")) return "drive";
  if (lower.includes("gmail") || lower.includes("email")) return "gmail";
  if (lower.includes("meeting") || lower.includes("granola")) return "meeting";
  if (lower.includes("nia") || lower.includes("code")) return "nia";
  if (lower.includes("github")) return "github";
  if (lower.includes("slack")) return "slack";
  if (lower.includes("notion") || lower.includes("doc")) return "notion";
  if (lower.includes("pr") || lower.includes("pull")) return "pr";
  if (lower.includes("transcript")) return "transcript";
  return "fixture";
}

export function normalizeConfidence(value: string | undefined): ConfidenceLabel {
  const lower = value?.toLowerCase() ?? "";
  if (lower.includes("convention")) return "Convention";
  if (lower.includes("consider")) return "Considered";
  if (lower.includes("stale")) return "Stale";
  return "Decided";
}

export function normalizeCaptureMethod(value: string | undefined): CaptureMethod | undefined {
  const lower = value?.toLowerCase() ?? "";
  if (!lower) return undefined;
  if (lower.includes("transcript") || lower.includes("meeting")) return "transcript";
  if (lower.includes("manual") || lower.includes("note")) return "manual_note";
  if (lower.includes("agent") || lower.includes("checkpoint")) return "agent_checkpoint";
  if (lower.includes("fixture") || lower.includes("demo")) return "fixture";
  return "connector";
}

export function normalizeDecisionRole(value: string | undefined): DecisionRole | undefined {
  const lower = value?.toLowerCase() ?? "";
  if (!lower) return undefined;
  if (lower.includes("origin")) return "originated";
  if (lower.includes("debat") || lower.includes("discuss")) return "debated";
  if (lower.includes("final") || lower.includes("decid")) return "finalized";
  if (lower.includes("codif") || lower.includes("doc")) return "codified";
  if (lower.includes("implement") || lower.includes("pr") || lower.includes("code")) return "implemented";
  return undefined;
}

function stringField(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
}

function numberField(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
