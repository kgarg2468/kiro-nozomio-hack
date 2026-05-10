import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeWorktreesOnce } from "./analyzer.js";
import { defaultMonitorBin, runRustMonitor } from "./rust-monitor.js";

describe("rust monitor bridge", () => {
  it("parses kiro-monitor JSON output", async () => {
    const result = await runRustMonitor({
      repoRoot: "/repo",
      context: {
        guardrails: [],
        sessions: []
      },
      execMonitor: async () =>
        JSON.stringify({
          repo_id: "repo-1",
          repo_root: "/repo",
          worktrees: [],
          fingerprints: [],
          guardrail_violations: [
            {
              id: "gv-1",
              rule_id: "postgres-only",
              title: "Do not introduce MongoDB",
              severity: "high",
              worktree_id: "wt-a",
              files: ["package.json"],
              evidence: ["Diff matched forbidden pattern `mongodb`."],
              recommendation: "Use Postgres-backed storage only."
            }
          ],
          conflicts: [],
          blast_radius_events: [],
          degraded: false
        })
    });

    expect(result.guardrailViolations).toHaveLength(1);
    expect(result.guardrailViolations[0]?.ruleId).toBe("postgres-only");
  });

  it("falls back to the TypeScript analyzer when the Rust monitor fails", async () => {
    const result = await analyzeWorktreesOnce({
      repoRoot: "/not/a/real/repo",
      repoId: "repo-1",
      rustMonitor: {
        enabled: true,
        execMonitor: async () => {
          throw new Error("monitor unavailable");
        }
      },
      fallbackAnalyzer: async () => ({
        fingerprints: [],
        conflicts: []
      })
    });

    expect(result.degraded).toBe(true);
    expect(result.events.map((event) => event.type)).toContain(
      "monitor.rust_degraded"
    );
  });

  it("maps Rust conflicts to Tempo conflicts with affected files preserved", async () => {
    const result = await analyzeWorktreesOnce({
      repoRoot: "/repo",
      repoId: "repo-1",
      rustMonitor: {
        enabled: true,
        execMonitor: async () =>
          JSON.stringify({
            repo_id: "rust-repo",
            repo_root: "/repo",
            worktrees: [
              {
                id: "rust-wt",
                path: "/repo",
                branch: "main",
                head_sha: "abc123",
                dirty: true,
                detached: false
              }
            ],
            fingerprints: [],
            guardrail_violations: [],
            conflicts: [
              {
                id: "conflict-1",
                risk: "medium",
                conflict_type: "guardrail",
                title: "Forbidden dependency",
                summary: "Use Postgres-backed storage only.",
                affected_worktree_ids: ["rust-wt"],
                affected_surfaces: ["Forbidden dependency"],
                affected_files: ["package.json"],
                evidence: ["Diff matched forbidden pattern `mongodb`."],
                pause: true,
                confidence: 0.82
              }
            ],
            blast_radius_events: [],
            degraded: false
          })
      }
    });

    expect(result.conflicts[0]?.affectedFiles).toEqual(["package.json"]);
  });

  it("resolves the default monitor binary from the Kiro package root, not the target repo cwd", () => {
    const resolved = defaultMonitorBin({
      env: {},
      moduleUrl: new URL("file:///tmp/kiro/packages/coordinator/dist/rust-monitor.js"),
      cwd: "/tmp/some-target-repo"
    });

    expect(resolved).toBe(
      path.resolve("/tmp/kiro", "target/debug/kiro-monitor")
    );
  });
});
