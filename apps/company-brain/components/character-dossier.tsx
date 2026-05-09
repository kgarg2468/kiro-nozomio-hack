"use client";

import type { CSSProperties, ReactNode } from "react";
import type { DemoState } from "@/lib/types";
import type { OfficeEntity } from "@/lib/office-entities";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

interface CharacterDossierProps {
  entity: OfficeEntity | null;
  state: DemoState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CharacterDossier({
  entity,
  state,
  open,
  onOpenChange
}: CharacterDossierProps) {
  if (!entity) return null;

  const isSam = entity.id === state.profile.employeeId;
  const profile = state.profile;
  const status = statusView(entity);
  const displayName = state.employees.find((employee) => employee.id === entity.id)?.name ?? entity.name;
  const recentEvents = state.contextEvents.slice(0, 3);
  const avatarStyle = avatarFor(entity.paletteIdx);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div
              style={avatarStyle}
              className="shrink-0 border border-[var(--border)] bg-[var(--surface-raised)]"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex flex-wrap items-center gap-2">
                <span>{displayName}</span>
                <Badge variant={status.variant}>{status.label}</Badge>
              </DialogTitle>
              <DialogDescription>
                {entity.role ?? (entity.kind === "agent" ? "Kiro coding agent" : "Company brain participant")}
              </DialogDescription>
              <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-mono text-[var(--text-dim)]">
                <span>
                  <span className="text-[var(--text-muted)]">Kind:</span>{" "}
                  <span className="text-[var(--text)]">{entity.kind}</span>
                </span>
                <span>
                  <span className="text-[var(--text-muted)]">State:</span>{" "}
                  <span className="text-[var(--text)]">{entity.status}</span>
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[62vh] space-y-5 overflow-y-auto pr-1">
          {isSam ? (
            <>
              <Section label="Onboarding fit">
                <p className="text-[11px] font-mono leading-relaxed text-[var(--text-muted)]">
                  {profile.summary}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="ready">Coverage {profile.sourceCoverage}%</Badge>
                  <Badge variant="blocked">Risk {profile.contextRiskScore}</Badge>
                  <Badge variant="active">{state.task.issueId}</Badge>
                </div>
              </Section>

              <Section label="Context risk">
                <p className="text-[11px] font-mono leading-relaxed text-[var(--text-muted)]">
                  How likely Sam's coding agent is missing relevant company context from outside the
                  capture window.
                </p>
              </Section>

              <Section label="Current task">
                <p className="mb-3 text-[11px] font-mono leading-relaxed text-[var(--text)]">
                  {state.task.title}
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden bg-[var(--border)]">
                    <div
                      className="h-full bg-[var(--accent)]"
                      style={{ width: `${state.task.progress}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--text-dim)]">
                    {state.task.progress}%
                  </span>
                </div>
              </Section>

              <div className="grid gap-4 sm:grid-cols-2">
                <Section label="Strengths">
                  <DossierTags items={profile.strengths} />
                </Section>
                <Section label="Watch areas">
                  <DossierTags items={profile.weakSpots} />
                </Section>
              </div>

              <Section label="Known modules">
                <DossierTags items={profile.knownModules} />
              </Section>
            </>
          ) : (
            <Section label={entity.kind === "agent" ? "Agent brief" : "Team context"}>
              <p className="text-[11px] font-mono leading-relaxed text-[var(--text-muted)]">
                {entity.kind === "agent"
                  ? `${entity.name} is visible on the office floor while it works from Sam's assembled company context.`
                  : `${entity.name} appears in Sam's source-backed ownership, review, or pair-coding context.`}
              </p>
            </Section>
          )}

          <Section label="Recent context">
            <ul className="space-y-1.5">
              {recentEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex gap-2 text-[11px] font-mono leading-relaxed text-[var(--text-muted)]"
                >
                  <span className="shrink-0 text-[var(--accent)]">·</span>
                  <span>
                    <span className="text-[var(--text)]">{event.title}</span> — {event.body}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function avatarFor(paletteIdx: number): CSSProperties {
  const sheetW = 112 * 3;
  const sheetH = 96 * 3;
  const frameW = 16 * 3;
  const frameH = 32 * 3;
  return {
    width: frameW,
    height: frameH,
    backgroundImage: `url(/assets/pixel/characters/char_${paletteIdx % 6}.png)`,
    backgroundSize: `${sheetW}px ${sheetH}px`,
    backgroundPosition: `-${frameW}px 0px`,
    imageRendering: "pixelated"
  };
}

function statusView(entity: OfficeEntity): {
  variant: "active" | "onboarding" | "coding" | "blocked" | "ready" | "merged";
  label: string;
} {
  if (entity.status === "idle") return { variant: "active", label: "Idle" };
  if (entity.status === "working") return { variant: "coding", label: "Working" };
  const labels = {
    onboarding: "Onboarding",
    active: "Active",
    coding: "Coding",
    blocked: "Guardrail",
    ready: "PR Ready",
    merged: "Merged"
  } as const;
  return { variant: entity.status, label: labels[entity.status] };
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-dim)]">
        {label}
      </div>
      {children}
    </div>
  );
}

function DossierTags({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          className="border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 text-[10px] font-mono text-[var(--text-muted)]"
          key={item}
        >
          {item}
        </span>
      ))}
    </div>
  );
}
