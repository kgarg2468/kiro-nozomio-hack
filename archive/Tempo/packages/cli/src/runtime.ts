import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { findGitRoot } from "@tempo/coordinator";

const DEFAULT_COORDINATOR_PORT = 3747;
const DEFAULT_DASHBOARD_PORT = 3748;
const TEMPO_AGENTS_BLOCK = [
  "<!-- BEGIN TEMPO -->",
  "## Tempo coordination",
  "",
  "This repo uses Tempo to coordinate parallel AI coding sessions.",
  "",
  "When working in this repo, Codex must:",
  "",
  "- call `tempo_join` at session start",
  "- call `tempo_plan` before meaningful edits",
  "- call `tempo_checkpoint` after meaningful edit batches",
  "- call `tempo_checkpoint` before committing",
  "- report Tempo notifications to the user",
  "- pause on medium/high Tempo risk until the user gives direction",
  "- if `tempo_wait_for_direction` times out with `keepWaiting: true`, call it again instead of ending the session cold",
  "- when Tempo returns `directions`, present the role and plan to the user, call `tempo_acknowledge_intervention`, then continue from that direction",
  "- if the user chooses split ownership in this chat, call `tempo_record_decision`; this session becomes the owner unless the user names a different owner",
  "",
  "<!-- END TEMPO -->",
  ""
].join("\n");

export interface RuntimePrompts {
  updateGitignore: boolean;
  updateAgents: boolean;
}

export interface PrepareRuntimeInput {
  cwd: string;
  prompts: RuntimePrompts;
  coordinatorPort?: number;
  dashboardPort?: number;
}

export interface TempoRuntime {
  repoRoot: string;
  dataDir: string;
  dbPath: string;
  envPath: string;
  token: string;
  coordinatorPort: number;
  dashboardPort: number;
  coordinatorUrl: string;
  dashboardUrl: string;
  mcpUrl: string;
}

export async function prepareRuntime(
  input: PrepareRuntimeInput
): Promise<TempoRuntime> {
  const repoRoot = await findGitRoot(input.cwd);
  const dataDir = path.join(repoRoot, ".tempo");
  await mkdir(dataDir, { recursive: true });
  await ensureTempoDataGitignore(dataDir);

  const coordinatorPort = input.coordinatorPort ?? DEFAULT_COORDINATOR_PORT;
  const dashboardPort = input.dashboardPort ?? DEFAULT_DASHBOARD_PORT;
  const runtimePath = path.join(dataDir, "runtime.json");
  const existing = await readRuntime(runtimePath);
  const runtime: TempoRuntime = {
    repoRoot,
    dataDir,
    dbPath: path.join(dataDir, "tempo.sqlite"),
    envPath: path.join(dataDir, ".env"),
    token: existing?.token ?? nanoid(32),
    coordinatorPort,
    dashboardPort,
    coordinatorUrl: `http://127.0.0.1:${coordinatorPort}`,
    dashboardUrl: `http://127.0.0.1:${dashboardPort}`,
    mcpUrl: `http://127.0.0.1:${coordinatorPort}/mcp`
  };

  await writeFile(runtimePath, `${JSON.stringify(runtime, null, 2)}\n`);

  if (input.prompts.updateGitignore) {
    await ensureLine(path.join(repoRoot, ".gitignore"), ".tempo/");
  }
  if (input.prompts.updateAgents) {
    await ensureTempoAgentsBlock(path.join(repoRoot, "AGENTS.md"));
  }

  return runtime;
}

async function readRuntime(runtimePath: string): Promise<Partial<TempoRuntime> | null> {
  try {
    return JSON.parse(await readFile(runtimePath, "utf8")) as Partial<TempoRuntime>;
  } catch (_error) {
    return null;
  }
}

export async function loadTempoEnv(
  envPath: string,
  target: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): Promise<void> {
  const current = await readOptional(envPath);
  if (!current) return;
  const parsed = parseTempoEnv(current);
  for (const [key, value] of Object.entries(parsed)) {
    if (target[key] === undefined) {
      target[key] = value;
    }
  }
}

export function parseTempoEnv(source: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    values[key] = unquoteEnvValue(line.slice(equalsIndex + 1).trim());
  }
  return values;
}

function unquoteEnvValue(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value.replace(/\s+#.*$/, "");
}

async function ensureTempoDataGitignore(dataDir: string): Promise<void> {
  const filePath = path.join(dataDir, ".gitignore");
  const current = await readOptional(filePath);
  if (current.trim()) return;
  await writeFile(filePath, "*\n!.gitignore\n");
}

async function ensureLine(filePath: string, line: string): Promise<void> {
  const current = await readOptional(filePath);
  const lines = current.split(/\r?\n/).filter(Boolean);
  if (lines.includes(line)) return;
  const next = [...lines, line].join("\n");
  await writeFile(filePath, `${next}\n`);
}

async function ensureTempoAgentsBlock(filePath: string): Promise<void> {
  const current = await readOptional(filePath);
  if (current.includes("BEGIN TEMPO")) return;
  const separator = current.trim().length > 0 ? "\n\n" : "";
  await writeFile(filePath, `${current.trimEnd()}${separator}${TEMPO_AGENTS_BLOCK}`);
}

async function readOptional(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch (_error) {
    return "";
  }
}
