import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
