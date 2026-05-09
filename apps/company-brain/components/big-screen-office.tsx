"use client";

import { useState } from "react";
import type { DemoState } from "@/lib/types";
import { CharacterDossier } from "@/components/character-dossier";
import { PixelOffice } from "@/components/pixel-office";
import { officeEntitiesForStage } from "@/lib/office-entities";

export function BigScreenOffice({ state }: { state: DemoState }) {
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
          <a className="button" href="/">
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
