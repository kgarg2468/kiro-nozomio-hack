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
  const renderedCitationCount = countRenderedCitations(decisions, visibleCitationIds);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>Decision Trail</h2>
          <p className="panel-subtitle">
            One source-grounded chain from customer signal to code convention.
          </p>
        </div>
        <span className="status-chip">{renderedCitationCount} citations</span>
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

function countRenderedCitations(decisions: Decision[], visibleCitationIds: Set<string>) {
  const ids = new Set(visibleCitationIds);
  for (const decision of decisions) {
    for (const id of decision.sourceCitationIds) ids.add(id);
  }
  return ids.size;
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
  const groupedChain = groupByDecisionRole(chain);

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
        {groupedChain.map(({ role, citations }) => (
          <div className="decision-step" key={role}>
            <span className="decision-role">{decisionRoleLabel(role)}</span>
            <div>
              <strong>{decisionRoleDescription(role)}</strong>
              {citations.map((citation) => (
                <div className="decision-source" key={citation.id}>
                  <p>{citation.snippet}</p>
                  <div className="tag-list" style={{ marginTop: 6 }}>
                    <span className="tag">{citation.sourceType}</span>
                    <span className="tag">{citation.captureMethod ?? "connector"}</span>
                    <span className="tag">{citation.live ? "live" : "fixture"}</span>
                  </div>
                </div>
              ))}
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

function decisionRoleDescription(role: DecisionRole | undefined) {
  if (role === "originated") return "Originated in CRM/email";
  if (role === "debated") return "Debated in Slack";
  if (role === "finalized") return "Finalized in meeting transcript";
  if (role === "codified") return "Codified in Notion";
  return "Implemented in PR/Nia code convention";
}

function groupByDecisionRole(chain: SourceCitation[]) {
  const roles: DecisionRole[] = [
    "originated",
    "debated",
    "finalized",
    "codified",
    "implemented"
  ];
  return roles
    .map((role) => ({
      role,
      citations: chain.filter((citation) => (citation.decisionRole ?? "implemented") === role)
    }))
    .filter((group) => group.citations.length > 0);
}
