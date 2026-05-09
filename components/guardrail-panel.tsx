import { AlertTriangle } from "lucide-react";
import type { DemoState } from "@/lib/types";
import { CitationCard } from "@/components/citation-chip";

export function GuardrailPanel({ state }: { state: DemoState }) {
  const guardrail = state.guardrails.find((item) => item.active) ?? state.guardrails[0];
  if (!guardrail) return null;
  const citations = state.citations.filter((citation) => guardrail.citationIds.includes(citation.id));

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>Guardrail</h2>
          <p className="panel-subtitle">Kiro interrupts risky agent work before it lands in a PR.</p>
        </div>
        <span className="status-chip">{guardrail.severity}</span>
      </header>
      <div className="panel-body">
        <article className="guardrail">
          <div className="guardrail-title">
            <AlertTriangle size={16} color="var(--coral)" />
            {guardrail.title}
          </div>
          <p>{guardrail.rule}</p>
          <p style={{ marginTop: 8, color: "var(--ink)" }}>{guardrail.recommendation}</p>
        </article>
        <div className="context-list" style={{ marginTop: 10, maxHeight: 230 }}>
          {citations.map((citation) => (
            <CitationCard citation={citation} key={citation.id} />
          ))}
        </div>
      </div>
    </section>
  );
}
