import type { ConfidenceLabel, SourceCitation } from "@/lib/types";

export function ConfidenceChip({ label }: { label: ConfidenceLabel }) {
  return (
    <span className={`confidence ${label.toLowerCase()}`} title={confidenceDescription(label)}>
      {label}
    </span>
  );
}

export function CitationCard({ citation }: { citation: SourceCitation }) {
  return (
    <article className="citation-card">
      <header>
        <div>
          <strong>{citation.title}</strong>
          <div className="tag-list" style={{ marginTop: 6 }}>
            <span className="tag">{citation.sourceType}</span>
            <span className="tag">{citation.live ? "live" : "fixture"}</span>
          </div>
        </div>
        <ConfidenceChip label={citation.confidence} />
      </header>
      <p>{citation.snippet}</p>
    </article>
  );
}

function confidenceDescription(label: ConfidenceLabel) {
  if (label === "Decided") return "Finalized across sources";
  if (label === "Considered") return "Discussed but not resolved";
  if (label === "Convention") return "Inferred from code or PR patterns";
  return "Old or possibly superseded";
}
