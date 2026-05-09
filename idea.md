# idea.md — Kiro

## What it is, in one line

Kiro is a real-time compatibility layer for in-flight code — extracts intent from work as it's happening and verifies it against indexed context across every tense (existing code, parallel agents, incoming PRs, downstream services).

## The hackathon

- Nozomio Hackathon — AI Nexus, May 9, 2026, EF office, San Francisco
- 9am hacking starts → 6pm submissions → 7:30pm winners
- Sponsors: Nia (Nozomio), Vercel, InsForge, Convex, Tensorlake, Hyperspell, Aside, Reacher
- Top prizes: M5 MacBook Pros + guaranteed sponsor interviews

## Total vision

Every line of code an agent or human writes has implicit compatibility requirements against context that exists in many tenses:

| Axis | What's checked | When |
|---|---|---|
| **Lateral** (parallel) | Two agents writing simultaneously | Now |
| **Backward** (existing) | Current main branch, deployed code | Before you write |
| **Forward** (incoming) | Open PRs, unmerged branches | Before you commit |
| **Downstream** (consumers) | Services and apps that depend on this | Before you merge |
| **Temporal** (future) | Roadmap, planned refactors, design docs | Before you architect |

Today's tools check compatibility *after the fact* — failing tests, merge conflicts, prod incidents. By then, tokens are spent and rework is expensive.

Kiro checks compatibility *before* the fact, by extracting intent from in-flight work and verifying it against indexed context across every tense. The conflict-prevention demo is one face of the compatibility problem.

**The richer the context index, the more axes Kiro can check.** Kiro grows in lockstep with Nozomio's index coverage.

## How Kiro fits Nozomio (the framing for Arlan)

Arlan's stated mission: managing agentic context at scale, indexing massive amounts of internal + external data, "kinda what Google did with the internet."

Three pillars on that mission:

- **Nia** — indexing (the substrate)
- **Tracer** — autonomous retrieval over Nia (an active agent)
- **Kiro** — real-time compatibility verification using Nia + Tracer (a new pillar)

Kiro is built **Nozomio-stack-native**. Not a tool that uses Nia. A sibling product on the same substrate.

Dependency direction is correct: Kiro needs Nia. Nia doesn't need Kiro. Arlan gains a moat-extending product without losing focus on his core indexer.

Every Nozomio product Kiro touches is **load-bearing**, not decorative:
- **Nia** — indexes the repo, open PRs, deployed services. Kiro queries Nia on every prediction call. Without Nia, recall collapses.
- **Tracer** — fetches deeply relevant context for verification when a shallow Nia query isn't enough.

This framing:
- Positions Kiro as a real product, not a feature
- Expands Nozomio's vision (verification is a category they don't own yet)
- Makes Kiro grow with every new index Nozomio ships

## Closer line for the pitch

> *"Kiro is the third pillar of the Nozomio stack — verification, alongside Nia's indexing and Tracer's retrieval. Built natively on both."*

Not "we'd love for you to absorb us." Not "we built a feature." A peer-shaped pitch.

## What we're building today (9 hours)

Three demo beats, three axes, ranked by priority:

### Tier 1: must-ship — Lateral (parallel agents)

The original demo. Two coding agents on the same repo, fingerprints stream into Nia in real time, conflict predicted, unified spec proposed, human approves, both agents realign.

This is the reliable, visceral, central demo. **If only one beat ships, it's this one.**

- Codex CLI in pane 1, Claude Code in pane 2
- Each in its own git worktree of the same toy todo app
- File watcher → fingerprint extractor (small model, structured output) → Convex sync → Nia-grounded prediction agent → dashboard alert + re-prompt offer
- Three-tier interruption ladder: whisper / nudge / stop

### Tier 2: should-ship — Backward (existing main)

When an agent starts writing, Kiro queries Nia for relevant existing code and flags incompatibilities with main.

Examples: convention drift (snake_case vs camelCase), duplicate function definition, contract break with deployed schema.

Cheap to add — same compare logic as lateral, just one fingerprint vs Nia-indexed main instead of two live fingerprints. **Doubles the story for marginal build cost.**

### Tier 3: stretch — Forward (incoming PRs)

Point Kiro at a repo with one open PR. Start an agent on a related feature. Kiro flags: *"open PR #47 is adding OAuth fields to User. Your roles work will conflict with their schema migration. Here's what they're doing — want to align?"*

Requires Nia to index open PRs. Big story for moderate code. **Build only if Tier 1 and Tier 2 are solid by 3pm.**

### Tier 4: gesture (slide / roadmap only) — Downstream + Temporal

- Downstream — same primitive checks compatibility against deployed services indexed by Nia.
- Temporal — same primitive checks compatibility against design docs and planned work indexed by Nia.

These appear on a roadmap slide. Not built today.

## Recommendation

Build Tier 1 and Tier 2 well. Demo both. Mention Tier 3 as a stretch goal we may reach. Slide for Tier 4. Pitch covers all five axes; build covers two solidly.

If Tier 1 isn't bulletproof by 12pm, **stop everything else and harden it.** A clean parallel-agent demo beats a glitchy three-axis demo every time.

## Architecture

```
Codex (worktree-A)    Claude Code (worktree-B)
       \                       /
        File watcher (debounced)
                |
        Fingerprint extractor (small model, structured)
                |
       ┌────────┴────────┐
   Convex (live sync)   Nia (in-flight index — fingerprints become indexed artifacts)
                |
        Prediction agent (queries Nia for grounding across tenses)
                |
       ┌────────┴────────┐
  Dashboard alerts   Re-prompt injector (on user accept)
```

### Fingerprint shape

```json
{
  "agent_id": "codex" | "claude_code",
  "files_touched": [...],
  "symbols": { "added": [...], "modified": [...], "removed": [...] },
  "schema_changes": [...],
  "semantic_summary": "one-sentence intent",
  "in_progress_commit_message": "..."
}
```

Capped at ~500 tokens. Raw code never leaves the dev's machine — only structured fingerprints.

### Tech stack

| Component | Tech |
|---|---|
| Repo / open PR / main indexing | **Nia** (load-bearing) |
| Real-time sync between agents and dashboard | **Convex** (load-bearing) |
| Fingerprint extraction + prediction agent | **Claude API** (Haiku for ticks, Sonnet for deep checks) |
| Merge simulation in sandbox | **Tensorlake** (if time) |
| Personal context (calendar, DMs) | **Hyperspell** (skip unless natural fit) |
| Dashboard | **Next.js + Vercel + shadcn** |
| Auth / DB | **InsForge** (only if needed) |
| File watcher daemon | Bun or Node |
| Agent isolation | Git worktrees |

### Sponsor decisions

- **Nia, Convex, Vercel** — locked, load-bearing
- **Tensorlake** — include if Tier 1 + 2 ship by 3pm. Merge simulation in sandbox = wow demo moment, but skippable.
- **Hyperspell** — skip unless we find a natural fit. Forced personal-context integration weakens the pitch.
- **Aside** — skip. Browser-as-OS doesn't fit Kiro's terminal-first surface.
- **InsForge** — skip unless we need auth/DB beyond hackathon scope. Local state is fine for demo.
- **Reacher** — skip. Creator marketing tool, no fit.

Keep the sponsor story tight: every product mentioned must be load-bearing or genuinely additive. Three deep integrations beats six shallow logos.

## The demo (3 min)

**Setup:** laptop on table. Two terminal panes (Codex + Claude Code), browser dashboard. Cards with 3 task pairs printed. Toy todo app pre-loaded.

**Beat 1 — Backward check (30s):**
Start one agent on "add user roles." Kiro immediately flags: *"User schema in main uses snake_case, your agent is generating camelCase. Inconsistent with existing code."* Auto-fix offered. Accept.

This is the *"I'm not just a parallel tool"* moment.

**Beat 2 — Lateral check (parallel demo, 1.5 min):**
Spin up the second agent on a parallel feature. Both work simultaneously. Conflict prediction → unified spec → both agents realign and continue cleanly.

The visceral, central demo.

**Beat 3 — Forward check (30s, if shipped):**
*"Also, there's an open PR #47 adding OAuth fields. Your work will conflict with their schema migration. Here's their plan — want to align?"* Show the cross-PR check.

**Beat 4 — The frame (15s):**
*"Three compatibility checks, three tenses: against existing code, against parallel agents, against incoming work. Same primitive. Nia indexes the context, Kiro verifies new work against it in real time. Two more tenses on the roadmap — downstream services and design docs. Same architecture."*

**Beat 5 — Numbers (15s):**
*"Across 20 task pairs we ran overnight: 94% recall, 11% false positives, 8.4K tokens saved per caught conflict. Without Nia in the prediction loop, recall drops to 67% — Nia is doing real work, not decoration."*

**Closer:**
*"Kiro is the third pillar of the Nozomio stack — verification, alongside Nia's indexing and Tracer's retrieval. Built natively on both."*

## Eval data plan

Two paths for "results" numbers in the pitch:

**Path A — real eval today (preferred):**
- Pre-define 20 task pairs covering Tier 1 (lateral) and Tier 2 (backward) cases
- Run each in 3 conditions: no Kiro, Kiro lateral only, Kiro full
- Collect: token spend per condition, conflict catch rate, false positive rate, prediction latency
- **Run in batch overnight** before final submission, while we polish the dashboard
- Add an ablation: Kiro with Nia vs Kiro without Nia. Proves Nia is load-bearing.
- Time budget: 1 hour to set up the harness (3-4pm), runs while you eat dinner, results in the pitch by 6pm

**Path B — Showcase numbers + estimates:**
- Use the data from the Chapman Showcase yesterday as the headline
- *"At Chapman's Engineering Showcase yesterday, Kiro caught X of Y conflicts across 20 task pairs."*
- Add the cross-tense extension as today's hackathon contribution
- Cleaner if today's day runs tight — no risk of bad numbers ruining the pitch

**Recommendation:** plan for Path A, fall back to Path B if the harness isn't running by 4pm. Run the eval in parallel with dashboard polish — the eval doesn't need a UI.

## Re-prompt injection — the hardest unknown

Neither Codex CLI nor Claude Code has an official API for "inject new prompt mid-session." Investigate first.

Workarounds in priority order:
1. Control file the agent watches — write the new spec, agent reads on next iteration
2. tmux send-keys — programmatic stdin injection
3. MCP intervention if exposed
4. **Fallback:** Kiro generates the unified spec, user copy-pastes manually into both agents. Less wow, ships reliably.

**Decision rule:** if injection isn't working by 11am, take the fallback. Don't burn the day fighting it.

## Risks and failure modes

- **Re-prompt injection blocked** → manual paste fallback (still demos cleanly)
- **Fingerprint quality bad** → tune extraction prompt, save failure cases for iteration
- **Latency >2s** → profile early, cache aggressively, tier the model
- **Toy app doesn't surface enough conflicts** → design schema/API for natural collision points (priority + tags + status fields all on Task model creates rich collision surface)
- **WiFi dies on stage** → pre-cache Nia results for the 3 demo task pairs, local fallback mode
- **Live agents glitch on stage** → pre-recorded video of a clean run as backup

## Game-day priorities

| Time | Goal |
|---|---|
| 8:30–9:00 | Repo created, worktree script working, sponsor accounts ready (Nia, Convex, Vercel) |
| 9:00–11:00 | File watcher + fingerprint extractor end-to-end on one worktree |
| 11:00–11:30 | Re-prompt injection investigation. Decide path or fallback. |
| 11:30–1:00 | Prediction agent + Convex sync. Two agents stream, conflict flags. |
| 1:00–3:00 | Dashboard UI. Tier 1 (lateral) demo running cleanly. |
| 3:00–4:00 | Tier 2 (backward check) ships. Eval harness set up. |
| 4:00–5:00 | Tier 3 (forward check) ships if Tier 1+2 are solid. Eval running. |
| 5:00–5:30 | Polish dashboard, record backup demo video. |
| 5:30–6:00 | Practice 3-min pitch out loud 5+ times. |
| 6:00 | Submit. Eat dinner. Don't touch code. |
| 6:30–7:30 | Judging. |

**Hard rule:** if Tier 1 is glitchy at 12pm, drop everything else. A clean parallel demo > a flaky three-axis demo.

## Why "Kiro"

Kiro reads as clean and short — works as a CLI verb (`kiro watch`, `kiro init`), works as a brand. Phonetically distinct from existing dev tools. Easy to type, easy to say, no git-command collision (unlike "rebase").

Quick gut-check items before locking:
- Domain availability (`.dev`, `.ai`, `.so`)
- npm / PyPI namespace
- GitHub project name collision check


## Things to remember on stage / at table

- **Lead with the layer claim**, not the conflict-prevention feature. *"Real-time compatibility layer for in-flight code"* > *"prevents merge conflicts."*
- **Name Nia, Tracer in the first sentence** — signals you've done the homework on Nozomio's stack.
- **Don't oversell vs swarms.** Acknowledge prior art (BridgeSwarm, Overstory, Nevo, the Microsoft horror story). Position precisely as the missing primitive — *predictive, semantic, with human approval, cross-model.*
- **Cross-model is unfakeable differentiation.** Codex + Claude Code in one demo. No swarm tool does this.
- **Numbers stick more than claims.** Eval data is the closer. Have it ready.
- **Mention Chapman Showcase from yesterday.** Real-world validation in 24 hours is a strong signal.
- **Be confident, not corporate.** Arlan likes builders with edge and personality.

## Open decisions (resolve before 9am)

- ✅ Name: Kiro (verify domains)
- ✅ Tier scope: Tier 1 + Tier 2 must ship; Tier 3 stretch
- ✅ Framing: Nozomio-stack-native pillar (sibling to Nia + Tracer)
- ✅ Closer: peer-shaped pitch, not absorption offer
- ✅ Sponsor stack: Nia + Convex + Vercel core; Tensorlake stretch; skip rest
- ✅ Eval plan: Path A preferred, Path B fallback
- ⏳ Re-prompt injection mechanism — investigate first thing
- ⏳ Toy app schema — design for collision-rich surface
