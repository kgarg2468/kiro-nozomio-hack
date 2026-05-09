import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  Database,
  FileText,
  GitPullRequest,
  Mail,
  MessageSquare,
  Mic2,
  Network
} from "lucide-react";
import type { BrainSourcePacket, CaptureCoverageItem, DemoStage } from "@/lib/types";

export function BrainAssembly({
  coverage,
  packets,
  stage
}: {
  coverage: CaptureCoverageItem[];
  packets: BrainSourcePacket[];
  stage: DemoStage;
}) {
  const progress = stage === "assemble" ? 74 : 100;
  const missingCount = coverage.filter((item) => item.status === "missing").length;
  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>Brain Assembly</h2>
          <p className="panel-subtitle">
            Kiro turns scattered conversations into source-backed decisions agents can act on.
          </p>
        </div>
        <span className="status-chip">
          <span className="status-dot" />
          {progress}% indexed
        </span>
      </header>
      <div className="panel-body">
        <div className="capture-window">
          <div className="capture-window-copy">
            <strong>Context Capture Window</strong>
            <span>
              {missingCount
                ? `${missingCount} source gap may hide relevant decisions.`
                : "Captured sources keep the coding agent in the room."}
            </span>
          </div>
          <div className="capture-strip">
            {coverage.map((item) => (
              <div className={`capture-pill ${item.status}`} key={item.id}>
                {coverageIcon(item)}
                <span>{item.label}</span>
                <small>{item.status}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="source-grid">
          {packets.map((packet) => (
            <article className="source-tile" key={packet.provider}>
              <div className="source-topline">
                <div className="source-name">
                  {providerIcon(packet.provider)}
                  <span>{providerLabel(packet.provider)}</span>
                </div>
                <span className="tag">{packet.status}</span>
              </div>
              <p className="panel-subtitle">{packet.summary}</p>
              <div className="metric-row">
                {packet.counts.messages ? (
                  <span className="mini-metric">
                    <MessageSquare size={12} /> {packet.counts.messages} messages
                  </span>
                ) : null}
                {packet.counts.docs ? (
                  <span className="mini-metric">
                    <FileText size={12} /> {packet.counts.docs} docs
                  </span>
                ) : null}
                {packet.counts.prs ? (
                  <span className="mini-metric">
                    <GitPullRequest size={12} /> {packet.counts.prs} PRs
                  </span>
                ) : null}
                {packet.counts.emails ? (
                  <span className="mini-metric">
                    <Mail size={12} /> {packet.counts.emails} emails
                  </span>
                ) : null}
                {packet.counts.crm ? (
                  <span className="mini-metric">
                    <BriefcaseBusiness size={12} /> {packet.counts.crm} CRM
                  </span>
                ) : null}
                {packet.counts.meetings ? (
                  <span className="mini-metric">
                    <Mic2 size={12} /> {packet.counts.meetings} meeting
                  </span>
                ) : null}
                {packet.counts.decisions ? (
                  <span className="mini-metric">
                    <CheckCircle2 size={12} /> {packet.counts.decisions} decisions
                  </span>
                ) : null}
                {packet.counts.repos ? (
                  <span className="mini-metric">
                    <Database size={12} /> {packet.counts.repos} repo
                  </span>
                ) : null}
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${packet.status === "syncing" ? 58 : 100}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function providerIcon(provider: BrainSourcePacket["provider"]) {
  if (provider === "nia") return <Database size={15} color="var(--cyan)" />;
  if (provider === "hyperspell") return <Network size={15} color="var(--green)" />;
  return <FileText size={15} color="var(--gold)" />;
}

function providerLabel(provider: BrainSourcePacket["provider"]) {
  if (provider === "nia") return "Nia";
  if (provider === "hyperspell") return "Hyperspell";
  return "Fixture";
}

function coverageIcon(item: CaptureCoverageItem) {
  if (item.status === "missing") return <AlertTriangle size={13} />;
  if (item.sourceType === "nia") return <Database size={13} />;
  if (item.sourceType === "gmail") return <Mail size={13} />;
  if (item.sourceType === "crm") return <BriefcaseBusiness size={13} />;
  if (item.sourceType === "meeting" || item.sourceType === "transcript") return <Mic2 size={13} />;
  if (item.sourceType === "slack") return <MessageSquare size={13} />;
  return <CheckCircle2 size={13} />;
}
