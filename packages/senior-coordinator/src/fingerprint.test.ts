import { describe, expect, it } from "vitest";
import { createHeuristicFingerprint } from "./fingerprint.js";

describe("heuristic fingerprinting", () => {
  it("turns a scoped schema diff into a live fingerprint", () => {
    const fingerprint = createHeuristicFingerprint({
      repoId: "repo-1",
      worktreeId: "wt-a",
      diffHash: "hash-a",
      files: [
        {
          path: "src/db/schema.ts",
          content: "export interface Task { id: string; priority: string }\n"
        }
      ],
      createdAt: 1778000000000
    });

    expect(fingerprint.filesTouched).toEqual(["src/db/schema.ts"]);
    expect(fingerprint.surfaces.map((surface) => surface.label)).toContain(
      "Task model"
    );
    expect(fingerprint.semanticSummary).toContain("Task model");
    expect(fingerprint.source).toBe("heuristic");
  });

  it("uses diff hunks for touched symbols in broad types files", () => {
    const fingerprint = createHeuristicFingerprint({
      repoId: "repo-1",
      worktreeId: "wt-a",
      diffHash: "hash-a",
      files: [
        {
          path: "apps/company-brain/lib/types.ts",
          content: [
            'export type ConfidenceLabel = "Decided" | "Convention";',
            "export interface SourceCitation {",
            "  id: string;",
            "  sourceType: string;",
            "}",
            "export interface AgentSession {",
            "  id: string;",
            "}"
          ].join("\n")
        }
      ],
      diff: [
        "diff --git a/apps/company-brain/lib/types.ts b/apps/company-brain/lib/types.ts",
        "--- a/apps/company-brain/lib/types.ts",
        "+++ b/apps/company-brain/lib/types.ts",
        "@@ -1,6 +1,7 @@",
        ' export type ConfidenceLabel = "Decided" | "Convention";',
        " export interface SourceCitation {",
        "   id: string;",
        "+  priority: number;",
        "   sourceType: string;",
        " }",
        " export interface AgentSession {"
      ].join("\n"),
      createdAt: 1778000000000
    });

    expect(fingerprint.symbols.modified).toEqual(["SourceCitation"]);
    expect(fingerprint.surfaces.map((surface) => surface.label)).toEqual([
      "SourceCitation type"
    ]);
    expect(fingerprint.semanticSummary).toContain("SourceCitation type");
  });
});
