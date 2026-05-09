# Kiro Archive Reuse Notes

## Context

Kiro is the company brain for coding agents: day-one onboarding first, parallel-agent coordination second, always-on PR review later. The winning demo in `kiro.md` is Onboard mode: a new engineer connects their accounts, Kiro assembles a source-grounded brain, picks a calibrated starter task, and helps them ship a real PR.

The useful archive code should serve that priority. Tempo is strongest for the Senior-mode proof point: live worktree fingerprints and conflict detection. Daegu is strongest for onboarding-adjacent pieces: A2A communication, Nia evidence wrappers, digital-agent/profile models, citations, and a pixelated demo view.

Blunt ordering: **Onboard must ship. Tempo makes the wider platform credible. Daegu supplies demo/story surfaces and protocol glue.**

## Archive Inventory

- Current working tree contains `archive/Tempo`.
- `archive/daegu` is not currently checked out in the working tree.
- Daegu exists in git history on `origin/aayu22809/add-archive-code` under `archive/daegu`.
- The current root worktree is otherwise mostly planning material: `kiro.md` plus archive code.
- `archive/Tempo` has its own nested git repo and currently has uncommitted changes. Treat its checked-out state as the evaluated source of truth unless you intentionally reset or compare against commits.

## Tempo Reuse

Tempo is the most production-shaped code in the archive. It has clean boundaries, tests, and a direct match to Kiro Senior mode.

### Copy Now

- **Shared contracts:** Zod schemas for repos, worktrees, sessions, fingerprints, conflicts, advisories, interventions, decisions, and events.
- **Git/worktree layer:** worktree discovery, porcelain parsing, dirty-state detection, diff normalization, changed-file extraction, and stable diff hashing.
- **Fingerprinting:** heuristic contract-surface extraction from changed files, symbol extraction, diff-hash IDs, confidence scoring, and optional model enrichment.
- **Conflict detection:** pairwise fingerprint comparison across surfaces/files/symbols, risk assessment, and OpenAI/fallback compatibility classification.
- **MCP tool flow:** join, plan, checkpoint, wait/fetch intervention, record decision, acknowledge intervention.
- **Local coordinator shape:** Fastify API, SQLite store, watcher, token-protected mutations, WebSocket event stream.
- **Dashboard conflict UI:** Sessions graph, Conflicts page, risk cards, evidence cards, decision lifecycle, demo fallback pattern.
- **Eval harness:** fixture-based recall / false-positive / latency measurement.

### Adapt Later

- Rename user-facing `tempo_*` tools to `kiro_*` once demo pressure is lower.
- Replace local-only `.tempo` persistence with Convex or a Kiro backend if the deployed product needs shared state.
- Make the classifier consume Kiro’s company-brain context, not only raw diffs.
- Fold Tempo’s `ContractSurface` into Kiro’s broader brain graph: code modules, team decisions, PRs, Slack/Notion citations, owners, and conventions.

### Skip

- Do not spend demo time making Tempo a fully standalone Kiro product surface. Use it as a credible Senior-mode flash and backend engine.
- Do not let Senior mode steal time from Onboard mode. `kiro.md` is explicit: clean onboarding wins; messy three-mode demos do not.

## Daegu Reuse

Daegu is not as drop-in as Tempo, but it has useful ideas and code. It was built as OpenFire, so the product copy is wrong for Kiro, but the underlying primitives are relevant.

### Copy Now

- **A2A protocol types/client:** minimal Agent-to-Agent JSON-RPC types, `message/send`, `tasks/get`, agent-card builder, message text extraction.
- **A2A routes:** Next.js routes for `GET /api/a2a/[agent_id]/agent.json` and `POST /api/a2a/[agent_id]`.
- **Nia wrappers:** entity context retrieval, source ingestion, unified search across namespaces, normalized citations, and demo fallbacks.
- **Convex thread model:** thread records, thread messages, idempotency by external ID, append-and-index behavior.
- **Digital agent model:** active digital employees with A2A endpoint, Nia namespace, skills, inbox/address fields, and knowledge stats.
- **Citation UI:** citation chips and evidence packet panel.
- **Orchestrator-worker pattern:** decomposed tasks, parallel/pipeline dispatch, fresh scoped context per worker, aggregate result.

### Adapt Later

- Convert “employee” records into Kiro onboarding profiles: name, email, role, GitHub handle, LinkedIn/profile source, strengths, weak spots, source namespaces.
- Convert “digital employees” into Kiro agents/personas: onboarding guide, reviewer, codebase scout, conflict detector, task picker.
- Reframe Nia entity namespaces as Kiro brain namespaces: person, team, repo, task, thread, PR, convention.
- Reuse the Discord-style channel model for Kiro’s Context Stream and agent-to-agent handoff logs.
- Adapt `PixelOffice` into a Kiro demo map: new hire, source nodes, agent sessions, task progress, and conflict alert. It is visually useful, but only after the data flow works.

### Skip

- Do not reuse the offboarding/fire/termination product language.
- Do not make AgentMail central to Kiro unless the demo specifically needs email. It is useful plumbing, but not core to Kiro’s Nozomio/Hyperspell/Nia story.
- Do not depend on Daegu as a full app. The branch lacks a `package.json` under `archive/daegu`, and the pixel asset directory referenced by `PixelOffice` is not present in the listed archive files.
- Do not ship fake citations as if they are live. Demo fallback data is acceptable only when visibly marked as fixture data.

## Do Not Reuse Blindly

- **Daegu product framing:** it is intentionally edgy and about firing people. Kiro is onboarding and verification. Keep the engineering, replace the story.
- **AgentMail-heavy flows:** useful for audit trails, not necessary for the main Kiro pitch.
- **Missing Daegu app scaffolding:** recover modules by path from the branch, not by trying to run `archive/daegu` as-is.
- **Pixel office dependencies:** `PixelOffice` expects `/assets/pixel/...`; those assets need restoration or replacement before the view works.
- **Raw demo fallbacks:** both Tempo and Daegu contain demo fallback patterns. Keep fallbacks for resilience, but label them. Judges will punish fake-looking citations.
- **Tempo local-only assumptions:** great for Senior local coordination, weaker for deployed Onboard mode unless wrapped behind a shared Kiro backend.

## Recommended Build Order

1. **Build Onboard mode around Kiro’s actual story.** Brain Assembly, starter task picker, Context Stream, citation/confidence labels, and a tiny real PR path come first.
2. **Use Daegu’s Nia/citation/thread primitives for the Onboard brain.** These map cleanly to source-grounded context and live agent messages.
3. **Use Tempo as the Senior-mode engine.** Keep it mostly intact, expose a Kiro-branded conflict flash, and avoid deep rewrites before the demo.
4. **Add A2A only where it makes the demo clearer.** Agent cards and `message/send` are enough to show cross-agent communication.
5. **Add pixel view last.** It is memorable, but it is garnish unless the source-grounded onboarding path already works.
6. **Run a small eval if time allows.** Tempo’s eval structure can produce conflict metrics; Kiro also needs a simple citation-grounding metric for the Hyperspell/Nia ablation.

## Exact Source References

### Kiro Context

- `kiro.md`

### Tempo, Current Working Tree

- `archive/Tempo/README.md`
- `archive/Tempo/packages/shared/src/index.ts`
- `archive/Tempo/packages/coordinator/src/git.ts`
- `archive/Tempo/packages/coordinator/src/indexer.ts`
- `archive/Tempo/packages/coordinator/src/fingerprint.ts`
- `archive/Tempo/packages/coordinator/src/openai-fingerprint.ts`
- `archive/Tempo/packages/coordinator/src/compatibility.ts`
- `archive/Tempo/packages/coordinator/src/conflict.ts`
- `archive/Tempo/packages/coordinator/src/analyzer.ts`
- `archive/Tempo/packages/coordinator/src/watcher.ts`
- `archive/Tempo/packages/coordinator/src/store.ts`
- `archive/Tempo/packages/coordinator/src/server.ts`
- `archive/Tempo/packages/coordinator/src/mcp.ts`
- `archive/Tempo/packages/coordinator/src/mcp-tools.ts`
- `archive/Tempo/packages/evals/src/index.ts`
- `archive/Tempo/apps/dashboard/lib/tempo-api.ts`
- `archive/Tempo/apps/dashboard/components/session-map.tsx`
- `archive/Tempo/apps/dashboard/components/session-graph.ts`
- `archive/Tempo/apps/dashboard/app/(dashboard)/sessions/page.tsx`
- `archive/Tempo/apps/dashboard/app/(dashboard)/conflicts/page.tsx`

### Daegu, Branch Reference

Use `git show origin/aayu22809/add-archive-code:<path>` or restore selected files from:

- `origin/aayu22809/add-archive-code:archive/daegu/README.md`
- `origin/aayu22809/add-archive-code:archive/daegu/lib/a2a.ts`
- `origin/aayu22809/add-archive-code:archive/daegu/lib/nozomio.ts`
- `origin/aayu22809/add-archive-code:archive/daegu/lib/orchestrator.ts`
- `origin/aayu22809/add-archive-code:archive/daegu/app/api/a2a/[agent_id]/agent.json/route.ts`
- `origin/aayu22809/add-archive-code:archive/daegu/app/api/a2a/[agent_id]/route.ts`
- `origin/aayu22809/add-archive-code:archive/daegu/convex/schema.ts`
- `origin/aayu22809/add-archive-code:archive/daegu/convex/threads.ts`
- `origin/aayu22809/add-archive-code:archive/daegu/convex/digitalEmployees.ts`
- `origin/aayu22809/add-archive-code:archive/daegu/convex/employees.ts`
- `origin/aayu22809/add-archive-code:archive/daegu/convex/hireAgent.ts`
- `origin/aayu22809/add-archive-code:archive/daegu/convex/a2aHandler.ts`
- `origin/aayu22809/add-archive-code:archive/daegu/components/citation-chip.tsx`
- `origin/aayu22809/add-archive-code:archive/daegu/components/nia-evidence-panel.tsx`
- `origin/aayu22809/add-archive-code:archive/daegu/components/pixel/PixelOffice.tsx`
- `origin/aayu22809/add-archive-code:archive/daegu/components/pixel/CharacterDossier.tsx`
- `origin/aayu22809/add-archive-code:archive/daegu/app/office/page.tsx`
- `origin/aayu22809/add-archive-code:archive/daegu/app/channels/[thread_id]/page.tsx`

## Verification Notes

- Ran Tempo tests from `archive/Tempo` with `pnpm test`.
- Result: `17` test files passed, `74` tests passed.
- Current root git status before creating this memo showed only untracked `.DS_Store`.
- Daegu was discovered through git history, not the working tree:
  - Branch: `origin/aayu22809/add-archive-code`
  - Path prefix: `archive/daegu`
- Daegu appears incomplete as a directly runnable project because no `archive/daegu/package.json` is present in that branch listing.

## Final Recommendation

If the goal is to win the hackathon demo, do not boil the ocean.

Use Daegu’s Nia/citation/thread/A2A primitives to make Onboard mode feel like a real company brain. Use Tempo’s tested conflict engine to make the Senior-mode platform claim credible. Treat the pixel office as a memorable optional visualization, not the product spine.

The product spine is still: **new hire ships a first PR with every agent decision grounded in team context.**
