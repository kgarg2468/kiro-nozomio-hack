"use client";

import { useEffect, useMemo, useState } from "react";
import { GitCompareArrows } from "lucide-react";
import type { SeniorModeFlash as SeniorModeFlashType } from "@/lib/types";

export function SeniorModeFlash({ flash }: { flash: SeniorModeFlashType }) {
  const [liveFlash, setLiveFlash] = useState<SeniorModeFlashType | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/senior", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((snapshot: SeniorApiSnapshot | null) => {
        const conflict = snapshot?.conflicts?.[0];
        if (!conflict || cancelled) return;
        setLiveFlash({
          title: conflict.title,
          risk: conflict.risk,
          summary:
            conflict.classification?.blastRadiusSummary ??
            conflict.summary,
          affectedSurfaces: conflict.affectedSurfaces,
          recommendation:
            conflict.classification?.unifiedSpecRecommendation ??
            conflict.classification?.rationale ??
            "Approve a Kiro decision to queue role-specific MCP directions."
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const display = useMemo(() => liveFlash ?? flash, [flash, liveFlash]);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>Senior Mode</h2>
          <p className="panel-subtitle">
            {liveFlash ? "Live Kiro conflict from the local coordinator." : "Fixture fallback for the wider platform claim."}
          </p>
        </div>
        <span className="status-chip">{display.risk} risk</span>
      </header>
      <div className="panel-body">
        <article className="senior-flash">
          <div className="guardrail-title">
            <GitCompareArrows size={16} color="var(--violet)" />
            {display.title}
          </div>
          <p>{display.summary}</p>
          <div className="tag-list">
            {display.affectedSurfaces.map((surface) => (
              <span className="tag" key={surface}>
                {surface}
              </span>
            ))}
          </div>
          <p style={{ color: "var(--ink)" }}>{display.recommendation}</p>
        </article>
      </div>
    </section>
  );
}

interface SeniorApiSnapshot {
  conflicts?: Array<{
    title: string;
    risk: "low" | "medium" | "high";
    summary: string;
    affectedSurfaces: string[];
    classification?: {
      rationale?: string;
      blastRadiusSummary?: string;
      unifiedSpecRecommendation?: string;
    };
  }>;
}
