#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { createCoordinatorApp } from "@tempo/coordinator";
import { loadTempoEnv, prepareRuntime, type TempoRuntime } from "./runtime.js";

async function main() {
  const args = new Set(process.argv.slice(2));
  const yes = args.has("--yes") || args.has("-y");
  const serverOnly = args.has("--server-only");
  const noDashboard = args.has("--no-dashboard") || serverOnly;
  const noOpen = args.has("--no-open") || serverOnly;
  const prompts = yes
    ? { updateGitignore: true, updateAgents: true }
    : await askSetupPrompts();

  const runtime = await prepareRuntime({
    cwd: process.cwd(),
    prompts
  });
  await loadTempoEnv(runtime.envPath);
  const app = await createCoordinatorApp({
    repoRoot: runtime.repoRoot,
    dbPath: runtime.dbPath,
    token: runtime.token
  });

  await app.listen({
    host: "127.0.0.1",
    port: runtime.coordinatorPort
  });

  console.log(`Tempo coordinator: ${runtime.coordinatorUrl}`);
  console.log(`Tempo env file: ${runtime.envPath}`);
  let dashboardProcess: ReturnType<typeof spawn> | null = null;
  if (!noDashboard) {
    dashboardProcess = await startDashboard(runtime);
    if (dashboardProcess) {
      console.log(`Tempo dashboard: ${runtime.dashboardUrl}`);
    } else {
      console.log("Tempo dashboard: run `pnpm --filter @tempo/dashboard dev` from the Tempo repo.");
    }
  }
  console.log(`Tempo MCP endpoint: ${runtime.mcpUrl}`);
  console.log(
    `Codex MCP setup: codex mcp add tempo --url ${runtime.mcpUrl} --bearer-token-env-var TEMPO_LOCAL_TOKEN`
  );
  console.log(`Set TEMPO_LOCAL_TOKEN=${runtime.token}`);

  if (!noOpen) {
    const url = dashboardProcess ? runtime.dashboardUrl : runtime.coordinatorUrl;
    openBrowser(url).catch(() => {
      console.log(`Open ${url} in your browser.`);
    });
  }

  const shutdown = async () => {
    dashboardProcess?.kill("SIGTERM");
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

async function startDashboard(
  runtime: TempoRuntime
): Promise<ReturnType<typeof spawn> | null> {
  const dashboardDir = await findDashboardDir();
  if (!dashboardDir) return null;
  const child = spawn(
    "pnpm",
    [
      "--dir",
      dashboardDir,
      "exec",
      "next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(runtime.dashboardPort)
    ],
    {
      env: {
        ...process.env,
        TEMPO_COORDINATOR_URL: runtime.coordinatorUrl,
        NEXT_PUBLIC_TEMPO_COORDINATOR_URL: runtime.coordinatorUrl,
        TEMPO_LOCAL_TOKEN: runtime.token
      },
      stdio: "inherit"
    }
  );
  return child;
}

async function findDashboardDir(): Promise<string | null> {
  const cliDir = path.dirname(fileURLToPath(import.meta.url));
  const candidate = path.resolve(cliDir, "../../../apps/dashboard");
  try {
    await access(path.join(candidate, "package.json"));
    return candidate;
  } catch (_error) {
    return null;
  }
}

async function askSetupPrompts() {
  if (!process.stdin.isTTY) {
    return {
      updateGitignore: false,
      updateAgents: false
    };
  }
  const rl = createInterface({ input, output });
  try {
    const updateGitignore = await askYesNo(
      rl,
      "Add .tempo/ to this repo's .gitignore?",
      true
    );
    const updateAgents = await askYesNo(
      rl,
      "Add Tempo instructions to AGENTS.md?",
      true
    );
    return { updateGitignore, updateAgents };
  } finally {
    rl.close();
  }
}

async function askYesNo(
  rl: ReturnType<typeof createInterface>,
  question: string,
  defaultYes: boolean
): Promise<boolean> {
  const suffix = defaultYes ? " [Y/n] " : " [y/N] ";
  const answer = (await rl.question(`${question}${suffix}`)).trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer === "y" || answer === "yes";
}

async function openBrowser(url: string): Promise<void> {
  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open";
  const args =
    process.platform === "win32" ? ["/c", "start", url] : [url];
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore"
  });
  child.unref();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
