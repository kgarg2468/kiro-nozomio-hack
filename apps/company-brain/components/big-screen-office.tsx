"use client";

import { useState } from "react";
import type { LiveSource } from "@/lib/brain";
import type { DemoState } from "@/lib/types";
import { CharacterDossier } from "@/components/character-dossier";
import { PixelOffice } from "@/components/pixel-office";
import { officeEntitiesForStage } from "@/lib/office-entities";

export function BigScreenOffice({
  state,
  liveSource = "providers"
}: {
  state: DemoState;
  liveSource?: LiveSource;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const entities = officeEntitiesForStage(state, "assemble");
  const selected = entities.find((entity) => entity.id === selectedId) ?? null;

  return (
    <main className="big-screen">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">K</div>
          <div>
            <h1 className="brand-title">Kiro Office</h1>
            <p className="brand-subtitle">Big-screen company brain view</p>
          </div>
        </div>
        <div className="stage-control">
          <span className="status-chip">
            <span className="status-dot" />
            {state.mode === "live" && liveSource === "convex"
              ? "convex live"
              : `${state.mode} mode`}
          </span>
          <a
            aria-current={state.mode === "live" && liveSource === "providers" ? "page" : undefined}
            className={`button ${
              state.mode === "live" && liveSource === "providers" ? "button-active" : ""
            }`}
            href="/office?mode=live&source=providers"
          >
            Live data
          </a>
          <a
            aria-current={state.mode === "live" && liveSource === "convex" ? "page" : undefined}
            className={`button ${
              state.mode === "live" && liveSource === "convex" ? "button-active" : ""
            }`}
            href="/office?mode=live&source=convex"
          >
            Convex live
          </a>
          <a
            aria-current={state.mode === "fixture" ? "page" : undefined}
            className={`button ${state.mode === "fixture" ? "button-active" : ""}`}
            href="/office?mode=fixture"
          >
            Demo data
          </a>
          <a className="button" href={`/?mode=${state.mode}&source=${liveSource}`}>
            Cockpit
          </a>
          <span className="status-chip">{entities.length} people and agents</span>
        </div>
      </header>
      <section className="office-frame big-office">
        <div className="office-canvas-wrap">
          <PixelOffice
            entities={entities}
            selectedId={selectedId}
            onSelect={setSelectedId}
            big
          />
        </div>
      </section>
      <CharacterDossier
        entity={selected}
        open={Boolean(selected)}
        state={state}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </main>
  );
}
