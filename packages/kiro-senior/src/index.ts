#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { createCoordinatorApp } from "@kiro/senior-coordinator";
import { loadKiroEnv, prepareRuntime, type KiroRuntime } from "./runtime.js";

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
  await loadKiroEnv(runtime.envPath);
  const app = await createCoordinatorApp({
    repoRoot: runtime.repoRoot,
    dbPath: runtime.dbPath,
    token: runtime.token
  });

  await app.listen({
    host: "127.0.0.1",
    port: runtime.coordinatorPort
  });

  console.log(`Kiro coordinator: ${runtime.coordinatorUrl}`);
  console.log(`Kiro env file: ${runtime.envPath}`);
  let dashboardProcess: ReturnType<typeof spawn> | null = null;
  if (!noDashboard) {
    dashboardProcess = await startDashboard(runtime);
    if (dashboardProcess) {
      console.log(`Kiro dashboard: ${runtime.dashboardUrl}`);
    } else {
      console.log("Kiro dashboard: run `pnpm dev` from the Kiro repo.");
    }
  }
  console.log(`Kiro MCP endpoint: ${runtime.mcpUrl}`);
  console.log(
    `Codex MCP setup: codex mcp add kiro --url ${runtime.mcpUrl} --bearer-token-env-var KIRO_LOCAL_TOKEN`
  );
  console.log(`Set KIRO_LOCAL_TOKEN=${runtime.token}`);

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
  runtime: KiroRuntime
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
        KIRO_COORDINATOR_URL: runtime.coordinatorUrl,
        NEXT_PUBLIC_KIRO_COORDINATOR_URL: runtime.coordinatorUrl,
        KIRO_LOCAL_TOKEN: runtime.token
      },
      stdio: "inherit"
    }
  );
  return child;
}

async function findDashboardDir(): Promise<string | null> {
  const cliDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(cliDir, "../../..");
  const candidates = [
    path.join(repoRoot, "apps", "company-brain"),
    repoRoot
  ];
  for (const candidate of candidates) {
    try {
      await access(path.join(candidate, "package.json"));
      await access(path.join(candidate, "app"));
      return candidate;
    } catch (_error) {
      continue;
    }
  }
  return null;
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
      "Add .kiro/ to this repo's .gitignore?",
      true
    );
    const updateAgents = await askYesNo(
      rl,
      "Add Kiro instructions to AGENTS.md?",
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
