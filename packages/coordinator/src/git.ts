import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAX_UNTRACKED_FILE_BYTES = 128 * 1024;

export interface GitWorktree {
  path: string;
  headSha: string | null;
  branch: string | null;
  bare: boolean;
  detached: boolean;
}

export interface GitStatusEntry {
  path: string;
  status: "added" | "deleted" | "modified" | "renamed" | "untracked";
}

export async function findGitRoot(cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], {
      cwd
    });
    return stdout.trim();
  } catch (_error) {
    throw new Error(`Tempo must be run inside a git repository: ${cwd}`);
  }
}

export async function listWorktrees(repoRoot: string): Promise<GitWorktree[]> {
  const { stdout } = await execFileAsync("git", ["worktree", "list", "--porcelain"], {
    cwd: repoRoot
  });
  return parseWorktreePorcelain(stdout);
}

export function parseWorktreePorcelain(output: string): GitWorktree[] {
  const blocks = output
    .split(/\n(?=worktree )/g)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block) => {
    const lines = block.split("\n");
    const state: GitWorktree = {
      path: "",
      headSha: null,
      branch: null,
      bare: false,
      detached: false
    };

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        state.path = line.slice("worktree ".length);
      } else if (line.startsWith("HEAD ")) {
        state.headSha = line.slice("HEAD ".length);
      } else if (line.startsWith("branch ")) {
        const ref = line.slice("branch ".length);
        state.branch = ref.replace(/^refs\/heads\//, "");
      } else if (line === "bare") {
        state.bare = true;
      } else if (line === "detached") {
        state.detached = true;
      }
    }

    return state;
  });
}

export async function getWorktreeDiff(worktreePath: string): Promise<string> {
  const [unstaged, staged, status] = await Promise.all([
    gitOutput(worktreePath, ["diff", "--no-ext-diff"]),
    gitOutput(worktreePath, ["diff", "--cached", "--no-ext-diff"]),
    gitOutput(worktreePath, [
      "status",
      "--porcelain=v1",
      "--untracked-files=all"
    ])
  ]);
  const untracked = await untrackedFileDiffs(worktreePath, status);
  return [unstaged, staged, untracked]
    .filter((part) => part.trim().length > 0)
    .join("\n");
}

export function parseStatusPorcelain(output: string): GitStatusEntry[] {
  return output
    .split(/\r?\n/g)
    .filter(Boolean)
    .flatMap((line) => {
      if (line.length < 4 || line.startsWith("!! ")) return [];
      const code = line.slice(0, 2);
      const filePath = parseStatusPath(line.slice(3).trim());
      if (!filePath) return [];
      const status: GitStatusEntry["status"] =
        code === "??"
          ? "untracked"
          : code.includes("D")
            ? "deleted"
            : code.includes("A")
              ? "added"
              : code.includes("R")
                ? "renamed"
                : "modified";
      return [{ path: filePath, status }];
    });
}

export function normalizeDiff(diff: string): string {
  return diff
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => {
      if (line.startsWith("index ")) return false;
      if (line.startsWith("similarity index ")) return false;
      return true;
    })
    .join("\n")
    .trim();
}

export function hashNormalizedDiff(normalizedDiff: string): string {
  return createHash("sha256").update(normalizedDiff).digest("hex");
}

export function extractChangedFilesFromDiff(diff: string): string[] {
  const files = new Set<string>();
  for (const line of diff.split("\n")) {
    if (!line.startsWith("diff --git ")) continue;
    const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
    if (match?.[2]) files.add(match[2]);
  }
  return [...files].sort();
}

async function gitOutput(worktreePath: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd: worktreePath,
    maxBuffer: 20 * 1024 * 1024
  });
  return stdout;
}

async function untrackedFileDiffs(
  worktreePath: string,
  statusOutput: string
): Promise<string> {
  const blocks = await Promise.all(
    parseStatusPorcelain(statusOutput)
      .filter((entry) => entry.status === "untracked")
      .map((entry) => syntheticUntrackedDiff(worktreePath, entry.path))
  );
  return blocks.filter((block): block is string => Boolean(block)).join("\n");
}

async function syntheticUntrackedDiff(
  worktreePath: string,
  relativePath: string
): Promise<string | null> {
  const fullPath = path.join(worktreePath, relativePath);
  const metadata = await stat(fullPath).catch(() => null);
  if (!metadata?.isFile()) return null;
  const content = await readScannableFile(fullPath);
  const lines =
    content.kind === "text"
      ? content.content.split(/\r?\n/g).filter((line, index, all) => {
          return line.length > 0 || index < all.length - 1;
        })
      : [`[kiro omitted untracked file content: ${content.reason}]`];
  const addedLines = (lines.length > 0 ? lines : [""]).map((line) => `+${line}`);
  return [
    `diff --git a/${relativePath} b/${relativePath}`,
    "new file mode 100644",
    "--- /dev/null",
    `+++ b/${relativePath}`,
    `@@ -0,0 +1,${Math.max(addedLines.length, 1)} @@`,
    addedLines.join("\n")
  ].join("\n");
}

async function readScannableFile(
  filePath: string
): Promise<
  | { kind: "text"; content: string }
  | { kind: "omitted"; reason: string }
> {
  const metadata = await stat(filePath);
  if (metadata.size > MAX_UNTRACKED_FILE_BYTES) {
    return {
      kind: "omitted",
      reason: `file exceeds ${MAX_UNTRACKED_FILE_BYTES} byte scan cap`
    };
  }
  const buffer = await readFile(filePath);
  if (buffer.includes(0)) {
    return { kind: "omitted", reason: "binary file" };
  }
  return { kind: "text", content: buffer.toString("utf8") };
}

function parseStatusPath(rawPath: string): string {
  const renamedTarget = rawPath.split(" -> ").at(-1) ?? rawPath;
  return renamedTarget.trim().replace(/^"|"$/g, "");
}
