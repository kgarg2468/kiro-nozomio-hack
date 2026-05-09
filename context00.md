# Project Context

## The hackathon

Nozomio Hackathon, May 9, San Francisco, EF office. Sponsored by Nia (Nozomio's product), with Aside, Hyperspell, Tensorlake, Convex, InsForge, Reacher, Vercel.

Founder of Nozomio: Arlan Rakhmetzhanov. 18, dropped out of HS, raised $6.2M (CRV, BoxGroup, LocalGlobe, Paul Graham, YC S25). Solo founder for now, building a small SF team. His stated obsessions: managing agentic context at scale, reinventing search over personal/business data, indexing massive amounts of internal + external data ("kinda what Google did with the internet"). He also has a playful streak — built `talk-to-girlfriend-ai` as a side repo. Rewards both technical depth and personality.

The hackathon is partly a recruiting funnel for him.

## What we're building

A real-time conflict prediction layer for AI-native engineering teams. Catches semantic, architectural, and intent-level merge conflicts *before* either engineer pushes code — ideally before they even finish typing.

Project name: Kiro.

## The problem

As AI makes individual output 10x, *misalignment cost scales superlinearly*. Two engineers with two AI agents can independently produce a week's worth of conflicting code in an afternoon. By the time git surfaces the conflict, both have spent thousands of tokens on work that has to be partially or fully thrown out.

The waste is:
- Tokens (both AI agents burn through them on parallel, incompatible code)
- Engineer time (resolving the conflict downstream is 10x more expensive than preventing it upstream)
- Codebase quality (when conflicts are silently auto-merged, dead/redundant code accumulates as technical debt)
- Trust (teams start working in series instead of parallel, killing the speed advantage AI gave them)

## The conflict stack (altitudes)

Conflicts exist at 5 levels. Existing tools only solve the bottom 2.

1. **Textual** — same lines, same file. Git solves this trivially.
2. **Syntactic** — same function, different lines. Git auto-merges silently; CI catches if there are tests.
3. **Semantic** — different files, but contracts mismatch (auth header format change, API response shape change). Git is blind. CI is blind without integration tests.
4. **Architectural** — both build "auth middleware" with incompatible mental models. Both pass CI. Surfaces as production bugs weeks later.
5. **Intent** — boss/PM gave the same task to two people. Both ship working features. Now there are two of them.

**Token-burn cost scales up the stack.** Layer 5 conflicts are the most expensive because both AI agents have already spent the most tokens by the time the conflict is discovered.

Our wedge: catch as high up the stack as possible, as early as possible.

## The pitch (cost framing — lead with this)

> "AI agents burn tokens proportional to how much code they write. When two agents write conflicting code, all those tokens are wasted — the loser's branch gets thrown out. We catch the conflict before either agent starts writing. We're not a productivity tool. We're a cost-reduction tool for AI-native teams."

This makes us a CFO conversation, not just an engineering one. Token cost is the new AWS bill.

## How it works

A lightweight daemon runs on each engineer's laptop. Watches the working directory, the editor, the active branch — all pre-commit. Streams a compressed representation of "what this person is currently working on" to a shared session.

### Intent fingerprints (the key technical idea)

We don't ship raw code to a server (privacy nightmare, latency disaster). We ship *fingerprints*:
- Which files are being touched
- Which functions are being modified
- Semantic signature of the change (extracted by a small local model: "adding new endpoint POST /auth/login that returns JWT")
- Symbols being introduced/renamed/deleted
- Inferred natural-language commit message draft

A central agent compares fingerprints across teammates every few seconds and asks: "Are any two of these on a collision course?" Returns probability + conflict type + suggested resolution.

Hackathon-time shortcut if fingerprints are too hard: ship raw diffs over the wire encrypted, claim "fingerprints in production." Honest enough for a demo.

### Three-tier interruption ladder

False positives kill this product. The interruption has to be calibrated.

- **Whisper** — status bar dot turns yellow. Ignorable.
- **Nudge** — soft notification with one-line summary. Dismissable.
- **Stop** — modal blocking commit. Only fires on high confidence + high cost (e.g., both touching a critical file).

Adaptive: more permissive early in the day, stricter near deadlines.

### Context sources

- **Repo + dependencies + external docs** — Nia indexes these. Conflict-detection agent queries Nia to ground predictions in actual codebase architecture. ("auth module is centralized in /lib/auth, both diffs touch it = high collision probability.")
- **Slack / Linear / Jira / Zoom transcripts** — Nia indexes these too. Provides intent-level signal. If two Linear tickets describe overlapping work, we can flag the architectural conflict at *task assignment time*, before either engineer opens an editor.
- **Personal context** — Hyperspell handles DMs, calendar, etc. Useful for: don't interrupt during a meeting, knows about a 1:1 directive that's relevant.

## Tech stack mapping

- **Nia** — grounding layer. Indexes repo + Slack + Linear + transcripts. Conflict agent queries Nia for architectural context every prediction cycle.
- **Convex** — real-time sync backbone. Fingerprints stream from N laptops, shared session state syncs across them. This is exactly what Convex is built for; clean fit.
- **Tensorlake** — ephemeral sandboxes for *simulated future merges*. "If Krish's branch and Arlan's branch were merged right now, would tests pass?" Run pre-emptively in background. This is the wow demo moment.
- **Hyperspell** — personal context layer. Plug-in, optional for hackathon, mention as future integration if time-constrained.
- **Vercel + shadcn + Next.js** — frontend / dashboard.
- **InsForge** — auth + DB if we need it. Cuts hours of plumbing.
- **Editor extension** — VS Code TS extension hooks into editor events. Plan B: a CLI daemon watching the working directory if extension dev is too slow.
- **Local model for fingerprint extraction** — small model (could be a Claude Haiku call or a tiny local model) summarizes diffs into structured fingerprints. Avoids shipping raw code.

## Demo flow (3 min target)

1. Two laptops on stage. Two engineers (me + partner). Both have Claude Code open. Shared project — something audience recognizes (todo app, auth service, simple SaaS scaffold).
2. Driver (me, on mic): "Krish, add a 'priority' field to tasks. Arlan, add a 'tags' field." Both start coding via Claude Code.
3. ~20 seconds in: status bars on both laptops glow yellow.
4. ~10 seconds later: notification on both. "Both adding fields to Task schema. Migration files will conflict."
5. Click "show me." Side-by-side diff appears. Predicted merge result. Failure point highlighted.
6. Click "auto-resolve." Agent proposes unified migration. Both Claude Code sessions adopt it.
7. Continue. Final commits land cleanly.
8. **Money slide.** Real numbers from a pre-run experiment: "Without us: 47,000 tokens, 12,000 wasted on conflict. With us: 31,000 tokens, 0 wasted. $0.94 per conflict × 100 conflicts/month × 10,000 teams using Claude Code = $X."
9. Close: "We're the difference between AI making your team 10x productive and AI making your team 10x productive at 10x the bugs."

### Demo prep

- Practice the choreography 10+ times.
- Pre-run a controlled experiment to get *real* token-cost numbers before the demo. Numbers stick more than claims.
- Pre-warm caches. Hackathon WiFi will betray us.
- Have a screen-recorded fallback for live failure.

## Risks / where this falls through

- **Two-coder live demo is logistically expensive.** Need a reliable partner. Practice obsessively.
- **False positives kill the product** in real life. Tune for low recall, high precision — miss some conflicts, but be right when we fire. Pitch this honestly.
- **Fingerprint extraction is genuinely hard.** Plan B = encrypted raw diffs.
- **Privacy story.** Need a clean slide on this: opt-in per session, encrypted streams, only fingerprints leave the laptop, raw code never does. Address head-on.
- **Adoption surface is teams of 2+.** Solo devs don't care. Wedge: hackathon teams → dev shops → engineering teams.
- **Cursor or GitHub could build this.** They probably won't soon — Cursor is heads-down on the editor, GitHub moves slow. We have 12-18 months.
- **Closest existing tools** — pull-request-time (Graphite, Greptile, CodeRabbit) operate post-write. Real-time collab (Cursor multiplayer, VS Code Live Share) lets you *see* each other but doesn't *predict conflict*. We're in clean water.

## Why this works for Arlan / Nozomio

- Direct fit to his thesis: "managing agentic context at scale" applied to team coordination.
- Uses Nia centrally and meaningfully — not as a logo on a slide, as the grounding layer for predictions.
- Uses 3-4 sponsor products substantively (Nia, Convex, Tensorlake, optionally Hyperspell). Strong sponsor narrative.
- Cost-reduction framing aligns with how AI-native companies actually budget right now.
- Recruiting angle: this is exactly the kind of "infrastructure for agents" thinking he's hiring for.

## Why it works as a real company (post-hackathon)

- Clear ROI metric (token cost saved) — measurable, defensible, scales with AI adoption.
- Real moat — fingerprint + prediction models improve with data. Network effects on supply side.
- Timing — AI coding adoption is early-majority. "10x output, 10x conflict" pain is just emerging.
- Sales motion — bottom-up to engineers (one teammate drags the team in), then top-down to CFOs.
- Adjacent expansion — start with code, extend to design (Figma), docs (specs), any parallel knowledge work.

## Open decisions before building

1. Name. Pick before code starts. Affects domain, repo, slide titles.
2. Editor surface — VS Code extension vs CLI daemon vs both. Extension is more impressive, daemon is faster to ship.
3. Fingerprint approach — real ML extraction vs encrypted-raw-diff hand-wave. Default to hand-wave for hackathon, mention real version as roadmap.
4. Demo project — what's the shared codebase the two engineers work on? Should be small, clean, audience-recognizable. Todo app or simple auth service.
5. Token-cost measurement — instrument the experiment beforehand or quote estimates? Real numbers are 10x stronger.
6. Partner for the live demo — confirmed and practiced?

## Personal context (for the agent helping me build)

I (Krish) bring relevant prior work:
- **Use-Anything** — already-shipped CLI that auto-generates SKILL.md from any software. Fingerprint extraction is adjacent.
- **Unvibe** — skill bundle with router-on-skills patterns. Relevant for the conflict-resolution skill design.
- **AEGIS** — RL cybersecurity defense, GNN+LSTM. Less direct fit but proves I can ship ML systems.
- Hardware/voice background (Wooly, FPV, Pi Game Boy) — could pull in if we want a phone-based interrupt surface.

Direct, terse communication style. Open-source first. "Building for agents, not just with them" is the through-line.
