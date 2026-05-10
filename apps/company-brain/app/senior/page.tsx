import { GitBranch, GitCompareArrows, RadioTower, ShieldAlert } from "lucide-react";
import { approveDecisionAction, forceAnalyzeAction, updateConflictStatusAction } from "@/app/senior/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSeniorSnapshot } from "@/lib/senior-api";

export default async function SeniorPage() {
  const snapshot = await getSeniorSnapshot();
  const activeConflict = snapshot.conflicts[0] ?? null;
  const activeAdvisory = activeConflict
    ? snapshot.advisories.find((item) => item.conflictId === activeConflict.id)
    : null;

  return (
    <main className="demo-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">K</div>
          <div>
            <h1 className="brand-title">Kiro Senior Mode</h1>
            <p className="brand-subtitle">Live worktree fingerprints and branch realignment</p>
          </div>
        </div>
        <div className="stage-control">
          <span className="status-chip">
            <span className="status-dot" />
            {snapshot.connected ? "coordinator online" : "coordinator offline"}
          </span>
          <form action={forceAnalyzeAction}>
            <button className="button button-primary" type="submit">
              <RadioTower size={15} /> Analyze
            </button>
          </form>
          <a className="button" href="/">
            Onboard
          </a>
        </div>
      </header>

      <div className="cockpit">
        <div className="left-deck">
          <section className="panel">
            <header className="panel-header">
              <div>
                <h2>Coordinator</h2>
                <p className="panel-subtitle">{snapshot.coordinatorUrl}</p>
              </div>
              <span className="status-chip">
                OpenAI {snapshot.settings.openai.configured ? "ready" : "heuristic"}
              </span>
            </header>
            <div className="panel-body">
              <div className="tag-list">
                <span className="tag">{snapshot.worktrees.length} worktrees</span>
                <span className="tag">{snapshot.agents.length} agents</span>
                <span className="tag">{snapshot.fingerprints.length} fingerprints</span>
                <span className="tag">{snapshot.conflicts.length} conflicts</span>
              </div>
              <p className="panel-subtitle" style={{ marginBottom: 0 }}>
                MCP: {snapshot.settings.codex.mcpUrl}
              </p>
              <p className="panel-subtitle" style={{ marginBottom: 0 }}>
                GitHub memory: {snapshot.settings.github?.repos.join(", ") || "not configured"}
              </p>
            </div>
          </section>

          <section className="panel">
            <header className="panel-header">
              <div>
                <h2>Branches</h2>
                <p className="panel-subtitle">Every dirty worktree gets a current fingerprint.</p>
              </div>
              <GitBranch size={17} />
            </header>
            <div className="panel-body context-list" style={{ maxHeight: 520 }}>
              {snapshot.worktrees.map((worktree) => {
                const agent = snapshot.agents.find((item) => item.worktreeId === worktree.id);
                const fingerprint = snapshot.fingerprints.find((item) => item.worktreeId === worktree.id);
                return (
                  <article className="citation-card" key={worktree.id}>
                    <div className="citation-topline">
                      <Badge variant={worktree.dirty ? "blocked" : "default"}>
                        {worktree.dirty ? "dirty" : "clean"}
                      </Badge>
                      <span>{worktree.branch ?? "detached"}</span>
                    </div>
                    <strong>{agent?.displayName ?? "Unjoined worktree"}</strong>
                    <p>{agent?.currentPlan ?? "No branch intent submitted through kiro_plan yet."}</p>
                    <p className="panel-subtitle">{fingerprint?.semanticSummary ?? worktree.path}</p>
                  </article>
                );
              })}
              {snapshot.worktrees.length === 0 ? (
                <p className="panel-subtitle">Start `kiro-senior` from a git repo to populate this view.</p>
              ) : null}
            </div>
          </section>
        </div>

        <div className="right-deck">
          <section className="panel">
            <header className="panel-header">
              <div>
                <h2>Conflict Prediction</h2>
                <p className="panel-subtitle">Pause, approve, and realign affected agents.</p>
              </div>
              <span className="status-chip">{activeConflict?.risk ?? "low"} risk</span>
            </header>
            <div className="panel-body">
              {activeConflict ? (
                <article className="guardrail">
                  <div className="guardrail-title">
                    <ShieldAlert size={16} color="var(--coral)" />
                    {activeConflict.title}
                  </div>
                  <p>{activeConflict.summary}</p>
                  {activeConflict.classification?.blastRadiusSummary ? (
                    <p style={{ color: "var(--ink)" }}>
                      {activeConflict.classification.blastRadiusSummary}
                    </p>
                  ) : null}
                  <div className="tag-list">
                    {activeConflict.affectedSurfaces.map((surface) => (
                      <span className="tag" key={surface}>
                        {surface}
                      </span>
                    ))}
                  </div>
                  <div className="stage-control" style={{ justifyContent: "flex-start" }}>
                    {(["acknowledged", "resolved", "ignored"] as const).map((status) => (
                      <form action={updateConflictStatusAction} key={status}>
                        <input name="conflictId" type="hidden" value={activeConflict.id} />
                        <input name="status" type="hidden" value={status} />
                        <Button size="sm" type="submit" variant="outline">
                          {status}
                        </Button>
                      </form>
                    ))}
                  </div>
                </article>
              ) : (
                <article className="guardrail">
                  <div className="guardrail-title">
                    <GitCompareArrows size={16} color="var(--violet)" />
                    No active blocking conflict
                  </div>
                  <p>Dirty worktrees will appear here when their fingerprints overlap on a risky contract surface.</p>
                </article>
              )}
            </div>
          </section>

          {activeConflict && activeAdvisory ? (
            <section className="panel">
              <header className="panel-header">
                <div>
                  <h2>Unified Spec</h2>
                  <p className="panel-subtitle">User approval queues role-specific MCP directions.</p>
                </div>
              </header>
              <div className="panel-body context-list" style={{ maxHeight: 440 }}>
                {activeAdvisory.options.map((option) => (
                  <form action={approveDecisionAction} className="citation-card" key={option.id}>
                    <input name="conflictId" type="hidden" value={activeConflict.id} />
                    <input name="selectedOptionId" type="hidden" value={option.id} />
                    <input name="selectedOptionTitle" type="hidden" value={option.title} />
                    <input name="selectedOptionDirection" type="hidden" value={option.direction} />
                    <strong>{option.title}</strong>
                    <p>{option.direction}</p>
                    <p className="panel-subtitle">{option.rationale}</p>
                    <select
                      name="ownerAgentSessionId"
                      defaultValue=""
                      style={{
                        background: "var(--surface-raised)",
                        border: "1px solid var(--border)",
                        color: "var(--ink)",
                        fontSize: 12,
                        minHeight: 32,
                        padding: "0 8px"
                      }}
                    >
                      <option value="">No explicit owner</option>
                      {snapshot.agents
                        .filter((agent) => activeConflict.affectedWorktreeIds.includes(agent.worktreeId ?? ""))
                        .map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.displayName}
                          </option>
                        ))}
                    </select>
                    <Button type="submit">Approve</Button>
                  </form>
                ))}
              </div>
            </section>
          ) : null}

          <section className="panel">
            <header className="panel-header">
              <div>
                <h2>GitHub Memory</h2>
                <p className="panel-subtitle">Prior issues and PRs used as company brain evidence.</p>
              </div>
            </header>
            <div className="panel-body context-list" style={{ maxHeight: 340 }}>
              {snapshot.githubMemory.map((citation) => (
                <article className="citation-card" key={citation.id}>
                  <div className="citation-topline">
                    <Badge>{citation.type}</Badge>
                    <span>{citation.repo}#{citation.number}</span>
                  </div>
                  <strong>{citation.title}</strong>
                  <p>{citation.snippet}</p>
                  <p className="panel-subtitle">{citation.relevanceReason}</p>
                </article>
              ))}
              {snapshot.githubMemory.length === 0 ? (
                <p className="panel-subtitle">Set `KIRO_GITHUB_REPOS` and run analysis to add GitHub memory.</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
