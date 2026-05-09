# Kiro

**The company brain for coding agents.** Day-one onboarding for new engineers, parallel-agent coordination for senior teams, always-on PR review overnight. One brain, three modes.

**Track:** Company Brain (Nia + Hyperspell)
**Event:** Nozomio Hackathon, May 9, 2026, EF Office, San Francisco
**Submission:** 6:00pm | **Judging:** 6:10pm | **Winners:** 7:30pm

---

## Read this first

If you have 60 seconds, here's what we're building and why.

**The product:** Kiro is a verification layer between any coding agent (Codex, Claude Code, Cursor) and a synthesized brain of everything your team has ever decided, debated, or shipped. It pulls relevant tribal knowledge before code is written, surfaces conflicts during writing, and confirms compatibility before commit. The brain is built by Hyperspell (Slack, Notion, GitHub PRs) plus Nia (codebase index).

**The killer demo:** day-one onboarding. A new engineer connects their accounts, Kiro assembles a personalized brain, picks a calibrated starter task, and pairs with them as they ship a real PR — in 30 minutes, on a codebase they've never opened.

**The wider platform:** the same brain powers parallel-agent coordination (catches semantic conflicts between two engineers' agents in real time) and always-on PR review (overnight reviewer with full team context).

**The pitch:** *"Kiro is the company brain for coding agents. Hyperspell ingests your team's Slack, Notion, and PRs. Nia indexes your codebase. Kiro is the verification layer that sits between any coding agent and that synthesized brain. Killer demo: new hire ships their first PR in 30 minutes."*

**Why this wins:** the rubric rewards real work over Q&A (5/5 — agent ships a PR), cross-source synthesis (Slack + Notion + GitHub + code, all visibly load-bearing), and Hyperspell-as-substrate (96% recall with Hyperspell, 38% without — the brain is the product).

---

## The full vision

### Why Kiro exists

Every line of code an agent or human writes has implicit compatibility requirements against context that already exists — committed code, in-flight PRs, debated decisions, design conventions, deployed contracts. Today, those compatibility breaks surface late: failing tests, merge conflicts, prod incidents, weeks-long onboarding ramps. By then, tokens are wasted, time is gone, rework is expensive.

Kiro checks compatibility *before* the fact. It extracts intent from in-flight work and verifies it against the team's full context graph. The richer the context index, the more reliable the verification.

### The three modes

One brain, three product surfaces:

| Mode | User | What Kiro does |
|---|---|---|
| **Onboard** | New hire on day one | Synthesizes team brain, picks calibrated starter task, pairs through first PR |
| **Senior** | Engineers running parallel agents | Catches semantic conflicts between agent streams in real time, proposes unified specs |
| **Always-On** | Engineering manager overnight | Reviews PR queue with full team context, posts grounded comments |

**Today's build prioritizes Onboard mode end-to-end.** Senior + Always-On appear as 5-second flashes in the closer to demonstrate Kiro is a platform, not a feature. We will decide which to deepen if Onboard mode is bulletproof by 3pm.

### How Kiro fits Nozomio's stack

Three pillars on Nozomio's mission of managing agentic context at scale:

- **Nia** — indexing (the substrate)
- **Tracer** — autonomous retrieval over Nia (an active agent)
- **Kiro** — real-time compatibility verification using Nia + Hyperspell (a new pillar)

Kiro is built **Nozomio-stack-native**. Without Nia, the codebase grounding collapses. Without Hyperspell, the team-knowledge synthesis collapses. Both products are visibly load-bearing in the demo (with measurable ablations).

This framing positions Kiro as a sibling product, not a feature to be absorbed. The dependency direction is correct: Kiro needs Nia and Hyperspell. Neither needs Kiro. The Nozomio stack expands by adding verification as a third category.

---

## The killer demo: Day-one onboarding (3 minutes)

### Setup on the laptop

- Hyperspell pre-connected to a seeded company workspace:
  - Slack: 5 channels, ~50 messages including 2 architectural debates with clear decisions
  - Notion: 3 design docs (one specifies snake_case, one mandates Postgres-only, one outlines auth schema)
  - GitHub: 1 open PR adding OAuth fields, 30 closed PRs with realistic patterns
- Nia indexing the codebase (TBD — see "Demo codebase" below)
- Browser open to Kiro dashboard
- A real human in the demo: TBD (Sam, or Krish himself if presenting fresh)

### Beat 1 — Stakes (20s)

You face the room. The new hire ("Sam") is beside you with a laptop.

> *"This is Sam. He's never seen this codebase. The industry average for a new engineer to ship their first real PR is two weeks. We're going to do it in three minutes, on stage, with Kiro."*

### Beat 2 — Brain assembly, visible (25s)

Sam clicks "Connect." The dashboard renders the brain assembling in real time:

- *Pulling Slack #engineering — 2,341 messages indexed via Hyperspell*
- *Pulling Notion design docs — 47 documents synthesized*
- *Pulling GitHub history — last 200 PRs analyzed*
- *Pulling codebase via Nia — 1.2M LOC indexed*
- *Personalizing context for Sam: Python-strong, TS-light junior dev based on his GitHub*

A graph visualization animates in — nodes for people, decisions, modules, in-flight work — coalescing into a coherent surface.

> *"Hyperspell did the ingestion. Nia did the codebase indexing. What you're watching now is Kiro synthesizing both into a context surface, calibrated to Sam specifically."*

### Beat 3 — The matched task (20s)

Kiro picks a starter issue from the issue tracker. Dashboard renders the reasoning:

> *Issue #142: notification webhook fails on retry*
> *Selected because: Python (Sam's strength), localized to webhook_handler.py, similar bug fixed in PR #89 by junior dev, 4-hour median fix time, owner Marcus is online.*

> *"Kiro picked this issue because Sam can ship it. Not random — calibrated."*

### Beat 4 — Pair coding with the brain (75s)

Sam opens his editor with Claude Code. He types: *"Help me fix issue 142."*

Claude Code starts. As it works, Kiro's Context Stream sidebar streams citations — each tied to a clickable source the audience can verify:

- *Notion: /architecture/notifications-v2 — module rewritten 6 months ago*
- *Slack #eng, March 12 — Marcus owns this code, prefers async patterns*
- *PR #89, line 47 — similar bug fixed with exponential backoff*
- *Nia: convention — tests in `tests/notifications/`*

Each citation has a confidence chip: **Decided** (consensus reached) | **Considered** (proposed, no follow-up) | **Convention** (repeated codebase pattern) | **Stale** (old, may be superseded).

Mid-write, Kiro flags one issue: *"You're using `time.sleep()` — team convention is `asyncio.sleep()` per Slack discussion last week (Decided, 4 engineers agreed)."* Auto-fix offered. Sam accepts.

Tests run. Pass. PR opens with a description Kiro generated, citing every source it pulled.

> *"Three minutes. Sam shipped a real PR. Every decision was grounded in a citation from your team's brain — not a hallucination."*

### Beat 5 — The wider claim (30s)

Quick visual cuts on the dashboard:

> Click **Senior Mode**: *"Same brain, parallel agents on the same codebase. Two engineers each running their own agent — Codex and Claude Code — Kiro catches semantic conflicts between them in real time."* (5-second clip of two streams + conflict alert)

> Click **Always-On Mode**: *"Kiro running overnight as a PR reviewer with full team context, learning your conventions over weeks."* (5-second clip)

> *"Hyperspell ingests the company. Nia indexes the code. Kiro is the verification layer between any coding agent and that brain. Three modes, one platform."*

### Beat 6 — The number close (10s)

> *"Ablation: with Hyperspell synthesis, Kiro grounds 96% of agent decisions in real team context. Without it, 38%. The brain is the product."*

### Closer lines (use both, at different moments)

- **In the demo close:** *"Day-one PR. Built on Nozomio."*
- **In conversation with Arlan / Hyperspell founders:** *"Kiro is the third pillar of the Nozomio stack — verification, alongside Nia's indexing and Tracer's retrieval. Built natively on both."*

---

## Compression test (Chinese whispers)

Pitches that survive person-to-person compression propagate. Kiro's:

- 20 words: *"Kiro is the company brain for coding agents. New hire ships their first real PR in 30 minutes."*
- 10 words: *"Day-one onboarding for engineers. Powered by your team's brain."*
- 5 words: *"First PR in thirty minutes."*
- 2 words: *"Day-one PR."*

The pitch *deliberately compresses* across the demo: open with the punchline, unpack to show how, close with the compressed version. That's what Arlan texts to other founders.

---

## Architecture

```
Hyperspell (Slack + Notion + GitHub + Drive)        Nia (codebase + open PRs)
            \                                            /
             \                                          /
              ──────────── Brain Synthesis ────────────
                                |
                       Confidence Tagging
              (Decided / Considered / Convention / Stale)
                                |
                  ┌─────────────┴─────────────┐
                  |                           |
          Onboard Mode                  Senior / Always-On Modes
          (new hire pair)              (parallel agents / overnight)
                  |                           |
                  └─────────────┬─────────────┘
                                |
                       Coding Agent (Codex / Claude Code)
                                |
                      Verification at write-time
                  ┌─────────────┴─────────────┐
              Citations                 Conflict Alerts
              (Context Stream)          (with unified-spec resolution)
```

### The confidence engine (optional, in if time)

Every citation carries a confidence label:

- **Decided** — appears in a doc, merged PR, or reached consensus in Slack
- **Convention** — repeated pattern across the codebase (Nia)
- **Considered** — discussed but not resolved
- **Proposed** — stated by one person, no follow-up
- **Stale** — old, may be superseded

Without the engine: Kiro looks like fancy retrieval. With it: Kiro looks like reasoning over conflicting opinions. Demo beat where Kiro flags *"Marcus suggested async (Decided, 4 agreed); Sarah floated callbacks (Considered, no consensus); recommendation: async"* is what separates Kiro from Glean.

**Build approach:** pre-tag seeded data, run a small Haiku classifier on edge cases at ingest time. Don't build a real classifier today. Decide whether to include during 1pm checkpoint.

### Tech stack

| Component | Tech | Status |
|---|---|---|
| Cross-source ingestion (Slack, Notion, GitHub) | **Hyperspell** | Load-bearing |
| Codebase + open-PR indexing | **Nia** | Load-bearing |
| Real-time sync (brain feed, agent streams, dashboard) | **Convex** | Load-bearing |
| Auth + DB (so judges can sign up + use it) | **InsForge** | Required for Production Readiness rubric |
| Frontend / dashboard | **Next.js + Vercel + shadcn**, scaffolded with v0 | Required (deployed URL is mandatory per submission rules) |
| Synthesis + verification agent | **Claude API** (Haiku for ticks, Sonnet for deep checks) | Core |
| Pair-coding agent | **Claude Code** (and **Codex** for Senior mode) | Core |
| Sandboxed merge / test simulation | **Tensorlake** | Optional, ship if Onboard works by 3pm |
| Aside, Reacher | — | Skip — no fit |

### Sponsor integration depth

Each load-bearing sponsor must do something only they can do, and the demo must visibly break without them:

- **Hyperspell:** without ingestion, no Slack debates, no Notion docs, no PR history → no citations → 96% → 38% on the ablation. Hyperspell *is* the brain.
- **Nia:** without codebase index, no convention grounding, no architectural verification → conflict prediction loses semantic grounding.
- **Convex:** without real-time sync, the brain assembly visualization is choppy or post-hoc, not live. Pair-coding citations don't stream.
- **InsForge:** without auth + DB, judges can't sign up and use the deployed dashboard → fails Production Readiness criterion of the broader hackathon.

---

## Build plan (9 hours)

**Hard rule:** if Onboard mode end-to-end is glitchy at 3pm, drop everything else. A clean onboarding demo wins; a messy three-mode demo doesn't.

### Roles (3 people; 1-2 active devs)

- **Lead dev** — Hyperspell + Nia integration, brain synthesis pipeline, agent loop
- **Frontend / second dev** — dashboard (Brain Assembly, Pair Workspace, Decision Trail), Convex real-time wiring, deployment
- **Demo / data seeding / pitch lead** — seeds the fake company workspace, rehearses with the demo human, runs the eval, prepares the 3-min pitch

If only 2 devs: lead dev does Hyperspell/Nia + agent loop, second dev does frontend + deployment, third person owns demo prep + seeding + pitch entirely.

### Timeline

| Time | Goal | Owner |
|---|---|---|
| 8:30–9:15 | Sponsor accounts ready (Hyperspell, Nia, Convex, InsForge, Vercel). Repo created. Demo human briefed. | All |
| 9:15–11:00 | Hyperspell ingestion working on seeded Slack/Notion/GitHub. Brain Assembly view rendering. | Lead + Frontend |
| 11:00–12:30 | Nia indexing the codebase. Context Stream sidebar pulling citations live. | Lead |
| 12:30–2:00 | Pair-coding flow with Claude Code. Conflict detection. Auto-fix suggestion. PR generation. | Lead |
| 2:00–3:00 | Starter task picker. Calibration logic. Three task options pre-tested. | Lead |
| 3:00–4:00 | Decision Trail audit view. Three-mode navigation (Onboard live; Senior + Always-On as static clips). | Frontend |
| 4:00–5:00 | Polish dashboard. Brain assembly animation. Run ablation eval (Hyperspell on/off). | Frontend + Demo |
| 5:00–5:30 | Deploy to Vercel. Real URL. Test on phone. Fill out submission form. | Frontend |
| 5:30–6:00 | Practice 3-min demo with demo human, 5+ runs. Record backup video. | All |
| 6:00 | Submit. Eat. Don't touch code. | — |
| 6:10–7:30 | Judging. | Demo + Lead |

### Cut order if time runs short

Drop from the bottom:

1. Onboard mode end-to-end — must
2. Brain Assembly visible — must
3. Citation chain in Context Stream — must
4. Auto-fix suggestion via Kiro — must
5. Decision Trail audit view — should
6. Confidence engine (Decided / Considered / Stale chips) — should
7. Three-mode navigation — nice
8. Senior + Always-On clips — nice
9. Tensorlake sandboxed merge sim — nice

---

## Numbers in the pitch

Two paths. Both included; we decide based on what's possible:

### Path A — Real eval today (preferred)

- Pre-define 15-20 task scenarios that exercise the brain
- Run each in two conditions: with Hyperspell synthesis active, without it
- Collect: % of agent decisions grounded in real team context, conflict catch rate, false positive rate, time-to-first-PR
- Run in batch from 4-6pm while polishing dashboard
- Generates the headline number: *"96% with Hyperspell, 38% without — the brain is the product."*

### Path B — Estimates, framed honestly

- Use credible industry numbers for time-to-first-PR (typical 1-2 weeks for new hires)
- Demo time = our claim (~30 min on stage, observed)
- Frame ablation qualitatively: *"Without Hyperspell synthesis, citations drop dramatically — the brain stops citing real sources and starts pattern-matching."*

### Recommendation

Path A if the harness is running by 4pm. Path B otherwise. Don't fake numbers — judges and Arlan will ask.

---

## Demo codebase decision (TBD)

What's the actual repo on screen during onboarding? Three options:

| Option | Pros | Cons |
|---|---|---|
| **Real OSS repo** (PostHog, FastAPI, Supabase) | High authenticity; "I've never seen this codebase" is true | Less control; Slack/Notion/PRs have to be faked carefully |
| **Toy SaaS scaffold built today** | Full control over collision points | Less authentic; new-hire framing feels staged |
| **One of Krish's existing projects** (Use-Anything, AEGIS) | Real context; demo human genuinely encounters fresh code | Audience may know Krish built it |

**Default if undecided:** real OSS repo (FastAPI starter is small enough to demo, big enough to seed realistic Slack/Notion/PRs). Decide before 9:15.

---

## UX of the dashboard

Three connected views. The dashboard is the visible product; it has to feel like real software.

### View 1 — Brain Assembly (welcome view)

When sources connect, this view animates in real time. Graph visualization with nodes for people, modules, decisions, in-flight PRs. Color shifts from cold to warm as more sources connect. Stats panel: *"X messages indexed, Y docs synthesized, Z PRs analyzed, N decisions extracted."* This solves the "Company Brain demos are invisible" problem — judges *see* the brain assemble.

### View 2 — Pair Workspace (working view)

Active during the pair-coding beat. Layout:

- **Center:** the editor (embedded if web; referenced if desktop)
- **Right sidebar — Context Stream:** live citations as the agent works. Cards with source icon, preview, click-to-expand. Confidence chip on each.
- **Left sidebar — Conflict Verdicts:** color-coded compatibility checks. Click → unified spec.
- **Top bar — Brain Health:** small gauge showing context freshness.

The Context Stream should feel like a senior engineer leaning over your shoulder occasionally pointing things out. Calm, not noisy.

### View 3 — Decision Trail (audit view)

After a PR ships, click any line of code → see exactly which sources Kiro pulled to ground that line. *"This `asyncio.sleep` was chosen because: [Slack #eng convention], [PR #89 pattern], [Notion async standards doc]."*

This is what makes Kiro defensible. The trust mechanism. *"Was the AI hallucinating?" → click any line → real citations → no.*

---

## Why this wins (rubric mapping for Track 4)

| Criterion | Weight | How we hit it |
|---|---|---|
| **Cross-Source Synthesis** | 30% | Slack + Notion + GitHub + Code, four sources fused into one personalized context surface. Visible Brain Assembly view. |
| **Real Work, Not Just Answers** | 25% | New hire ships an actual PR with passing tests. Not Q&A. |
| **Hyperspell Integration Depth** | 25% | Hyperspell does ingestion + cross-source synthesis. Ablation: 96% → 38% without. Demo breaks if removed. |
| **Demo & Presentation** | 10% | Live human onboarded on stage. 30-second compression hook. Citation trail makes synthesis visible. |
| **Judge's Personal Rating** | 10% | Story-driven (a person, not a system). Tom Blomfield's RFS literally is this product. Numbers stick. |

---

## What makes Arlan and the sponsors want it

### Arlan / Nozomio

- Names Nia, Tracer, and a third pillar (Kiro) as a coherent stack — flattering and forward-looking
- Makes Nia load-bearing for code indexing (without it, codebase brain doesn't exist)
- Demonstrates cross-product synthesis (Hyperspell + Nia composing) — Nozomio's thesis in miniature
- Looks like a real product, not a hack — Brain Assembly, citation trail, three modes
- Has personality (Sam on stage, "watch a new hire ship in 30 minutes" framing) — Arlan rewards builders with edge

### Hyperspell (Conor + Manu — they offer a working session as track prize)

- Treats Hyperspell as central, not a logo
- Has a deployable production version (real auth, real Vercel deploy, real Hyperspell connection) — they want a candidate for their working-session prize
- Showcases their cross-source synthesis as the product's spine
- Solves day-one onboarding — a CTO-level pain they probably hear about constantly

### Convex

- Real-time + TypeScript backend used the way they designed it: live brain assembly, agent stream sync, dashboard updates. Not a wrapper.

---

## Failure modes and mitigations

| Failure | Mitigation |
|---|---|
| Demo human freezes on stage | Their role is minimal — three rehearsed actions. If they freeze, host takes over. |
| Brain Assembly feels fake | Actually run ingestion. Don't fake. Real Slack workspace, real Notion, real GitHub. Animate display, but data is real. |
| Claude Code generates wrong code, tests fail | Pre-run the demo flow 5+ times. Set temperature low. Backup recorded video. |
| Citations look like hand-waving | Every citation must be clickable and render real source. No fake citations. |
| WiFi dies on stage | Pre-cached version of demo runs locally. Have on standby. |
| "Wider claim" beats feel rushed | Rehearse Senior + Always-On as 5-second flashes, not explanations. |
| Re-prompt injection blocked (Senior mode) | Manual paste fallback. Decision rule: if not working by 11am, take the fallback. |
| Confidence engine too complex for 9 hours | Pre-tag seeded data manually. Run small classifier only on edge cases. Drop entirely if it's not adding clarity by 3pm. |

---

## Compression sequence for the day

| Phase | Length | Content |
|---|---|---|
| Hook (start of demo) | 20 sec | *"New hire ships first PR in 30 minutes"* |
| Demo body | 2-3 min | Brain assembles → task picked → pair-coding with citations → PR ships |
| Wider claim | 30 sec | Senior + Always-On flashes |
| Numbers | 10 sec | 96% → 38% ablation |
| Closer | 5 sec | *"Day-one PR. Built on Nozomio."* |
| Elevator (when judge has 10s) | 10 sec | *"Kiro is the company brain for coding agents. New hire ships first PR in 30 min. Hyperspell + Nia + Kiro."* |
| Founder text-back (when Arlan messages a friend) | varies | *"Saw a kid ship a day-one onboarding tool on Hyperspell + Nia. Real PR live on stage."* |

---

## Open decisions (resolve before 9:15am or at 1pm checkpoint)

| Decision | Status | Notes |
|---|---|---|
| Demo codebase | TBD before 9:15 | Default: FastAPI starter or similar small OSS |
| Demo human | TBD before 9:15 | Sam (real friend) or Krish solo on a fresh codebase |
| Confidence engine in/out | Decide at 1pm checkpoint | In if Onboard core is on track; out if behind |
| Real eval (Path A) vs estimates (Path B) | Decide at 4pm | A if harness running; B otherwise |
| Senior + Always-On depth | Decide at 3pm | If Onboard solid: deepen Senior. If not: keep as static clips. |
| Tensorlake merge simulation | Decide at 4pm | Add if everything else solid |

---

## Submission requirements (from event guide)

- ✅ One submission per team — only one person fills the form
- ✅ Submit before 6:00pm sharp
- ✅ At least one team member present for in-person judging at 6:10pm
- ✅ Required fields: deployed demo link (not localhost), GitHub repo URL, all team member names + emails
- ✅ Top 6 across all tracks present live to the entire room — be ready for both 3-min table judging *and* a longer live-stage version

Submission form: https://forms.gle/fkoFXRo3L2MVkkz87

---

## Things to remember on stage / at the table

- **Lead with the punchline:** *"New hire ships first PR in 30 minutes."* Don't bury it.
- **Name Nia, Tracer, Hyperspell in the first 30 seconds.** Signals you've done the homework.
- **Every citation is clickable.** Trust mechanism. Show one if asked.
- **The ablation number is the closer.** *"96% with Hyperspell, 38% without."*
- **Don't oversell vs Glean.** Acknowledge the category, position precisely: *"Glean retrieves; Kiro verifies. Q&A vs shipped work."*
- **Cross-model is unfakeable differentiation.** Codex + Claude Code shown together (Senior mode flash).
- **Be confident, not corporate.** Builders with edge land harder than polished pitches.
