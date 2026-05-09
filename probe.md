# Tempo Probe Audit

## Purpose

This probe audits the prior project at `/Users/krishgarg/Documents/Projects/Tempo`
so it can be used with `/Users/krishgarg/Documents/Projects/kiro/context00.md`
to design the next version of this project.

Tempo tried to solve the same core problem as `kiro/context00.md`: parallel AI
coding creates expensive conflicts before git can see them. Its actual
implementation is a local-first coordination system for git worktrees and Codex
sessions. It uses a watcher, SQLite-backed coordinator, MCP tools, a Next.js
dashboard, and heuristic/model-assisted fingerprinting. It does not implement
the full Nozomio hackathon stack from `kiro/context00.md`: no Nia grounding,
no Convex shared backend, no Tensorlake merge simulation, no Hyperspell context,
and no real multi-laptop/team relay.

The main lesson: Tempo found a credible local coordination primitive, but it
became an operator console for agent worktrees more than a product-grade
conflict-prediction experience. The new project should keep the live evidence
pipeline and human-controlled intervention loop, but rebuild the product surface
around impact, clarity, sponsor relevance, and a higher-level conflict story.

## Source Material Reviewed

- Current target context: `/Users/krishgarg/Documents/Projects/kiro/context00.md`
- Prior Tempo context: `/Users/krishgarg/Documents/Projects/Tempo/context00.md`
- Tempo docs: `README.md`, `tempo.md`, `docs/v1.md`, `docs/showcase-demo.md`
- Tempo source: `packages/*`, `apps/dashboard/*`
- Tempo tests and config: Vitest tests, TypeScript references, ESLint, pnpm
- Design history: `.superpowers/brainstorm/*` dashboard prototypes
- Excluded from source audit: `.git`, `.tempo`, `node_modules`, `dist`, `.next`,
  and other generated/runtime artifacts

Verification observed during exploration:

- `pnpm typecheck` passed.
- `pnpm test` passed: 17 test files, 74 tests.
- `pnpm lint` passed.
- `pnpm build` passed, including the Next.js dashboard production build.

## Context Map

### Current Nozomio Context

`kiro/context00.md` frames the project as a hackathon product for Nozomio:

- Real-time conflict prediction for AI-native engineering teams.
- Strong cost-reduction story: wasted agent tokens become the new AWS bill.
- Conflict stack includes textual, syntactic, semantic, architectural, and
  intent-level conflicts.
- The ideal product catches conflicts as early and as high in the stack as
  possible.
- Sponsor mapping matters: Nia for repo/external context, Convex for real-time
  sync, Tensorlake for simulated future merges, Hyperspell for personal context,
  Vercel/Next.js for dashboard.
- Demo should feel like a team product, not only a local developer utility.
- UX should use an interruption ladder: whisper, nudge, stop.
- Product must feel genuinely useful and new, with polished UX and measurable
  impact.

### Tempo's Chapman Context

`Tempo/context00.md` came from a different presentation target:

- Chapman Engineering Showcase on a single laptop.
- Walk-up faculty demo with roughly five minutes per judge.
- Two agents in two terminal panes, originally Codex plus Claude Code.
- Convex and Nia were planned in the diagram, but the final implementation
  moved local-first.
- "Reactive first" was locked: live diff fingerprinting was the centerpiece;
  pre-task prediction was only a soft warning.
- Resolution was framed as "suggest unified spec, then optional human-in-loop
  re-prompt."
- Re-prompt injection was identified early as the hardest unknown.
- Eval numbers mattered for engineering credibility.

### What Changed In Tempo

Tempo did not end up as the Chapman architecture exactly. It became:

- Codex-first rather than Codex plus Claude Code.
- Local-first rather than Convex-backed.
- MCP advisory delivery rather than terminal/stdin prompt injection.
- Heuristic/OpenAI fingerprint enrichment rather than a full prediction agent
  grounded by Nia.
- Decision/intervention workflow rather than automatic unified-spec adoption.
- A local alpha that can run inside any git repo, instead of only a scripted
  showcase harness.

This pivot was technically sensible. It reduced unknowns and produced real,
testable software. For Nozomio, though, the pivot also removed much of the
sponsor-aligned narrative and high-level product magic.

## Project Inventory

Tempo is a pnpm TypeScript monorepo:

```text
Tempo/
  apps/dashboard/           Next.js operator console
  packages/cli/             `tempo` command and repo-local runtime setup
  packages/coordinator/     Fastify service, watcher, analyzer, store, MCP
  packages/shared/          Zod schemas and TypeScript domain types
  packages/evals/           Fixture eval runner
  docs/                     V1 UX and showcase demo docs
  tempo.md                  Long phased build plan
  README.md                 Current local alpha overview
```

### Root Tooling

- Package manager: pnpm.
- Runtime/language: Node.js, TypeScript ESM.
- Build: TypeScript project references plus Next.js.
- Test: Vitest, node environment.
- Lint: ESLint 9 with TypeScript ESLint.
- Strict TypeScript options are enabled, including `noUncheckedIndexedAccess`
  and `exactOptionalPropertyTypes`.

The repo is well-structured for an alpha. Source boundaries are clear, tests
cover core behavior, and generated artifacts are ignored by lint and source
inspection.

## Core Architecture

Tempo has four major runtime surfaces:

1. CLI
2. Coordinator
3. MCP tools
4. Dashboard

The watcher/analyzer/store pipeline sits inside the coordinator.

```text
User runs `tempo` in a target git repo
  -> CLI prepares .tempo runtime state
  -> CLI starts Fastify coordinator
  -> CLI starts Next dashboard
  -> Coordinator discovers git worktrees
  -> Watcher reads live git diffs
  -> Analyzer creates fingerprints
  -> Conflict engine compares fingerprints
  -> Store persists fingerprints, conflicts, events, decisions
  -> Dashboard reads HTTP APIs
  -> Codex sessions call MCP tools
  -> User records a decision
  -> Coordinator queues per-agent interventions
  -> Agents fetch directions on checkpoint/wait
```

### CLI Runtime Setup

Relevant files:

- `packages/cli/src/index.ts`
- `packages/cli/src/runtime.ts`

The `tempo` CLI is intentionally thin. It:

- Parses flags like `--yes`, `--server-only`, `--no-dashboard`, `--no-open`.
- Finds the git root.
- Creates repo-local `.tempo/`.
- Creates or reuses `.tempo/runtime.json`.
- Creates `.tempo/.gitignore` to keep runtime state private.
- Optionally updates `.gitignore` with `.tempo/`.
- Optionally adds a marked Tempo block to `AGENTS.md`.
- Loads `.tempo/.env` without overriding shell environment variables.
- Starts the coordinator on `127.0.0.1:3747`.
- Starts the dashboard on `127.0.0.1:3748` when possible.
- Prints the MCP setup command for Codex.

Important design choice: CLI does not own product logic. That worked. It kept
runtime setup boring and made the coordinator testable without a real CLI.

Important gap: the CLI has a fixed default port story and assumes a local
workspace install can find the dashboard. This is acceptable for an alpha, but
not enough for a polished install flow or hackathon demo where port collisions
and environment setup will happen.

### Shared Schemas

Relevant file:

- `packages/shared/src/index.ts`

Shared Zod schemas define the contract between coordinator, dashboard, evals,
and MCP handlers:

- `repo`
- `worktree`
- `agentSession`
- `contractSurface`
- `fingerprint`
- `conflict`
- `compatibilityClassification`
- `advisory`
- `interventionDirective`
- `intervention`
- `conflictDecision`
- `contractPublication`
- `event`

This was one of Tempo's strongest engineering decisions. The schemas force the
system to have a common vocabulary:

- A worktree is not an agent.
- A fingerprint is not a raw diff.
- A conflict is lifecycle state plus evidence.
- An advisory is a set of options.
- A decision locks one option.
- An intervention is a deliverable direction to one or more agents.
- A publication is an owner-approved contract shape.

The schema layer makes Tempo more than a file watcher. It encodes a coordination
model.

### Coordinator Server

Relevant files:

- `packages/coordinator/src/server.ts`
- `packages/coordinator/src/store.ts`
- `packages/coordinator/src/watcher.ts`
- `packages/coordinator/src/analyzer.ts`

The coordinator is a local Fastify app. It owns:

- SQLite store initialization.
- Runtime event stream.
- Worktree watcher lifecycle.
- HTTP APIs for dashboard reads and mutations.
- Local bearer-token protection for mutation endpoints.
- MCP endpoint registration.

Read endpoints include:

- `/health`
- `/api/repo`
- `/api/worktrees`
- `/api/events`
- `/api/events/stream`
- `/api/fingerprints`
- `/api/conflicts`
- `/api/agents`
- `/api/interventions`
- `/api/decisions`
- `/api/advisories`
- `/api/contract-publications`
- `/api/settings`
- `/api/export/events.jsonl`
- `/api/export/conflicts.jsonl`

Mutation endpoints include:

- `/api/analyze`
- `/api/conflicts/:id/advisory`
- `/api/interventions`
- `/api/decisions`
- `/api/conflicts/:id/status`
- HTTP wrappers for each MCP tool
- `/mcp` streamable HTTP MCP endpoint

Good decision: dashboard and MCP share the same handler logic for decisions.
This prevents "dashboard says one thing, agent chat says another" divergence.

Weak point: the API is local-product oriented. It is not shaped for a multi-user
Nozomio/Convex architecture. The next version should decide early which state
belongs local, which belongs shared, and which is purely ephemeral.

### SQLite Store

Relevant file:

- `packages/coordinator/src/store.ts`

SQLite tables:

- `repos`
- `worktrees`
- `agent_sessions`
- `fingerprints`
- `conflicts`
- `advisories`
- `conflict_decisions`
- `contract_publications`
- `interventions`
- `events`
- `eval_runs`
- `eval_cases`
- `settings`

Tempo persists structured coordination state, not raw diffs by default. This is
a strong privacy and debugging posture. The store also supports restart
continuity: events, conflicts, interventions, decisions, and publications can
survive coordinator restarts.

Practical issue: storing everything locally helps privacy and speed, but it
weakens the team story. Nozomio needs "team context at scale." A local SQLite
store is great as an edge cache, but not enough as the product backbone.

### Git Worktree Watcher

Relevant files:

- `packages/coordinator/src/git.ts`
- `packages/coordinator/src/watcher.ts`
- `packages/coordinator/src/path-ignore.ts`

Tempo discovers worktrees with:

```text
git worktree list --porcelain
```

For each worktree, it reads:

```text
git diff --no-ext-diff
```

Then it:

- Filters ignored paths.
- Normalizes diffs.
- Marks dirty worktrees.
- Debounces file-system events through Chokidar.
- Polls for new/removed worktrees.
- Emits runtime events such as `worktree.discovered`, `worktree.activity`,
  `analysis.completed`, `conflict.opened`, `conflict.updated`, and
  `conflict.resolved`.

Ignored paths include `.git`, `.tempo`, `node_modules`, `.next`, `dist`,
`build`, `coverage`, `.turbo`, `.cache`, `data`, `next-env.d.ts`, SQLite files,
logs, and project-specific `.tempoignore` rules.

This worked well for the local alpha. The watcher is authoritative even if an
agent never joins MCP. That is important: detection should not depend on agent
cooperation.

Limitation: this only sees uncommitted filesystem diffs. It does not see
pre-edit intent unless an agent calls `tempo_plan`, and it does not see task
assignment context from Linear/Slack/Nia. For the Nozomio goal, live diffs are
necessary but not sufficient.

### Analyzer And Fingerprints

Relevant files:

- `packages/coordinator/src/analyzer.ts`
- `packages/coordinator/src/fingerprint.ts`
- `packages/coordinator/src/indexer.ts`
- `packages/coordinator/src/openai-fingerprint.ts`

Analyzer flow:

1. List worktrees.
2. Get each filtered diff.
3. Skip clean or ignored-only diffs.
4. Extract changed file paths from the diff.
5. Read changed file snapshots.
6. Create a structured fingerprint.
7. Classify every pair of active fingerprints.
8. Run conflict detection with classifications.

Fingerprint shape includes:

- `worktreeId`
- `diffHash`
- `filesTouched`
- `symbols.added`
- `symbols.modified`
- `symbols.removed`
- `surfaces`
- `semanticSummary`
- `contractChanges`
- `confidence`
- `source`

The heuristic indexer uses path and regex-based extraction:

- TypeScript/JavaScript: interfaces, types, classes, functions, Drizzle tables,
  React-ish component props
- Python: classes/functions, model-like and route-like paths
- Java: classes/interfaces/controllers/DTO-like names
- Generic path classification: schema, model, migration, API, DTO, component,
  utility, test, unknown

OpenAI enrichment is optional. When configured, Tempo sends bounded payloads:

- Diff slice up to a fixed size.
- File content previews.
- Heuristic surfaces and symbols.
- Structured JSON output is validated with Zod.
- Output is cached by diff hash.
- Invalid or unavailable model output falls back to heuristics.

What worked:

- Bounded payloads.
- Raw diffs not persisted.
- Heuristic degraded mode.
- Diff-hash cache.
- Contract surface vocabulary.

What did not work enough:

- Regex extraction is shallow.
- File snapshots, not true AST graphs, drive understanding.
- Surface labels are brittle; many conflicts depend on naming conventions.
- "Semantic summary" is useful for UI, but not enough to catch architectural or
  intent conflicts.
- No real repo grounding layer exists, despite the Nia narrative.

### Compatibility Classifier

Relevant files:

- `packages/coordinator/src/compatibility.ts`
- `packages/coordinator/src/conflict.ts`

Tempo separates overlap detection from compatibility classification:

- Local fingerprints show whether worktrees overlap on surfaces/files/symbols.
- Compatibility classification decides whether that overlap is harmless,
  a non-blocking notice, or a blocking conflict.

Classification outcomes:

- `no_issue`
- `coordination_notice`
- `blocking_conflict`

OpenAI can classify pairwise diffs. Without OpenAI, fallback logic:

- No shared files or contract roots -> `no_issue`
- Both diffs additive-only -> `coordination_notice`
- Destructive removals/replacements -> `blocking_conflict`
- Other overlap -> conservative notice/blocking behavior depending evidence

Conflict risk assessment:

- Shared contract roots become high risk.
- Shared meaningful surfaces become medium risk.
- Risky same files become medium risk.
- Shared symbols become medium risk.
- Low-signal overlap can be ignored unless classifier overrides.

This is an important product lesson. Same-file edits are not automatically
conflicts. Additive-compatible changes should not block agents. The new product
must keep this precision bias because false positives will kill trust.

However, pairwise classification does not scale to high-level team intent. It
only compares current dirty worktrees. The Nozomio concept needs task-level,
architecture-level, and org-context signals before code is written.

### Advisory, Decision, Intervention, Publication

Relevant files:

- `packages/coordinator/src/advisory.ts`
- `packages/coordinator/src/guidance.ts`
- `packages/coordinator/src/mcp-tools.ts`

Tempo's coordination lifecycle is:

```text
conflict opens
  -> advisory options are generated
  -> user chooses one option
  -> first active decision wins
  -> coordinator queues per-agent interventions
  -> agents fetch directions on checkpoint/wait/fetch
  -> agents acknowledge direction
  -> owner may publish final contract shape
  -> adapters receive publication and continue
```

Default advisory options:

- Agree contract first.
- Split ownership.
- Keep compatibility.

Per-agent directive roles:

- `contract_owner`
- `adapter`
- `pause_only`
- `compatibility_owner`

This is probably Tempo's best product idea. Instead of blasting every agent with
the same generic warning, it creates complementary roles. One agent owns the
contract shape; another adapts around it.

The owner-publication mechanism is also strong. It gives adapters a concrete
thing to wait for and preserve:

- Conflict ID.
- Surface name.
- Shape summary.
- Files involved.
- Owner session ID.

Gap: this is not the same as generating a unified spec. It is direction and
coordination, not a fully synthesized implementation plan. For the Nozomio demo,
"we caught it and assigned roles" is less magical than "we generated the merged
contract and prevented token waste."

### MCP Integration

Relevant files:

- `packages/coordinator/src/mcp.ts`
- `packages/coordinator/src/mcp-tools.ts`
- `AGENTS.md`

MCP tools:

- `tempo_join`
- `tempo_plan`
- `tempo_checkpoint`
- `tempo_fetch_intervention`
- `tempo_wait_for_direction`
- `tempo_record_decision`
- `tempo_acknowledge_intervention`

MCP behavior:

- `join` maps an agent session to cwd/worktree.
- `plan` records intended work.
- `checkpoint` returns current risk, notifications, notices, choices,
  directions, decisions, publications, and pause/keep-waiting flags.
- `wait_for_direction` waits briefly for a dashboard or chat decision and can
  keep adapters waiting on owner publication.
- `record_decision` lets agent chat become an equal decision surface.
- `acknowledge_intervention` records that the agent received and presented the
  plan.

This is much more realistic than trying to inject text into a running terminal.
The earlier Chapman plan called re-prompt injection the hardest part; Tempo
solved that by moving the control surface into MCP. That is a major lesson for
the next project: do not depend on unofficial stdin hacks if MCP can make the
agent pull direction safely.

Remaining gap: MCP requires agent cooperation. Tempo wisely keeps the watcher as
source of truth, but interventions only work for joined sessions. Dirty
unjoined worktrees appear as unreachable.

### Dashboard

Relevant files:

- `apps/dashboard/app/(dashboard)/sessions/page.tsx`
- `apps/dashboard/app/(dashboard)/agents/page.tsx`
- `apps/dashboard/app/(dashboard)/conflicts/page.tsx`
- `apps/dashboard/app/(dashboard)/interventions/page.tsx`
- `apps/dashboard/app/(dashboard)/evals/page.tsx`
- `apps/dashboard/app/(dashboard)/settings/page.tsx`
- `apps/dashboard/components/session-map.tsx`
- `apps/dashboard/lib/tempo-api.ts`
- `apps/dashboard/lib/actions.ts`
- `apps/dashboard/app/styles.css`

Dashboard pages:

- Sessions
- Agents
- Conflicts
- Interventions
- Evals
- Settings

The dashboard is a dark operator console. It is dense, functional, and
engineering-oriented. It uses a sidebar, status pills, row panels, risk colors,
timeline cards, conflict forms, and an `@xyflow/react` session map.

Sessions page:

- Shows coordination timeline.
- Shows worktree map.
- Shows active conflict details.
- Shows risk reasons, classifier rationale, decisions, publications, and
  integration status.

Agents page:

- Shows joined sessions.
- Shows checkpoint freshness.
- Shows current plans.
- Shows queued intervention counts.
- Shows dirty unjoined worktrees.

Conflicts page:

- Shows risk/confidence/status.
- Shows affected agents/worktrees.
- Shows evidence.
- Shows lifecycle actions.
- Shows advisory options.
- Lets user record decisions and choose owner for split ownership.

Interventions page:

- Shows queued/fetched/acknowledged directions.
- Shows directive role and peer context.

Evals page:

- Placeholder only. It says fixture storage will be connected later.

Settings page:

- Shows coordinator health.
- Shows OpenAI configured/missing.
- Shows Codex MCP setup URL.

Design prototypes in `.superpowers/brainstorm` show earlier thinking:

- A complete app shell with Live Sessions, Agents, Conflicts, Interventions,
  Evals, Logs, Settings, Doctor.
- A worktree map concept with repo/worktree/surface nodes and animated
  convergence edge.
- The final dashboard kept a simplified version of this: Sessions, Agents,
  Conflicts, Interventions, Evals, Settings.

What worked:

- Operational clarity.
- Good separation between live topology, agent state, conflict state, and
  intervention history.
- Dashboard and agent chat can both drive decisions.
- It is not a marketing page; it is a real tool.

What did not work for Nozomio:

- It looks like infrastructure, not a sharp product moment.
- The central UX is "inspect coordination state" rather than "save tokens and
  prevent conflict now."
- The conflict map is visually useful but not yet the main story.
- Evals are not integrated enough to show impact.
- Sponsor products are invisible.
- There is no CFO/cost dashboard, token-burn meter, or before/after comparison.
- It does not dramatize semantic/architectural/intent conflicts well; it mostly
  shows contract-surface overlap.

### Eval System

Relevant files:

- `packages/evals/src/index.ts`
- `packages/evals/src/index.test.ts`

Tempo has a small fixture eval runner. Fixtures contain:

- Fixture ID.
- Language.
- Expected conflict boolean.
- Fingerprints with worktree IDs, files touched, and surfaces.

The runner computes:

- Recall.
- False positive rate.
- Average latency.
- Per-case verdict: true positive, true negative, false positive, false
  negative.

This is a good seed but not enough. It evaluates the conflict engine against
synthetic fingerprints, not the whole product loop:

- No live agents.
- No real token accounting.
- No real merge failure validation.
- No Nia grounding ablation.
- No UX latency measurement.
- No dashboard-backed eval history.
- Evals page is a placeholder.

For Nozomio, evals need to become part of the product story: "Without us, these
agents burned X tokens and merged badly. With us, the conflict was caught at Y
seconds and the saved work was Z."

## End-To-End Data Flow

### 1. Startup

```text
tempo
  -> find git root
  -> prepare .tempo runtime state
  -> generate/reuse local token
  -> start coordinator
  -> start dashboard
  -> print MCP setup command
```

### 2. Worktree Discovery

```text
coordinator.start()
  -> watcher.refreshWorktrees()
  -> git worktree list --porcelain
  -> store.upsertWorktree(...)
  -> Chokidar watches each worktree path
```

### 3. Dirty Diff Detection

```text
file changes in worktree
  -> Chokidar event
  -> debounce
  -> watcher.scanOnce()
  -> git diff --no-ext-diff
  -> path filter removes generated/private files
  -> normalize diff
```

### 4. Fingerprinting

```text
filtered diff
  -> changed files extracted
  -> changed file snapshots read
  -> heuristic indexer extracts surfaces/symbols
  -> optional OpenAI enrichment
  -> fingerprint persisted by worktree + diff hash
```

### 5. Compatibility Classification

```text
active fingerprints
  -> pairwise compare
  -> optional OpenAI compatibility classifier
  -> fallback classifier when missing/failing
  -> no_issue | coordination_notice | blocking_conflict
```

### 6. Conflict Detection

```text
fingerprint pair + classification
  -> shared surfaces/files/symbols checked
  -> risk assessed
  -> conflict opened/updated/resolved
  -> advisory generated if missing
  -> event logged
```

### 7. Dashboard Decision

```text
dashboard reads /api/conflicts + /api/advisories
  -> user chooses option
  -> POST /api/decisions
  -> first active decision wins
  -> per-agent directives queued as interventions
```

### 8. Agent Decision

```text
agent checkpoint sees blocking conflict choices
  -> agent asks user in chat
  -> user chooses
  -> tempo_record_decision
  -> same first-choice-wins decision path
```

### 9. Direction Delivery

```text
queued intervention
  -> tempo_checkpoint OR tempo_wait_for_direction OR tempo_fetch_intervention
  -> intervention marked fetched
  -> agent presents role/plan
  -> tempo_acknowledge_intervention
```

### 10. Owner Publication

```text
contract_owner completes final shape
  -> tempo_checkpoint publishContract
  -> contract publication persisted
  -> adapter resume directions queued
  -> adapters fetch publication and adapt
```

## What Worked

### Local-First Runtime

Tempo can run from an arbitrary git repo and keep its runtime state local. This
is valuable for privacy, speed, and demo reliability. It also makes the tool
feel installable rather than purely theoretical.

Keep this idea. Even if the next version uses Convex/Nia, a local edge daemon
should own raw diffs and only publish compressed/approved signals.

### Watcher As Source Of Truth

Agents do not need to cooperate for detection. Dirty worktrees still appear even
without MCP join. This is exactly right. Agent hooks improve attribution and
intervention, but detection should be based on the repo.

Keep this.

### MCP Advisory Loop

Tempo converted a hard prompt-injection problem into a safer pull-based MCP
workflow. Agents join, plan, checkpoint, wait, fetch, and acknowledge.

Keep this pattern. For Codex-first workflows, MCP is the right control plane.

### Complementary Agent Roles

The distinction between owner and adapter is useful. It gives agents different
jobs instead of telling everyone "be careful."

Keep and strengthen this. For the next version, directives should become a
polished "resolution plan" or "unified spec" that the user can understand in one
glance.

### Zod Schemas And Domain Vocabulary

The shared schema package is a strong foundation. It gives the product clear
nouns: fingerprint, surface, conflict, advisory, decision, intervention,
publication.

Keep the discipline, but revise the domain model for Nozomio:

- Add task/intention objects.
- Add team/session objects.
- Add cost metrics.
- Add context-source references.
- Add merge-simulation results if Tensorlake is used.

### SQLite Event History

Local event history makes the dashboard debuggable and supports exports. It is
useful for explaining what happened after a demo run.

Keep local audit logs. Add product-grade event summaries.

### Privacy Posture

Tempo does not persist raw diffs by default. OpenAI receives bounded changed
hunks only when configured. This is a credible privacy baseline.

Keep this, but make it visible in UX. Privacy should be a product feature:
"raw code stays local; fingerprints and risk summaries are shared."

### Tests

Tempo has good alpha coverage:

- CLI runtime setup.
- Git parsing.
- Watcher behavior.
- Ignored path behavior.
- Heuristic fingerprinting.
- OpenAI fallback/caching.
- Compatibility classification.
- Conflict detection.
- Store persistence.
- MCP lifecycle.
- Server APIs.
- Dashboard graph helpers.
- Eval metrics.

The tests encode product intent, not just implementation details. This helped
clarify what Tempo was trying to be.

Keep this testing style.

## What Did Not Work / Gaps

### No Real Nozomio Stack

Tempo has no real:

- Nia integration.
- Convex sync.
- Tensorlake merge simulation.
- Hyperspell context.
- InsForge auth/DB.
- Multi-laptop team relay.

That is fine for a local alpha, but it is a problem for the Nozomio hackathon.
The next build should use Nia and at least one other sponsor meaningfully, not
just mention them.

### No True Pre-Edit Prediction

Tempo records `tempo_plan`, but conflict detection is driven by live diffs. It
does not compare task prompts before code is written. It does not catch intent
conflicts at assignment time.

This misses the highest-value part of `kiro/context00.md`: preventing wasted
tokens before agents start writing incompatible code.

### No Automatic Unified Spec

Tempo can offer advisory options and role-specific directions. It does not
generate a rich merged spec that combines both intents, shows the final contract,
and gives each agent a concrete patch plan.

For demos, "split ownership" is less compelling than "here is the unified schema
and migration both agents should converge on."

### Heuristic Brittleness

The AST-lite indexer is pragmatic, but brittle:

- It depends on naming conventions.
- It may miss dynamic routes, nonstandard schemas, generated clients, and
  framework-specific contracts.
- It does not build a real dependency graph.
- It does not know which file is authoritative unless path names imply it.

This should be augmented by Nia/repo indexing or a stronger local code graph.

### Evals Are Too Thin

The fixture runner is useful, but it does not support the product claims needed
for Nozomio:

- No real agent runs.
- No token measurement.
- No merge simulation.
- No integration test pass/fail after branches combine.
- No dashboard metrics page.
- No sponsor-backed comparison.

The new project needs evals that produce demo numbers.

### Dashboard Is Too Operational

Tempo's dashboard is credible for an engineer operating a local daemon. It is
not yet a product moment for a judge, founder, or CFO.

It needs:

- Immediate conflict narrative.
- Token-cost saved.
- Before/after branch outcome.
- Clear "what would have gone wrong" visualization.
- More direct action: "approve unified spec" or "pause agents now."
- Less raw lifecycle detail during the demo path.

### Limited Team Story

Tempo works best on one machine with multiple worktrees. The current Nozomio
context wants AI-native teams and parallel engineers. A local-only topology
does not fully show team coordination.

The next version can still demo locally, but the architecture should imply:

- Shared team session.
- Multiple laptops.
- Agent/user identities.
- Context from tasks and communication tools.
- Central comparison of fingerprints, not central storage of raw code.

### Conflict Stack Coverage Is Narrow

Tempo is strongest at schema/type/API/component contract overlap. It is weaker
at:

- Architectural conflicts.
- Intent-level duplicate work.
- Product/spec conflicts.
- Dependency upgrade conflicts.
- Test strategy conflicts.
- Cross-repo conflicts.

Nozomio will care about the higher layers because they align with "managing
agentic context at scale."

## Product And UX Lessons

### Keep The User In Control

Tempo correctly avoids autonomous edits or merges. User-approved decisions are
required. The first-choice-wins rule prevents dueling control surfaces.

The next UX should preserve human approval, but make the decision feel simpler:

```text
Conflict detected:
Codex is changing Task.title into label.
Claude is changing Task.title into an object.

Recommended resolution:
Task has label: string and title: { text: string; subtitle: string }.

Approve unified spec?
```

### Lead With The Conflict, Not The Topology

Tempo's topology map is interesting, but the product should lead with the
detected problem and the avoided cost. The worktree map should support the
story, not become the story.

For Nozomio, the first screen should answer:

- Who is conflicting?
- What are they trying to do?
- Why is this expensive?
- What should happen now?
- What did we save?

### Make Cost Visible

`kiro/context00.md` has a strong token-cost framing. Tempo does not implement
that. The next dashboard should show:

- Estimated tokens already spent per agent.
- Projected wasted tokens if conflict continues.
- Tokens saved after early intervention.
- Time-to-detection.
- Confidence and evidence.

Even rough numbers will make the demo sharper.

### Show The High-Level Conflict Type

Tempo shows risk and surfaces. The Nozomio pitch needs conflict altitude:

- Textual.
- Syntactic.
- Semantic.
- Architectural.
- Intent.

The UI should classify and explain the altitude. This makes the product feel
newer than git/CI/PR review.

### Turn Advisory Into Resolution

Tempo's advisory options are generic. The next version should synthesize a
resolution artifact:

- Final shared contract/spec.
- Which agent owns which change.
- Files likely affected.
- Compatibility rules.
- Agent-specific next prompt.
- Optional merge simulation result.

This artifact can still be human-approved.

### Make Sponsor Integrations Legible

Tempo's product surface does not show Nia, Convex, or Tensorlake. For Nozomio,
the UX should make sponsor roles obvious without feeling pasted on:

- Nia: "Grounded by repo architecture: Task schema is authoritative in
  `src/shared/task.ts` and `src/db/schema.ts`."
- Convex: "Live fingerprints synced across 2 agents."
- Tensorlake: "Simulated merge predicts migration failure."
- Hyperspell, if used: "Do not interrupt: user in meeting" or "related DM
  directive found."

### Reduce Demo Complexity

Tempo's showcase demo required owner publication, adapter waiting, final
integration, and worktree cleanup. That is technically impressive but too many
steps for a short pitch.

For Nozomio, design a path with fewer concepts:

1. Agents start from two tasks.
2. Conflict warning appears.
3. User opens explanation.
4. Unified resolution appears.
5. User approves.
6. Agents receive corrected prompts.
7. Dashboard shows saved tokens and clean merge/simulation.

## Build Implications For The New Project

### Reuse These Ideas

- Local daemon/watcher owns raw diffs.
- Fingerprints, not raw code, are the product boundary.
- Worktree discovery is a great local demo substrate.
- MCP checkpoint/wait/fetch is better than terminal prompt injection.
- Shared typed schemas keep coordinator/dashboard/agent contracts sane.
- SQLite local event history is useful for audit and offline mode.
- First-decision-wins prevents conflicting user actions.
- Owner/adapter roles are useful for multi-agent coordination.
- Ignored-path filtering is mandatory.
- Tests should encode product behavior.

### Discard Or Rethink These

- Do not make local SQLite the whole product backbone.
- Do not stop at reactive live diffs; add pre-edit task/intent comparison.
- Do not rely on path/regex heuristics as the main intelligence story.
- Do not ship a dashboard that only engineers can decode.
- Do not make "Generate advisory" feel manual or secondary.
- Do not make evals synthetic-only.
- Do not over-index on worktree topology at the expense of impact.
- Do not bury sponsor integrations in architecture docs.

### Likely Next Architecture

A Nozomio-aligned version should look more like this:

```text
Local agent daemon per developer
  -> watches worktree/editor/git state
  -> extracts local fingerprint
  -> optionally stores raw diff locally only
  -> sends fingerprint/session/task metadata to shared sync

Shared session layer
  -> Convex or equivalent real-time state
  -> active agents, tasks, fingerprints, warnings, decisions

Grounding layer
  -> Nia indexes repo/docs/tasks/messages
  -> prediction agent queries Nia for authoritative surfaces and intent overlap

Prediction engine
  -> compares task prompts before edits
  -> compares live fingerprints during edits
  -> classifies conflict altitude
  -> estimates token/time risk
  -> optionally runs Tensorlake merge simulation

Resolution layer
  -> generates unified spec
  -> creates per-agent prompts/directives
  -> user approves
  -> MCP delivers directions to agents

Dashboard
  -> conflict-first UX
  -> cost and impact visible
  -> evidence from Nia/Tensorlake visible
  -> operational detail available but not primary
```

### Suggested Domain Model Additions

Tempo's domain model should be extended with:

- `taskIntent`: prompt, source, owner, linked issue/ticket, timestamp.
- `contextReference`: Nia result, file, doc, Slack/Linear item, confidence.
- `conflictAltitude`: textual, syntactic, semantic, architectural, intent.
- `costEstimate`: tokens spent, tokens at risk, time at risk, confidence.
- `mergeSimulation`: status, failed files/tests, generated patch summary.
- `resolutionSpec`: final desired contract, compatibility rules, affected
  agents, accepted/rejected state.
- `agentDirective`: prompt-ready instructions derived from the resolution spec.

### Suggested Demo Build

Use Tempo's worktree mechanism, but change the story:

1. Create a tiny todo/auth demo repo with obvious contract surfaces.
2. Start two agents with task prompts.
3. Before they edit, compare task intents and show a soft warning.
4. As they edit, show live fingerprints and escalating risk.
5. Query Nia for authoritative repo context.
6. Optionally run a Tensorlake merge simulation for the "wow" proof.
7. Generate one unified spec.
8. Deliver agent-specific prompts through MCP.
9. Show the token/time saved.

The most important shift is from "Tempo coordinates worktrees" to "Kiro
prevents wasted agent work."

## Concrete Findings By Subsystem

### CLI

Useful:

- Thin entrypoint.
- Local runtime setup.
- Optional `AGENTS.md` installation.
- `.tempo/.env` support.
- Clear MCP setup command.

Needs improvement:

- Better port conflict handling.
- Better packaged install path.
- Better "doctor" setup checks.
- Clearer onboarding for non-Codex agents.

### Coordinator

Useful:

- Fastify is simple enough.
- HTTP APIs and MCP wrappers share logic.
- Event stream supports live dashboard refresh.
- Local token protects mutations.

Needs improvement:

- Separate local edge coordinator from shared team coordinator.
- Add stronger event model for product analytics.
- Add explicit latency/cost metrics.
- Add background job boundaries for model calls and simulations.

### Store

Useful:

- Structured persistence.
- Restart-safe runtime state.
- No raw diffs by default.
- JSONL exports.

Needs improvement:

- Migrations are inline and alpha-grade.
- `settings`, `eval_runs`, and `eval_cases` exist but are underused.
- Team/shared state needs a cloud-backed equivalent.

### Watcher

Useful:

- Git worktree discovery is the right demo primitive.
- Ignored-path filtering avoids noisy false positives.
- Dirty state independent of MCP is correct.

Needs improvement:

- Need editor/active-file signal for earlier intent.
- Need commit/branch metadata beyond dirty diff.
- Need scalable multi-repo/team watching model.

### Fingerprinting

Useful:

- Bounded structured fingerprints.
- Optional model enrichment.
- Heuristic fallback.
- Surface labels are understandable.

Needs improvement:

- Needs real repo grounding.
- Needs stronger AST/code graph extraction.
- Needs stable contract IDs not only labels.
- Needs prompt/task intent fingerprints before edits.

### Conflict Engine

Useful:

- Separates overlap from compatibility.
- Avoids blocking harmless same-file edits.
- Additive-compatible changes can be notices.
- Evidence is attached to conflicts.

Needs improvement:

- Needs conflict altitude.
- Needs architectural/intent layer.
- Needs cost model.
- Needs multi-agent beyond pairwise comparisons.

### MCP

Useful:

- The agent pull model is pragmatic and safer than prompt injection hacks.
- Checkpoint responses are rich enough to steer agents.
- Waiting for owner publication is a smart coordination primitive.

Needs improvement:

- Joined-agent requirement creates unreachable sessions.
- Prompt UX should be more polished.
- Multiple agent frameworks need first-class support.

### Dashboard

Useful:

- Real operator console.
- Clean navigation.
- Conflict actions are functional.
- Timeline clarifies coordination lifecycle.
- Worktree map is a good visualization seed.

Needs improvement:

- Needs a conflict-first hero.
- Needs cost/impact metrics.
- Needs sponsor context surfaces.
- Needs polished demo mode.
- Needs real eval dashboard.
- Needs fewer operational details in the main path.

### Evals

Useful:

- Metrics vocabulary exists.
- Fixture runner is simple and fast.
- Tests validate recall and false-positive calculations.

Needs improvement:

- Must run real task-pair experiments.
- Must measure tokens/time.
- Must validate merge/test outcomes.
- Must support ablations.
- Must generate numbers for the pitch.

## Final Recommendation

Tempo should be treated as a successful technical probe, not as the product to
ship unchanged.

Keep the local evidence pipeline:

- Watch git worktrees.
- Extract fingerprints locally.
- Compare active work.
- Use MCP to coordinate agents.
- Persist structured decisions and events.

Rebuild the product around the Nozomio goal:

- Catch intent before edits, not only conflict after diffs.
- Ground predictions in Nia.
- Sync team state through Convex or an equivalent real-time layer.
- Use Tensorlake for one concrete merge-simulation proof if possible.
- Show conflict altitude and token cost.
- Generate a unified resolution spec, not just advisory options.
- Make the dashboard feel like a high-impact product, not only a local debugger.

Tempo proved that the basic coordination loop is feasible. The next project
needs to turn that loop into a sharper product: one that makes the cost of
parallel AI misalignment obvious, catches high-altitude conflicts early, and
gives agents a clean, user-approved path back to convergence.
