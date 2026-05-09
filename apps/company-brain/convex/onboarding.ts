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

export const brainSnapshot = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const snapshot = await ctx.db
      .query("brain_snapshots")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (!snapshot) return null;
    return { state: snapshot.state, updated_at: snapshot.updated_at };
  }
});

export const upsertDemoState = mutation({
  args: {
    key: v.string(),
    state: v.any(),
    updated_at: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const now = args.updated_at ?? Date.now();
    const state = args.state as any;
    const snapshot = await ctx.db
      .query("brain_snapshots")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (snapshot) {
      await ctx.db.patch(snapshot._id, { state, updated_at: now });
    } else {
      await ctx.db.insert("brain_snapshots", { key: args.key, state, updated_at: now });
    }

    for (const employee of arrayOf(state.employees)) {
      await upsertByIndex(ctx, "employees", "by_external_id", employee.id, {
        external_id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        github: employee.github,
        status: employee.status,
        palette: employee.palette,
        created_at: now
      });
    }

    if (state.profile) {
      await upsertByIndex(ctx, "onboarding_profiles", "by_employee", state.profile.employeeId, {
        employee_external_id: state.profile.employeeId,
        headline: state.profile.headline,
        strengths: arrayOf(state.profile.strengths),
        weak_spots: arrayOf(state.profile.weakSpots),
        known_modules: arrayOf(state.profile.knownModules),
        source_coverage: state.profile.sourceCoverage,
        context_risk_score: state.profile.contextRiskScore,
        summary: state.profile.summary,
        updated_at: now
      });
    }

    for (const source of arrayOf(state.brainSources)) {
      await upsertByIndex(ctx, "brain_sources", "by_provider", source.provider, {
        provider: source.provider,
        status: source.status,
        messages: source.counts?.messages,
        docs: source.counts?.docs,
        prs: source.counts?.prs,
        repos: source.counts?.repos,
        crm: source.counts?.crm,
        emails: source.counts?.emails,
        meetings: source.counts?.meetings,
        decisions: source.counts?.decisions,
        summary: source.summary,
        updated_at: now
      });
    }

    for (const citation of arrayOf(state.citations)) {
      await upsertByIndex(ctx, "source_citations", "by_external_id", citation.id, {
        external_id: citation.id,
        source_type: citation.sourceType,
        title: citation.title,
        url: citation.url,
        snippet: citation.snippet,
        confidence: citation.confidence,
        freshness: citation.freshness,
        live: citation.live,
        provider: providerForCitation(citation),
        decision_external_id: citation.decisionId,
        thread_external_id: citation.threadId,
        capture_method: citation.captureMethod,
        captured_at: citation.capturedAt,
        decision_role: citation.decisionRole,
        created_at: now
      });
    }

    for (const decision of arrayOf(state.decisions)) {
      await upsertByIndex(ctx, "decisions", "by_external_id", decision.id, {
        external_id: decision.id,
        title: decision.title,
        summary: decision.summary,
        status: decision.status,
        final_recommendation: decision.finalRecommendation,
        source_citation_external_ids: arrayOf(decision.sourceCitationIds),
        owner: decision.owner,
        freshness: decision.freshness,
        updated_at: now
      });
    }

    if (state.task) {
      await upsertByIndex(ctx, "tasks", "by_external_id", state.task.id, {
        external_id: state.task.id,
        title: state.task.title,
        issue_id: state.task.issueId,
        owner: state.task.owner,
        matched_employee_external_id: state.task.matchedEmployeeId,
        status: state.task.status,
        progress: state.task.progress,
        why_matched: arrayOf(state.task.whyMatched),
        files: arrayOf(state.task.files),
        updated_at: now
      });
    }

    for (const agent of arrayOf(state.agents)) {
      await upsertByIndex(ctx, "agent_sessions", "by_external_id", agent.id, {
        external_id: agent.id,
        kind: agent.kind,
        display_name: agent.displayName,
        owner_employee_external_id: agent.ownerEmployeeId,
        current_plan: agent.currentPlan,
        status: agent.status,
        updated_at: now
      });
    }

    for (const event of arrayOf(state.contextEvents)) {
      await upsertByIndex(ctx, "context_events", "by_external_id", event.id, {
        external_id: event.id,
        stage: event.stage,
        title: event.title,
        body: event.body,
        citation_external_ids: arrayOf(event.citationIds),
        created_at: now
      });
    }

    for (const guardrail of arrayOf(state.guardrails)) {
      await upsertByIndex(ctx, "guardrails", "by_external_id", guardrail.id, {
        external_id: guardrail.id,
        title: guardrail.title,
        severity: guardrail.severity,
        rule: guardrail.rule,
        recommendation: guardrail.recommendation,
        citation_external_ids: arrayOf(guardrail.citationIds),
        active: guardrail.active,
        updated_at: now
      });
    }

    if (state.readiness) {
      await upsertByIndex(ctx, "pr_readiness_reports", "by_external_id", state.readiness.id, {
        external_id: state.readiness.id,
        task_external_id: state.readiness.taskId,
        verdict: state.readiness.verdict,
        summary: state.readiness.summary,
        tests: arrayOf(state.readiness.tests),
        risk: state.readiness.risk,
        recommendation: state.readiness.recommendation,
        citation_external_ids: arrayOf(state.readiness.citationIds),
        created_at: now
      });
    }

    return {
      employees: arrayOf(state.employees).length,
      brainSources: arrayOf(state.brainSources).length,
      citations: arrayOf(state.citations).length,
      decisions: arrayOf(state.decisions).length,
      events: arrayOf(state.contextEvents).length
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

async function upsertByIndex(
  ctx: any,
  table: string,
  index: string,
  key: string,
  value: Record<string, unknown>
) {
  const patch = compact(value);
  const existing = await ctx.db
    .query(table)
    .withIndex(index, (q: any) => q.eq(Object.keys(value)[0], key))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return existing._id;
  }
  return await ctx.db.insert(table, patch);
}

function arrayOf(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function compact(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function providerForCitation(citation: any) {
  if (!citation.live) return "fixture";
  if (citation.sourceType === "nia" || String(citation.id).startsWith("nia_")) return "nia";
  if (citation.sourceType === "hyperspell" || String(citation.id).startsWith("hyperspell_")) {
    return "hyperspell";
  }
  return "fixture";
}

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
