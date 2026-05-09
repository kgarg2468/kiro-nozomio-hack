import { CheckCircle2, GitPullRequest, ShieldCheck } from "lucide-react";
import type { DemoState } from "@/lib/types";

export function PrReadiness({ state }: { state: DemoState }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>PR Readiness</h2>
          <p className="panel-subtitle">{state.readiness.summary}</p>
        </div>
        <span className="status-chip">{state.readiness.verdict}</span>
      </header>
      <div className="panel-body">
        <div className="readiness-grid">
          <div className="readiness-row">
            <div className="readiness-title">
              <ShieldCheck size={15} color="var(--green)" /> Risk
            </div>
            <span className="readiness-value">{state.readiness.risk}</span>
          </div>
          <div className="readiness-row">
            <div className="readiness-title">
              <CheckCircle2 size={15} color="var(--cyan)" /> Tests
            </div>
            <span className="readiness-value">{state.readiness.tests.length}</span>
          </div>
          <div className="readiness-row">
            <div className="readiness-title">
              <GitPullRequest size={15} color="var(--violet)" /> Reviewer
            </div>
            <span className="readiness-value">{state.task.owner.split(" ")[0]}</span>
          </div>
        </div>
        <article className="readiness-row" style={{ marginTop: 10 }}>
          <p>{state.readiness.recommendation}</p>
          <div className="tag-list">
            {state.readiness.tests.map((test) => (
              <span className="tag" key={test}>
                {test}
              </span>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
