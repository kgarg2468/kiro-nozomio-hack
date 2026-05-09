import { mutation, query } from "./_generated/server";
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

export const dashboardState = query({
  args: {},
  handler: async (ctx) => {
    const [
      employees,
      profiles,
      brainSources,
      citations,
      decisions,
      tasks,
      agentSessions,
      contextEvents,
      guardrails,
      readinessReports
    ] = await Promise.all([
      ctx.db.query("employees").collect(),
      ctx.db.query("onboarding_profiles").collect(),
      ctx.db.query("brain_sources").collect(),
      ctx.db.query("source_citations").collect(),
      ctx.db.query("decisions").collect(),
      ctx.db.query("tasks").collect(),
      ctx.db.query("agent_sessions").collect(),
      ctx.db.query("context_events").collect(),
      ctx.db.query("guardrails").collect(),
      ctx.db.query("pr_readiness_reports").collect()
    ]);

    return {
      employees,
      profile: profiles[0] ?? null,
      brainSources,
      citations,
      decisions,
      task: tasks[0] ?? null,
      agentSessions,
      contextEvents,
      guardrails,
      readiness: readinessReports[0] ?? null
    };
  }
});

export const upsertContextEvent = mutation({
  args: {
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
    citation_external_ids: v.array(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("context_events")
      .withIndex("by_external_id", (q) => q.eq("external_id", args.external_id))
      .first();
    const patch = {
      stage: args.stage,
      title: args.title,
      body: args.body,
      citation_external_ids: args.citation_external_ids,
      created_at: Date.now()
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("context_events", {
      external_id: args.external_id,
      ...patch
    });
  }
});

export const recordInboundEmailCapture = mutation({
  args: {
    citation: v.object({
      external_id: v.string(),
      source_type: v.optional(sourceType),
      title: v.string(),
      url: v.optional(v.string()),
      snippet: v.string(),
      confidence: v.optional(
        v.union(
          v.literal("Decided"),
          v.literal("Convention"),
          v.literal("Considered"),
          v.literal("Stale")
        )
      ),
      freshness: v.optional(v.number()),
      live: v.boolean(),
      decision_external_id: v.optional(v.string()),
      thread_external_id: v.optional(v.string()),
      captured_at: v.optional(v.number())
    }),
    context_event: v.object({
      external_id: v.string(),
      title: v.string(),
      body: v.string(),
      citation_external_ids: v.array(v.string())
    })
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existingCitation = await ctx.db
      .query("source_citations")
      .withIndex("by_external_id", (q) => q.eq("external_id", args.citation.external_id))
      .first();
    const citationPatch = {
      source_type: args.citation.source_type ?? "gmail",
      title: args.citation.title,
      snippet: args.citation.snippet,
      confidence: args.citation.confidence ?? "Decided",
      live: args.citation.live,
      provider: "fixture" as const,
      capture_method: "connector" as const,
      captured_at: args.citation.captured_at ?? now,
      decision_role: "originated" as const,
      created_at: now,
      ...(args.citation.url ? { url: args.citation.url } : {}),
      ...(args.citation.freshness !== undefined ? { freshness: args.citation.freshness } : {}),
      ...(args.citation.decision_external_id
        ? { decision_external_id: args.citation.decision_external_id }
        : {}),
      ...(args.citation.thread_external_id
        ? { thread_external_id: args.citation.thread_external_id }
        : {})
    };
    const citationId = existingCitation
      ? existingCitation._id
      : await ctx.db.insert("source_citations", {
          external_id: args.citation.external_id,
          ...citationPatch
        });
    if (existingCitation) {
      await ctx.db.patch(existingCitation._id, citationPatch);
    }

    const existingEvent = await ctx.db
      .query("context_events")
      .withIndex("by_external_id", (q) => q.eq("external_id", args.context_event.external_id))
      .first();
    const eventPatch = {
      stage: "assemble" as const,
      title: args.context_event.title,
      body: args.context_event.body,
      citation_external_ids: args.context_event.citation_external_ids,
      created_at: now
    };
    const contextEventId = existingEvent
      ? existingEvent._id
      : await ctx.db.insert("context_events", {
          external_id: args.context_event.external_id,
          ...eventPatch
        });
    if (existingEvent) {
      await ctx.db.patch(existingEvent._id, eventPatch);
    }

    return { citationId, contextEventId };
  }
});

export const setEmployeeStatus = mutation({
  args: {
    external_id: v.string(),
    status: v.union(
      v.literal("onboarding"),
      v.literal("active"),
      v.literal("coding"),
      v.literal("blocked"),
      v.literal("ready"),
      v.literal("merged")
    )
  },
  handler: async (ctx, args) => {
    const employee = await ctx.db
      .query("employees")
      .withIndex("by_external_id", (q) => q.eq("external_id", args.external_id))
      .first();
    if (!employee) return null;
    await ctx.db.patch(employee._id, { status: args.status });
    return employee._id;
  }
});
