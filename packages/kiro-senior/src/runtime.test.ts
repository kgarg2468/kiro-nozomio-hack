import { mkdtemp, realpath, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execa } from "execa";
import { describe, expect, it } from "vitest";
import { loadKiroEnv, parseKiroEnv, prepareRuntime } from "./runtime.js";

async function createRepo() {
  const dir = await mkdtemp(path.join(tmpdir(), "kiro-cli-"));
  await execa("git", ["init", "-b", "main"], { cwd: dir });
  await writeFile(path.join(dir, "README.md"), "hello\n");
  await execa("git", ["add", "README.md"], { cwd: dir });
  await execa("git", ["config", "user.email", "kiro@example.com"], { cwd: dir });
  await execa("git", ["config", "user.name", "Kiro Test"], { cwd: dir });
  await execa("git", ["commit", "-m", "init"], { cwd: dir });
  return realpath(dir);
}

describe("prepareRuntime", () => {
  it("creates repo-local runtime state without repo-visible changes by default", async () => {
    const repo = await createRepo();

    const runtime = await prepareRuntime({
      cwd: repo,
      prompts: {
        updateGitignore: false,
        updateAgents: false
      }
    });

    expect(runtime.repoRoot).toBe(repo);
    expect(runtime.coordinatorUrl).toBe("http://127.0.0.1:3747");
    expect(runtime.dashboardUrl).toBe("http://127.0.0.1:3748");
    expect(runtime.mcpUrl).toBe("http://127.0.0.1:3747/mcp");
    await expect(readFile(path.join(repo, ".kiro", "runtime.json"), "utf8")).resolves.toContain(
      runtime.token
    );
    await expect(readFile(path.join(repo, ".kiro", ".gitignore"), "utf8")).resolves.toContain(
      "*"
    );
    await expect(readFile(path.join(repo, "AGENTS.md"), "utf8")).rejects.toThrow();
  });

  it("adds marked setup blocks only when prompted", async () => {
    const repo = await createRepo();

    await prepareRuntime({
      cwd: repo,
      prompts: {
        updateGitignore: true,
        updateAgents: true
      }
    });

    await expect(readFile(path.join(repo, ".gitignore"), "utf8")).resolves.toContain(
      ".kiro/"
    );
    await expect(readFile(path.join(repo, "AGENTS.md"), "utf8")).resolves.toContain(
      "BEGIN KIRO"
    );
    const agents = await readFile(path.join(repo, "AGENTS.md"), "utf8");
    expect(agents).toContain("if `kiro_wait_for_direction` times out with `keepWaiting: true`");
    expect(agents).toContain("call `kiro_acknowledge_intervention`");
  });

  it("loads repo-local Kiro env without overriding existing shell env", async () => {
    const repo = await createRepo();
    const runtime = await prepareRuntime({
      cwd: repo,
      prompts: {
        updateGitignore: false,
        updateAgents: false
      }
    });
    await writeFile(
      runtime.envPath,
      [
        "OPENAI_API_KEY=from-file",
        "OPENAI_MODEL=\"gpt-5.4-mini\"",
        "KIRO_LOCAL_TOKEN=from-file",
        ""
      ].join("\n")
    );
    const env: Record<string, string | undefined> = {
      OPENAI_API_KEY: "from-shell"
    };

    await loadKiroEnv(runtime.envPath, env);

    expect(env.OPENAI_API_KEY).toBe("from-shell");
    expect(env.OPENAI_MODEL).toBe("gpt-5.4-mini");
    expect(env.KIRO_LOCAL_TOKEN).toBe("from-file");
  });

  it("parses simple dotenv syntax", () => {
    expect(
      parseKiroEnv([
        "# comment",
        "OPENAI_API_KEY='sk-test'",
        "OPENAI_MODEL=gpt-5.4-mini # model comment",
        "EMPTY=",
        ""
      ].join("\n"))
    ).toEqual({
      OPENAI_API_KEY: "sk-test",
      OPENAI_MODEL: "gpt-5.4-mini",
      EMPTY: ""
    });
  });
});
