import { mutation } from "./_generated/server";
import { getFixtureDemoState } from "../lib/demo-data";
import type { SourceCitation } from "../lib/types";

export const seedDemoState = mutation({
  args: {},
  handler: async (ctx) => {
    const state = getFixtureDemoState();
    const now = Date.now();

    for (const employee of state.employees) {
      await upsertByExternalId(ctx, "employees", employee.id, {
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

    const existingProfile = await ctx.db
      .query("onboarding_profiles")
      .withIndex("by_employee", (q) => q.eq("employee_external_id", state.profile.employeeId))
      .first();
    const profile = {
      employee_external_id: state.profile.employeeId,
      headline: state.profile.headline,
      strengths: state.profile.strengths,
      weak_spots: state.profile.weakSpots,
      known_modules: state.profile.knownModules,
      source_coverage: state.profile.sourceCoverage,
      context_risk_score: state.profile.contextRiskScore,
      summary: state.profile.summary,
      updated_at: now
    };
    if (existingProfile) await ctx.db.patch(existingProfile._id, profile);
    else await ctx.db.insert("onboarding_profiles", profile);

    for (const source of state.brainSources) {
      const existing = await ctx.db
        .query("brain_sources")
        .withIndex("by_provider", (q) => q.eq("provider", source.provider))
        .first();
      const row = {
        provider: source.provider,
        status: source.provider === "fixture" ? source.status : "connected",
        messages: source.counts.messages,
        docs: source.counts.docs,
        prs: source.counts.prs,
        repos: source.counts.repos,
        crm: source.counts.crm,
        emails: source.counts.emails,
        meetings: source.counts.meetings,
        decisions: source.counts.decisions,
        summary: source.summary.replace(/^Fixture packet:/, "Convex demo packet:"),
        updated_at: now
      } as const;
      if (existing) await ctx.db.patch(existing._id, row);
      else await ctx.db.insert("brain_sources", row);
    }

    for (const citation of state.citations) {
      await upsertByExternalId(ctx, "source_citations", citation.id, {
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

    for (const decision of state.decisions) {
      await upsertByExternalId(ctx, "decisions", decision.id, {
        external_id: decision.id,
        title: decision.title,
        summary: decision.summary,
        status: decision.status,
        final_recommendation: decision.finalRecommendation,
        source_citation_external_ids: decision.sourceCitationIds,
        owner: decision.owner,
        freshness: decision.freshness,
        updated_at: now
      });
    }

    await upsertByExternalId(ctx, "tasks", state.task.id, {
      external_id: state.task.id,
      title: state.task.title,
      issue_id: state.task.issueId,
      owner: state.task.owner,
      matched_employee_external_id: state.task.matchedEmployeeId,
      status: state.task.status,
      progress: state.task.progress,
      why_matched: state.task.whyMatched,
      files: state.task.files,
      updated_at: now
    });

    for (const agent of state.agents) {
      await upsertByExternalId(ctx, "agent_sessions", agent.id, {
        external_id: agent.id,
        kind: agent.kind,
        display_name: agent.displayName,
        owner_employee_external_id: agent.ownerEmployeeId,
        current_plan: agent.currentPlan,
        status: agent.status,
        updated_at: now
      });
    }

    for (const event of state.contextEvents) {
      await upsertByExternalId(ctx, "context_events", event.id, {
        external_id: event.id,
        stage: event.stage,
        title: event.title,
        body: event.body,
        citation_external_ids: event.citationIds,
        created_at: now
      });
    }

    for (const guardrail of state.guardrails) {
      await upsertByExternalId(ctx, "guardrails", guardrail.id, {
        external_id: guardrail.id,
        title: guardrail.title,
        severity: guardrail.severity,
        rule: guardrail.rule,
        recommendation: guardrail.recommendation,
        citation_external_ids: guardrail.citationIds,
        active: guardrail.active,
        updated_at: now
      });
    }

    await upsertByExternalId(ctx, "pr_readiness_reports", state.readiness.id, {
      external_id: state.readiness.id,
      task_external_id: state.readiness.taskId,
      verdict: state.readiness.verdict,
      summary: state.readiness.summary,
      tests: state.readiness.tests,
      risk: state.readiness.risk,
      recommendation: state.readiness.recommendation,
      citation_external_ids: state.readiness.citationIds,
      created_at: now
    });

    return {
      ok: true,
      employees: state.employees.length,
      citations: state.citations.length,
      brainSources: state.brainSources.length
    };
  }
});

async function upsertByExternalId(
  ctx: Parameters<Parameters<typeof mutation>[0]["handler"]>[0],
  table:
    | "employees"
    | "source_citations"
    | "decisions"
    | "tasks"
    | "agent_sessions"
    | "context_events"
    | "guardrails"
    | "pr_readiness_reports",
  externalId: string,
  row: Record<string, unknown>
) {
  const existing = await ctx.db
    .query(table)
    .withIndex("by_external_id", (q) => q.eq("external_id", externalId))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, row);
    return existing._id;
  }
  return await ctx.db.insert(table, row);
}

function providerForCitation(citation: SourceCitation) {
  if (citation.sourceType === "nia") return "nia";
  if (citation.captureMethod === "fixture" || citation.sourceType === "fixture") return "fixture";
  return "hyperspell";
}
