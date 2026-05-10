"use client";

import { useMemo, useState } from "react";
import { Monitor, Play, RotateCcw, UserRound } from "lucide-react";
import type { LiveSource } from "@/lib/brain";
import type { DemoStage, DemoState } from "@/lib/types";
import { BrainAssembly } from "@/components/brain-assembly";
import { CharacterDossier } from "@/components/character-dossier";
import { ContextStream } from "@/components/context-stream";
import { GuardrailPanel } from "@/components/guardrail-panel";
import { PixelOffice } from "@/components/pixel-office";
import { PrReadiness } from "@/components/pr-readiness";
import { SeniorModeFlash } from "@/components/senior-mode-flash";
import { TaskPicker } from "@/components/task-picker";
import { officeEntitiesForStage } from "@/lib/office-entities";

const STAGES: Array<{ id: DemoStage; label: string; caption: string }> = [
  { id: "assemble", label: "Assemble", caption: "sources connect" },
  { id: "profile", label: "Profile", caption: "Sam calibrated" },
  { id: "task", label: "Task", caption: "starter issue" },
  { id: "guardrail", label: "Guardrail", caption: "agent corrected" },
  { id: "readiness", label: "PR Ready", caption: "review packet" }
];

export function DemoCockpit({
  initialState,
  liveSource = "providers"
}: {
  initialState: DemoState;
  liveSource?: LiveSource;
}) {
  const [stage, setStage] = useState<DemoStage>("assemble");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stagedEmployees = useMemo(() => {
    return initialState.employees.map((employee) => {
      if (employee.id === "sam") {
        if (stage === "guardrail") return { ...employee, status: "blocked" as const };
        if (stage === "readiness") return { ...employee, status: "ready" as const };
        if (stage === "task") return { ...employee, status: "coding" as const };
      }
      if (employee.id === "codex-session" && stage === "readiness") {
        return { ...employee, status: "ready" as const };
      }
      return employee;
    });
  }, [initialState.employees, stage]);

  const officeEntities = useMemo(
    () => officeEntitiesForStage({ ...initialState, employees: stagedEmployees }, stage),
    [initialState, stagedEmployees, stage]
  );
  const selected = officeEntities.find((entity) => entity.id === selectedId) ?? null;

  const advance = () => {
    const index = STAGES.findIndex((item) => item.id === stage);
    setStage(STAGES[Math.min(index + 1, STAGES.length - 1)]!.id);
  };

  return (
    <main className="demo-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">K</div>
          <div>
            <h1 className="brand-title">Kiro Company Brain</h1>
            <p className="brand-subtitle">Day-one onboarding for coding agents</p>
          </div>
        </div>
        <div className="stage-control">
          <span className="status-chip">
            <span className="status-dot" />
            {initialState.mode === "live" && liveSource === "convex"
              ? "convex live"
              : `${initialState.mode} mode`}
          </span>
          <a
            aria-current={
              initialState.mode === "live" && liveSource === "providers" ? "page" : undefined
            }
            className={`button ${
              initialState.mode === "live" && liveSource === "providers" ? "button-active" : ""
            }`}
            href="/?mode=live&source=providers"
          >
            Live data
          </a>
          <a
            aria-current={
              initialState.mode === "live" && liveSource === "convex" ? "page" : undefined
            }
            className={`button ${
              initialState.mode === "live" && liveSource === "convex" ? "button-active" : ""
            }`}
            href="/?mode=live&source=convex"
          >
            Convex live
          </a>
          <a
            aria-current={initialState.mode === "fixture" ? "page" : undefined}
            className={`button ${initialState.mode === "fixture" ? "button-active" : ""}`}
            href="/?mode=fixture"
          >
            Demo data
          </a>
          <a className="button" href={`/office?mode=${initialState.mode}&source=${liveSource}`}>
            <Monitor size={15} /> Big screen
          </a>
          <button className="button" onClick={() => setSelectedId("sam")}>
            <UserRound size={15} /> Sam
          </button>
          <button className="button" onClick={() => setStage("assemble")}>
            <RotateCcw size={15} /> Reset
          </button>
          <button className="button button-primary" onClick={advance}>
            <Play size={15} /> Next beat
          </button>
        </div>
      </header>

      <div className="cockpit">
        <div className="left-deck">
          <section className="office-frame">
            <header className="office-header">
              <div>
                <h2>Onboarding Floor</h2>
                <p>Sam, source owners, and coding agents move as Kiro resolves context.</p>
              </div>
              <span className="status-chip">{stage}</span>
            </header>
            <div className="office-canvas-wrap">
              <PixelOffice
                entities={officeEntities}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
            <div className="stage-rail">
              {STAGES.map((item) => (
                <button
                  className={`stage-step ${item.id === stage ? "active" : ""}`}
                  key={item.id}
                  onClick={() => setStage(item.id)}
                >
                  <strong>{item.label}</strong>
                  <span>{item.caption}</span>
                </button>
              ))}
            </div>
          </section>

          <BrainAssembly
            coverage={initialState.captureCoverage}
            packets={initialState.brainSources}
            stage={stage}
          />
          <TaskPicker state={initialState} />
          {stageOrder(stage) >= stageOrder("readiness") ? (
            <SeniorModeFlash flash={initialState.seniorMode} />
          ) : null}
        </div>

        <div className="right-deck">
          <ProfilePanel state={initialState} />
          <ContextStream
            events={initialState.contextEvents}
            citations={initialState.citations}
            decisions={initialState.decisions}
            stage={stage}
          />
          {stageOrder(stage) >= stageOrder("guardrail") ? (
            <GuardrailPanel state={initialState} />
          ) : null}
          {stageOrder(stage) >= stageOrder("readiness") ? (
            <PrReadiness state={initialState} />
          ) : null}
        </div>
      </div>

      <CharacterDossier
        entity={selected}
        open={Boolean(selected)}
        state={{ ...initialState, employees: stagedEmployees }}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </main>
  );
}

function ProfilePanel({ state }: { state: DemoState }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>Sam Profile</h2>
          <p className="panel-subtitle">{state.profile.headline}</p>
        </div>
        <div className="score-ring" aria-label="Context risk score">
          <span>{state.profile.contextRiskScore}</span>
          <small>risk</small>
        </div>
      </header>
      <div className="panel-body">
        <p className="panel-subtitle" style={{ marginTop: 0 }}>
          Context risk estimates how likely this agent is missing relevant company context.
        </p>
        <div className="tag-list">
          {state.profile.strengths.map((strength) => (
            <span className="tag" key={strength}>
              {strength}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function stageOrder(stage: DemoStage) {
  return STAGES.findIndex((item) => item.id === stage);
}
