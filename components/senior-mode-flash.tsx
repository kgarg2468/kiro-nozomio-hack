import { GitCompareArrows } from "lucide-react";
import type { SeniorModeFlash as SeniorModeFlashType } from "@/lib/types";

export function SeniorModeFlash({ flash }: { flash: SeniorModeFlashType }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>Senior Mode</h2>
          <p className="panel-subtitle">Tempo-derived fixture conflict for the wider platform claim.</p>
        </div>
        <span className="status-chip">{flash.risk} risk</span>
      </header>
      <div className="panel-body">
        <article className="senior-flash">
          <div className="guardrail-title">
            <GitCompareArrows size={16} color="var(--violet)" />
            {flash.title}
          </div>
          <p>{flash.summary}</p>
          <div className="tag-list">
            {flash.affectedSurfaces.map((surface) => (
              <span className="tag" key={surface}>
                {surface}
              </span>
            ))}
          </div>
          <p style={{ color: "var(--ink)" }}>{flash.recommendation}</p>
        </article>
      </div>
    </section>
  );
}
