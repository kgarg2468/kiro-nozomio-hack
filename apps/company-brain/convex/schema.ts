import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const sourceType = v.union(
  v.literal("crm"),
  v.literal("drive"),
  v.literal("gmail"),
  v.literal("hyperspell"),
  v.literal("meeting"),
  v.literal("nia"),
  v.literal("github"),
  v.literal("slack"),
  v.literal("notion"),
  v.literal("pr"),
  v.literal("transcript"),
  v.literal("fixture")
);

const confidenceLabel = v.union(
  v.literal("Decided"),
  v.literal("Convention"),
  v.literal("Considered"),
  v.literal("Stale")
);

const captureMethod = v.union(
  v.literal("connector"),
  v.literal("transcript"),
  v.literal("manual_note"),
  v.literal("agent_checkpoint"),
  v.literal("fixture")
);

const decisionRole = v.union(
  v.literal("originated"),
  v.literal("debated"),
  v.literal("finalized"),
  v.literal("codified"),
  v.literal("implemented")
);

const decisionStatus = v.union(
  v.literal("proposed"),
  v.literal("debated"),
  v.literal("decided"),
  v.literal("superseded")
);

const employeeStatus = v.union(
  v.literal("onboarding"),
  v.literal("active"),
  v.literal("coding"),
  v.literal("blocked"),
  v.literal("ready"),
  v.literal("merged")
);

export default defineSchema({
  employees: defineTable({
    external_id: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.string(),
    github: v.string(),
    status: employeeStatus,
    palette: v.number(),
    created_at: v.number()
  })
    .index("by_external_id", ["external_id"])
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  onboarding_profiles: defineTable({
    employee_external_id: v.string(),
    headline: v.string(),
    strengths: v.array(v.string()),
    weak_spots: v.array(v.string()),
    known_modules: v.array(v.string()),
    source_coverage: v.number(),
    context_risk_score: v.number(),
    summary: v.string(),
    updated_at: v.number()
  }).index("by_employee", ["employee_external_id"]),

  brain_sources: defineTable({
    provider: v.union(v.literal("hyperspell"), v.literal("nia"), v.literal("fixture")),
    status: v.union(
      v.literal("connected"),
      v.literal("syncing"),
      v.literal("fallback"),
      v.literal("error")
    ),
    messages: v.optional(v.number()),
    docs: v.optional(v.number()),
    prs: v.optional(v.number()),
    repos: v.optional(v.number()),
    crm: v.optional(v.number()),
    emails: v.optional(v.number()),
    meetings: v.optional(v.number()),
    decisions: v.optional(v.number()),
    summary: v.string(),
    updated_at: v.number()
  }).index("by_provider", ["provider"]),

  source_citations: defineTable({
    external_id: v.string(),
    source_type: sourceType,
    title: v.string(),
    url: v.optional(v.string()),
    snippet: v.string(),
    confidence: confidenceLabel,
    freshness: v.optional(v.number()),
    live: v.boolean(),
    provider: v.union(v.literal("hyperspell"), v.literal("nia"), v.literal("fixture")),
    decision_external_id: v.optional(v.string()),
    thread_external_id: v.optional(v.string()),
    capture_method: v.optional(captureMethod),
    captured_at: v.optional(v.number()),
    decision_role: v.optional(decisionRole),
    created_at: v.number()
  })
    .index("by_external_id", ["external_id"])
    .index("by_provider", ["provider"])
    .index("by_source_type", ["source_type"]),

  decisions: defineTable({
    external_id: v.string(),
    title: v.string(),
    summary: v.string(),
    status: decisionStatus,
    final_recommendation: v.string(),
    source_citation_external_ids: v.array(v.string()),
    owner: v.string(),
    freshness: v.optional(v.number()),
    updated_at: v.number()
  })
    .index("by_external_id", ["external_id"])
    .index("by_status", ["status"])
    .index("by_owner", ["owner"]),

  tasks: defineTable({
    external_id: v.string(),
    title: v.string(),
    issue_id: v.string(),
    owner: v.string(),
    matched_employee_external_id: v.string(),
    status: v.union(
      v.literal("selected"),
      v.literal("in_progress"),
      v.literal("blocked"),
      v.literal("ready")
    ),
    progress: v.number(),
    why_matched: v.array(v.string()),
    files: v.array(v.string()),
    updated_at: v.number()
  })
    .index("by_external_id", ["external_id"])
    .index("by_employee", ["matched_employee_external_id"]),

  agent_sessions: defineTable({
    external_id: v.string(),
    kind: v.union(v.literal("codex"), v.literal("claude"), v.literal("kiro")),
    display_name: v.string(),
    owner_employee_external_id: v.string(),
    current_plan: v.string(),
    status: v.union(
      v.literal("idle"),
      v.literal("working"),
      v.literal("blocked"),
      v.literal("ready")
    ),
    updated_at: v.number()
  })
    .index("by_external_id", ["external_id"])
    .index("by_owner", ["owner_employee_external_id"]),

  context_events: defineTable({
    external_id: v.string(),
    stage: v.union(
      v.literal("assemble"),
      v.literal("profile"),
      v.literal("task"),
      v.literal("guardrail"),
      v.literal("readiness")
    ),
    title: v.string(),
    body: v.string(),
    citation_external_ids: v.array(v.string()),
    created_at: v.number()
  })
    .index("by_external_id", ["external_id"])
    .index("by_stage", ["stage"]),

  guardrails: defineTable({
    external_id: v.string(),
    title: v.string(),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("blocking")),
    rule: v.string(),
    recommendation: v.string(),
    citation_external_ids: v.array(v.string()),
    active: v.boolean(),
    updated_at: v.number()
  })
    .index("by_external_id", ["external_id"])
    .index("by_active", ["active"]),

  pr_readiness_reports: defineTable({
    external_id: v.string(),
    task_external_id: v.string(),
    verdict: v.union(v.literal("ready"), v.literal("needs_review"), v.literal("blocked")),
    summary: v.string(),
    tests: v.array(v.string()),
    risk: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    recommendation: v.string(),
    citation_external_ids: v.array(v.string()),
    created_at: v.number()
  })
    .index("by_external_id", ["external_id"])
    .index("by_task", ["task_external_id"])
});
