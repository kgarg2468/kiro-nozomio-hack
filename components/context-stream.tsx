import type { ContextEvent, Decision, DemoStage, DecisionRole, SourceCitation } from "@/lib/types";
import { CitationCard } from "@/components/citation-chip";

export function ContextStream({
  events,
  citations,
  decisions,
  stage
}: {
  events: ContextEvent[];
  citations: SourceCitation[];
  decisions: Decision[];
  stage: DemoStage;
}) {
  const visibleEvents = events.filter((event) => stageOrder(event.stage) <= stageOrder(stage));
  const visibleCitationIds = new Set(visibleEvents.flatMap((event) => event.citationIds));
  const visibleCitations = citations.filter((citation) => visibleCitationIds.has(citation.id));
  const citationById = new Map(citations.map((citation) => [citation.id, citation]));

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>Context Stream</h2>
          <p className="panel-subtitle">Source-backed decisions flowing into the coding agent.</p>
        </div>
        <span className="status-chip">{visibleCitations.length} citations</span>
      </header>
      <div className="panel-body">
        <div className="context-list">
          {decisions.map((decision) => (
            <DecisionTrailCard
              citationById={citationById}
              decision={decision}
              key={decision.id}
            />
          ))}
          {visibleEvents.map((event) => (
            <article className="citation-card" key={event.id}>
              <header>
                <strong>{event.title}</strong>
                <span className="tag">{event.stage}</span>
              </header>
              <p>{event.body}</p>
            </article>
          ))}
          {visibleCitations.map((citation) => (
            <CitationCard citation={citation} key={citation.id} />
          ))}
        </div>
      </div>
    </section>
  );
}

function stageOrder(stage: DemoStage) {
  return ["assemble", "profile", "task", "guardrail", "readiness"].indexOf(stage);
}

function DecisionTrailCard({
  citationById,
  decision
}: {
  citationById: Map<string, SourceCitation>;
  decision: Decision;
}) {
  const chain = decision.sourceCitationIds
    .map((id) => citationById.get(id))
    .filter((citation): citation is SourceCitation => Boolean(citation))
    .sort((a, b) => decisionRoleOrder(a.decisionRole) - decisionRoleOrder(b.decisionRole));

  return (
    <article className="decision-card">
      <header>
        <div>
          <strong>{decision.title}</strong>
          <p>{decision.summary}</p>
        </div>
        <span className="status-chip">{decision.status}</span>
      </header>
      <div className="decision-chain">
        {chain.map((citation) => (
          <div className="decision-step" key={citation.id}>
            <span className="decision-role">{decisionRoleLabel(citation.decisionRole)}</span>
            <div>
              <strong>{citation.title}</strong>
              <p>{citation.snippet}</p>
              <div className="tag-list" style={{ marginTop: 6 }}>
                <span className="tag">{citation.sourceType}</span>
                <span className="tag">{citation.captureMethod ?? "connector"}</span>
                <span className="tag">{citation.live ? "live" : "fixture"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <footer>
        <strong>Recommendation</strong>
        <p>{decision.finalRecommendation}</p>
      </footer>
    </article>
  );
}

function decisionRoleOrder(role: DecisionRole | undefined) {
  return ["originated", "debated", "finalized", "codified", "implemented"].indexOf(
    role ?? "implemented"
  );
}

function decisionRoleLabel(role: DecisionRole | undefined) {
  if (role === "originated") return "Origin";
  if (role === "debated") return "Debate";
  if (role === "finalized") return "Final";
  if (role === "codified") return "Codified";
  return "Code";
}
