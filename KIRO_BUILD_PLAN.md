# Kiro Build Plan

## One-Line Pitch

Kiro is the company brain for coding agents: it watches live engineering work across people, agents, and uncommitted git diffs, then warns teams before a PR creates a huge blast radius.

## Hackathon Context

- Track: Company Brain.
- Sponsors: Nia + Hyperspell.
- Date: May 9, 2026.
- Submission deadline: 6:00pm.
- Judging starts: 6:10pm.
- Required submission assets:
  - Deployed demo link, not localhost.
  - GitHub repo URL.
  - Names and emails for all team members.
- Credits available:
  - Hyperspell: 120k.
  - Nia: 100k.

## Rubric Targets

| Criterion | Weight | How Kiro Wins |
| --- | ---: | --- |
| Cross-source synthesis | 30% | Combines Hyperspell company sources, GitHub issues/PRs, Nia codebase context, and live git diffs into one operational brain. |
| Real work, not just answers | 25% | Kiro actively blocks/redirects risky coding work before commit or PR. |
| Hyperspell integration depth | 25% | Hyperspell is the company memory source for Slack/Notion/GitHub/company decisions; removing it makes guardrails and citations collapse. |
| Demo and presentation | 10% | Pixel office makes the invisible company brain visible; live conflict alert is easy to understand in seconds. |
| Judge personal rating | 10% | Strong CTO pain: prevent giant destructive PRs, conflicting agent work, and lost team context. |

## Product Scope

Build a demo-grade but architecturally real system with three surfaces:

1. **Company Brain Onboarding**
   - Kiro creates an employee profile from GitHub, issues, PRs, company docs, and codebase context.
   - Shows strengths, known modules, onboarding status, current task, owners, and a context-risk score.

2. **Live Blast-Radius Monitor**
   - Kiro watches uncommitted local git diffs from multiple worktrees/agents.
   - If two people or agents are working on the same task, file, schema, API contract, or risky surface, Kiro warns both before commit or PR.
   - It also warns on destructive operations such as broad deletes, unsafe rebases, schema churn, and forbidden stack choices.

3. **Coding-Agent MCP Plugin**
   - Codex/Claude Code can join Kiro, publish plans, checkpoint diffs, receive guardrails, and pause when a blocking conflict appears.

## Demo Story

Opening line:

> Kiro is the company brain for coding agents. It stops engineers and agents from creating massive PR blast radius before the code is ever pushed.

Three-minute flow:

1. Open the pixel office dashboard.
2. Click the new employee, Sam.
3. Show Sam's profile being assembled from GitHub, issues, PRs, Hyperspell company context, and Nia codebase context.
4. Show Sam working with a coding agent.
5. Show another teammate/agent working on overlapping uncommitted changes.
6. Kiro detects the overlap from live git diffs before either person commits.
7. Both users receive a real-time warning.
8. Kiro shows blast radius: affected files, owners, contracts, tests, PRs, and company guardrails.
9. Kiro recommends a unified spec or ownership split.
10. Show PR readiness with citations.

Close:

> Hyperspell ingests the company. Nia indexes the code. Kiro verifies engineering work before it becomes a destructive PR.

## Architecture

```text
Hyperspell
  Slack / Notion / Drive / Gmail / GitHub company context
        |
        v
Company Brain Synthesis  <---->  Nia
        |                         repo index / docs / local files / code context
        v
Kiro Backend
  employee profiles
  source citations
  guardrails
  live tasks
  worktree sessions
  diff fingerprints
  blast-radius events
        |
        +--------------------+
        |                    |
        v                    v
Next.js Demo Dashboard     MCP Server
pixel office               Codex / Claude Code tools
realtime alerts            join / plan / checkpoint / pause
```

## Data Model

Minimum entities:

- `employees`
  - name, email, role, GitHub handle, profile URL, status.
- `employee_profiles`
  - employee id, strengths, weak spots, known modules, onboarding status, context-risk score, source ids.
- `repos`
  - repo name, root path, indexed status, default branch.
- `worktrees`
  - repo id, path, branch, head sha, dirty state, owner/session id.
- `agent_sessions`
  - agent kind, display name, current plan, worktree id, status.
- `tasks`
  - title, issue id, owner, matched employee id, status, progress percent.
- `live_diffs`
  - worktree id, files touched, diff hash, symbols, raw summary, created at.
- `contract_surfaces`
  - surface label, kind, files, confidence, owner, evidence.
- `conflicts`
  - affected worktrees/sessions, risk, type, summary, status, evidence.
- `blast_radius_events`
  - session id, files, modules, owners, tests, related PRs, risk, recommendation.
- `guardrails`
  - title, severity, rule, source ids, affected paths, recommendation.
- `notifications`
  - target user/session, event id, severity, read state.
- `source_citations`
  - source type, title, URL/path, summary, confidence label, freshness.

## Demo Data

Seed enough realistic data to survive flaky sponsor APIs:

- Employees:
  - Sam: new engineer, Python strong, TypeScript light.
  - Alice: auth owner.
  - Ben: frontend/platform engineer.
  - Marcus: notifications owner.
- Tasks:
  - Fix notification retry bug.
  - Add OAuth profile fields.
  - Update auth token refresh path.
- Guardrails:
  - Use `asyncio.sleep`, not `time.sleep`, in async workers.
  - Do not introduce MongoDB; company uses Postgres only.
  - Do not delete auth migrations without owner review.
  - Do not rebase/drop shared history on protected branches.
- Conflict:
  - Sam/Codex edits auth schema.
  - Alice/Claude edits OAuth fields in the same contract.
  - Kiro warns before commit.

## Reuse Plan

Use `archive/daegu` for:

- Nia API wrapper ideas.
- Citation chips.
- Evidence panel.
- Convex realtime patterns.
- Pixel office and character dossier concepts.

Use `archive/Tempo` for:

- Git worktree discovery.
- Dirty-state and diff tracking.
- Fingerprinting.
- Contract-surface extraction.
- Conflict detection.
- MCP join/plan/checkpoint/wait/decision flow.
- Eval fixtures.

Avoid:

- Daegu firing/termination/replacement language.
- AgentMail as a core dependency.
- Full internal Tempo renames before the demo.
- Fake citations presented as live data.

## Dev 1: Backend, Architecture, Employee Brain, Blast Radius

### Owner Goal

Build the real Kiro engine: source ingestion, employee profiles, live git diff monitoring, blast-radius classification, guardrails, and real-time notifications.

### Primary Files/Areas

- New backend/Convex schema and functions.
- Adapted Nia wrapper from `archive/daegu/lib/nozomio.ts`.
- Adapted conflict/diff logic from `archive/Tempo/packages/coordinator`.
- Shared data contracts used by frontend and MCP.

### Task Checklist

- [ ] Define the backend schema for employees, profiles, repos, worktrees, sessions, diffs, surfaces, conflicts, guardrails, citations, and notifications.
- [ ] Add seed data for Sam, Alice, Ben, Marcus, demo tasks, guardrails, and conflict scenarios.
- [ ] Adapt Nia retrieval wrapper:
  - [ ] repo/codebase context lookup
  - [ ] employee/profile evidence lookup
  - [ ] source normalization into citations
  - [ ] demo fallback when `NIA_API_KEY` is missing.
- [ ] Add Hyperspell integration/fallback:
  - [ ] company source ingestion status
  - [ ] Slack/Notion/GitHub decision lookup
  - [ ] normalized source citations
  - [ ] demo fallback when Hyperspell is unavailable.
- [ ] Implement employee profile synthesis:
  - [ ] strengths
  - [ ] weak spots
  - [ ] known modules
  - [ ] source-backed context summary
  - [ ] context-risk score.
- [ ] Implement guardrail model:
  - [ ] approved stack rules
  - [ ] forbidden technologies
  - [ ] destructive git/code operations
  - [ ] owner-review rules.
- [ ] Adapt Tempo git watcher:
  - [ ] detect worktrees
  - [ ] track dirty state
  - [ ] compute diff hash
  - [ ] extract changed files
  - [ ] extract symbols and contract surfaces.
- [ ] Implement blast-radius classifier:
  - [ ] shared file overlap
  - [ ] shared symbol overlap
  - [ ] schema/API/type/component surface overlap
  - [ ] deletes and migrations
  - [ ] owner-sensitive paths
  - [ ] in-flight task overlap.
- [ ] Implement conflict lifecycle:
  - [ ] open
  - [ ] acknowledged
  - [ ] resolved
  - [ ] ignored.
- [ ] Implement real-time notifications:
  - [ ] notify both affected engineers/agents
  - [ ] include evidence and recommended next action
  - [ ] expose unread/current events to frontend.
- [ ] Implement PR readiness report:
  - [ ] blast radius
  - [ ] affected owners
  - [ ] affected tests
  - [ ] related PRs/issues
  - [ ] citations
  - [ ] final recommendation.

### Backend Acceptance Criteria

- [ ] Can create a profile for Sam from seeded source data.
- [ ] Can ingest or fallback to Nia/Hyperspell source packets.
- [ ] Can detect two uncommitted worktrees touching the same contract.
- [ ] Can create a blocking conflict before commit.
- [ ] Can notify both affected sessions.
- [ ] Can produce a PR readiness report with citations.

## Dev 2: Frontend Demo

### Owner Goal

Make the product visually obvious and demoable: a pixelated office with animated employees/agents, live profile panels, brain assembly, task progress, blast-radius alerts, and PR readiness.

### Primary Files/Areas

- Root Next.js app.
- Dashboard routes.
- Adapted Daegu pixel components.
- Realtime queries/subscriptions.
- Fixture demo state.

### Task Checklist

- [ ] Scaffold the root app if it does not exist.
- [ ] Create main demo route `/` or `/demo`.
- [ ] Adapt `PixelOffice`:
  - [ ] remove OpenFire language
  - [ ] rename statuses for onboarding/work/risk
  - [ ] show humans and agents
  - [ ] support click-to-open dossier.
- [ ] Restore or replace pixel assets:
  - [ ] character sprites
  - [ ] office/furniture sprites
  - [ ] fallback simple pixel avatars if assets are missing.
- [ ] Adapt `CharacterDossier`:
  - [ ] employee role
  - [ ] current task
  - [ ] progress
  - [ ] source coverage
  - [ ] context-risk score
  - [ ] known modules
  - [ ] active agents.
- [ ] Build Brain Assembly panel:
  - [ ] Hyperspell source cards
  - [ ] Nia source cards
  - [ ] GitHub PR/issue cards
  - [ ] animated progress/status counts.
- [ ] Build Live Work panel:
  - [ ] active people
  - [ ] active coding agents
  - [ ] current tasks
  - [ ] worktree/branch
  - [ ] last checkpoint.
- [ ] Build Blast Radius panel:
  - [ ] risk level
  - [ ] affected files
  - [ ] affected surfaces
  - [ ] owners
  - [ ] related PRs/tasks
  - [ ] recommended next action.
- [ ] Build Guardrails panel:
  - [ ] company no-go rules
  - [ ] source citations
  - [ ] active violations.
- [ ] Build Context Stream:
  - [ ] citation cards
  - [ ] confidence chips: Decided, Convention, Considered, Stale
  - [ ] source type icons/labels.
- [ ] Build PR Readiness screen:
  - [ ] summary
  - [ ] tests
  - [ ] citations
  - [ ] risk verdict
  - [ ] merge recommendation.
- [ ] Add fixture mode:
  - [ ] works without backend
  - [ ] clearly labels fixture/demo data
  - [ ] matches final demo script.
- [ ] Add realtime mode:
  - [ ] subscribes to backend state
  - [ ] updates alerts live
  - [ ] animates office status changes.
- [ ] Polish the 3-minute path:
  - [ ] first screen communicates Kiro immediately
  - [ ] no landing-page-only screen
  - [ ] no hidden critical state
  - [ ] conflict alert is legible from a few feet away.

### Frontend Acceptance Criteria

- [ ] Pixel office renders.
- [ ] Clicking Sam opens a dossier.
- [ ] Brain assembly shows Nia + Hyperspell as load-bearing.
- [ ] A live/fixture conflict appears clearly.
- [ ] PR readiness page is present.
- [ ] The demo works even if APIs fail.
- [ ] Deployed URL can be submitted.

## Dev 3: Coding-Agent MCP Plugin

### Owner Goal

Make Kiro usable by coding agents. Agents should join, publish plans, checkpoint live work, receive blast-radius warnings, pause on conflicts, and record decisions.

### Primary Files/Areas

- MCP server/tool definitions.
- Tempo MCP adaptation.
- Agent-facing command docs.
- Local setup instructions.

### Required MCP Tools

- `kiro_join`
  - Register current coding agent, repo, cwd, worktree, and display name.
- `kiro_plan`
  - Publish current task intent before edits begin.
- `kiro_checkpoint`
  - Send/refresh current diff fingerprint and receive risk state.
- `kiro_wait_for_direction`
  - Pause until a user or owner provides direction.
- `kiro_record_decision`
  - Record selected conflict resolution or owner split.
- `kiro_acknowledge`
  - Mark an intervention as received by the agent.

### Task Checklist

- [ ] Copy/adapt Tempo MCP handler structure.
- [ ] Expose Kiro-branded tool names.
- [ ] Keep internal Tempo schemas if needed to move fast.
- [ ] Implement `kiro_join`:
  - [ ] infer worktree from cwd
  - [ ] create agent session
  - [ ] return session id and tracked worktree id.
- [ ] Implement `kiro_plan`:
  - [ ] store current task intent
  - [ ] link to employee/task if possible.
- [ ] Implement `kiro_checkpoint`:
  - [ ] trigger/consume latest diff fingerprint
  - [ ] return risk, warnings, citations, and pause flag.
- [ ] Implement `kiro_wait_for_direction`:
  - [ ] return queued intervention
  - [ ] timeout gracefully
  - [ ] keep blocking conflicts visible.
- [ ] Implement `kiro_record_decision`:
  - [ ] selected option
  - [ ] owner
  - [ ] next action
  - [ ] notify affected sessions.
- [ ] Implement `kiro_acknowledge`.
- [ ] Add agent prompt guidance:
  - [ ] call `kiro_join` before work
  - [ ] call `kiro_plan` before editing
  - [ ] call `kiro_checkpoint` after meaningful edits
  - [ ] stop when `pause: true`
  - [ ] follow Kiro guardrails before continuing.
- [ ] Create a local smoke demo:
  - [ ] Agent A joins and edits schema.
  - [ ] Agent B joins and edits same schema.
  - [ ] Both checkpoint.
  - [ ] Kiro returns conflict.
  - [ ] One records decision.

### MCP Acceptance Criteria

- [ ] Codex can register with Kiro.
- [ ] A session can publish its plan.
- [ ] A checkpoint returns live risk.
- [ ] Blocking conflict returns `pause: true`.
- [ ] Agent can fetch direction.
- [ ] Decision is reflected in dashboard state.

## Cross-Team Interfaces

Backend -> Frontend:

- `GET /api/demo/state` or equivalent realtime query returns:
  - employees
  - profiles
  - agents
  - tasks
  - brain sources
  - guardrails
  - conflicts
  - blast radius events
  - notifications.

Backend -> MCP:

- Shared session ids.
- Shared worktree ids.
- Shared conflict ids.
- Shared decision ids.
- Same conflict lifecycle as dashboard.

Frontend -> Backend:

- Start demo run.
- Select/acknowledge conflict.
- Mark decision.
- Switch fixture/live mode.

## Build Order

1. Establish root app and shared types.
2. Seed fixture state for the exact demo.
3. Frontend renders fixture demo.
4. Backend creates same state live.
5. MCP joins/checkpoints into backend.
6. Tempo conflict engine produces real conflict.
7. Frontend subscribes to live conflict.
8. Polish demo and deploy.

## Cut List If Time Runs Short

Keep:

- Pixel office.
- Employee profile.
- Nia + Hyperspell source visibility.
- One live/fixture blast-radius warning.
- PR readiness summary.
- MCP tool names and at least join/plan/checkpoint.

Cut:

- Full auth.
- Full LinkedIn scraping.
- Always-On mode.
- AgentMail.
- Deep analytics/evals.
- Complete Tempo rebrand.
- Tensorlake sandbox.

## Test Plan

Backend:

- [ ] Profile synthesis from fixture sources.
- [ ] Nia wrapper fallback.
- [ ] Hyperspell fallback.
- [ ] Guardrail matching.
- [ ] Diff fingerprint creation.
- [ ] Conflict detection for same schema/API/type.
- [ ] No conflict for unrelated files.
- [ ] Notification fanout to both sessions.

Frontend:

- [ ] Dashboard renders from fixture state.
- [ ] Pixel office is nonblank.
- [ ] Dossier opens on click.
- [ ] Brain assembly cards render.
- [ ] Conflict alert appears and is readable.
- [ ] PR readiness screen renders.

MCP:

- [ ] `kiro_join` returns session id.
- [ ] `kiro_plan` updates session.
- [ ] `kiro_checkpoint` returns risk.
- [ ] Conflict checkpoint returns `pause: true`.
- [ ] `kiro_record_decision` updates conflict state.

Demo:

- [ ] Full 3-minute script rehearsed.
- [ ] Fixture mode works with no network.
- [ ] Live mode works with available APIs.
- [ ] Deployed URL works on another machine.
- [ ] Submission form ready before 6:00pm.

## Final Demo Checklist

- [ ] Deployed URL.
- [ ] GitHub repo URL.
- [ ] Team names and emails.
- [ ] Hyperspell credits/API configured or fixture fallback labeled.
- [ ] Nia credits/API configured or fixture fallback labeled.
- [ ] Demo branch clean enough to show.
- [ ] Backup recording if live APIs fail.
- [ ] One sentence pitch memorized.

