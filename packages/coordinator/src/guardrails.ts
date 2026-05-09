import type { GuardrailRule } from "@kiro/shared";

export const defaultKiroGuardrails: GuardrailRule[] = [
  {
    id: "postgres-only",
    title: "Do not introduce MongoDB",
    severity: "high",
    pattern: "mongodb",
    paths: ["package.json", "pnpm-lock.yaml", "bun.lock", "Cargo.toml"],
    recommendation: "Use the company-standard Postgres-backed storage path."
  },
  {
    id: "no-auth-migration-delete",
    title: "Do not delete auth migrations without owner review",
    severity: "high",
    pattern: "deleted file mode",
    paths: ["migration", "auth"],
    recommendation: "Pause and get the auth owner to approve migration deletion."
  },
  {
    id: "async-workers",
    title: "Use non-blocking sleeps in async workers",
    severity: "medium",
    pattern: "time.sleep",
    paths: [".py"],
    recommendation: "Use asyncio.sleep in async worker code."
  }
];
