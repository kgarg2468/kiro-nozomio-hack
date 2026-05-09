import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  monitorScanResultSchema,
  type MonitorContext,
  type MonitorScanResult
} from "@kiro/shared";

const execFileAsync = promisify(execFile);

export type ExecMonitor = (args: string[]) => Promise<string>;

export interface RunRustMonitorOptions {
  repoRoot: string;
  context: MonitorContext;
  monitorBin?: string | undefined;
  execMonitor?: ExecMonitor | undefined;
}

export async function runRustMonitor(
  options: RunRustMonitorOptions
): Promise<MonitorScanResult> {
  const execMonitor =
    options.execMonitor ?? createProcessMonitor(options.monitorBin ?? defaultMonitorBin());
  const tempDir = await mkdtemp(path.join(tmpdir(), "kiro-monitor-"));
  const contextPath = path.join(tempDir, "context.json");
  try {
    await writeFile(
      contextPath,
      JSON.stringify(toSnakeCase(options.context), null, 2),
      "utf8"
    );
    const stdout = await execMonitor([
      "scan",
      "--repo",
      options.repoRoot,
      "--context",
      contextPath,
      "--json"
    ]);
    return parseRustMonitorOutput(stdout);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export function parseRustMonitorOutput(stdout: string): MonitorScanResult {
  const raw = JSON.parse(stdout) as unknown;
  return monitorScanResultSchema.parse(toCamelCase(raw));
}

function createProcessMonitor(binary: string): ExecMonitor {
  return async (args) => {
    const { stdout } = await execFileAsync(binary, args, {
      maxBuffer: 20 * 1024 * 1024
    });
    return stdout;
  };
}

export interface DefaultMonitorBinOptions {
  env?: Record<string, string | undefined> | undefined;
  moduleUrl?: URL | string | undefined;
  cwd?: string | undefined;
}

export function defaultMonitorBin(options: DefaultMonitorBinOptions = {}): string {
  const env = options.env ?? process.env;
  if (env.KIRO_MONITOR_BIN) return env.KIRO_MONITOR_BIN;
  const candidates = defaultMonitorBinCandidates(options);
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]!;
}

export function defaultMonitorBinCandidates(
  options: Pick<DefaultMonitorBinOptions, "moduleUrl" | "cwd"> = {}
): string[] {
  const moduleDir = path.dirname(
    fileURLToPath(options.moduleUrl ?? import.meta.url)
  );
  const packageRoot = path.resolve(moduleDir, "..");
  const repoRoot = path.resolve(moduleDir, "../../..");
  return [
    path.resolve(repoRoot, "target/debug/kiro-monitor"),
    path.resolve(repoRoot, "target/release/kiro-monitor"),
    path.resolve(packageRoot, "target/debug/kiro-monitor"),
    path.resolve(packageRoot, "target/release/kiro-monitor"),
    path.resolve(options.cwd ?? process.cwd(), "target/debug/kiro-monitor")
  ];
}

function toCamelCase(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toCamelCase);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      snakeToCamel(key),
      toCamelCase(child)
    ])
  );
}

function toSnakeCase(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toSnakeCase);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .map(([key, child]) => [camelToSnake(key), toSnakeCase(child)])
  );
}

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function camelToSnake(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
