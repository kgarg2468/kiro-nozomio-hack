<claude-mem-context>
# Memory Context

# [kiro-nozomio-hack/baku] recent context, 2026-05-09 3:46pm PDT

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 42 obs (13,679t read) | 1,016,317t work | 99% savings

### May 9, 2026
218 3:30p 🔵 kiro-ai-monorepo Project Structure
219 " 🔵 Environment Variable Layout: Root .env.local, Missing apps/company-brain/.env.local
220 " 🟣 Convex Backend Deployed with 7 Environment Variables
221 " 🟣 Vercel Project ptlnextdoor Linked and Production Env Vars Configured
222 " 🔴 Vercel Remote Build Fails: pnpm ERR_INVALID_THIS from npm Registry
223 " 🔴 next.config.ts Monorepo Turbopack Root Conflicts with Vercel outputFileTracingRoot
224 3:31p 🔵 vercel build Double-Path Bug: outputFileTracingRoot Causes Doubled .next Lookup
225 " ✅ Added engines.node=22.x to apps/company-brain/package.json to Fix Vercel Remote Build
230 " 🔵 engines.node=22.x Did Not Change Vercel Build Machine Node Version
235 3:32p 🔵 Vercel Remote Deploy Blocked: pnpm install Fails on Node 24 — Prebuilt Deploy is Required Path Forward
242 3:34p 🟣 @kiro/company-brain Successfully Deployed to Production at ptlnextdoor.vercel.app
243 " 🔵 turbopack.root=appRoot Breaks Local Dev; turbopack.root=workspaceRoot Breaks vercel build Prebuilt
245 " 🔴 vercel build Prebuilt Unblocked: next Added to Root devDeps + Root vercel.json Created
247 " 🟣 Prebuilt Deploy Pipeline Working: vercel build + vercel deploy --prebuilt Both Succeed
252 3:35p 🟣 ptlnextdoor.com Live: Domain Aliases Set, HTTP 200 Confirmed from www.ptlnextdoor.com
256 3:36p 🔵 Production /api/brain Returns Hybrid Mode: Hyperspell and Nia Both Error, Fixture Fallback Active
257 " 🔴 next.config.ts turbopack.root Reverted to workspaceRoot Breaks Local Dev Server
258 3:39p 🔵 PixelAgents Full-Screen Panel Bug Identified
259 " 🔵 Root Cause: selectedId/onSelect Not Threaded to PixelOfficeFrame
260 " 🔴 PixelAgents Fullscreen Click Fix: Portal Sidebar Now Interactive
261 " 🔵 Duplicate React Keys in Context Stream / Citations
262 " 🔵 Playwright Headless Tests Cannot Trigger React State via Portal Button Clicks
263 3:40p 🔴 PixelOffice Portal: Default Selected Entity + Progress Bar in Each Card
264 " 🔵 SelectedPortal Fallback Approach Not Reflected in Headless Playwright Tests
265 3:41p 🔵 SelectedPortal WAS Rendering — Playwright Case-Sensitivity Error in Tests
266 " 🔵 Portal Click-to-Select Fully Verified: Kiro Guide Selection Works
267 " 🔴 Duplicate Citation IDs Fixed in Brain Assembly via uniqueCitations()
268 " 🔴 Regression Test Added for Citation Deduplication
269 3:42p ✅ Final Combined QA Verification Running
270 " 🔴 All QA Checks Pass — Portal Click Bug Fully Fixed and Verified
271 " ✅ Production Build Passes Clean — All Routes Compiled
272 " ✅ Pre-existing Vercel Deployment Infrastructure Changes Identified
273 3:43p ✅ Commit Scope Narrowed: Unrelated Infra Changes Restored
274 " ✅ QA Fix Commit Ready: 5 Files, 174 Insertions, Zero Whitespace Issues
275 " 🔴 Committed and Pushed: fix(qa): keep office agent details visible fullscreen
276 " ✅ Push Confirmed: b795e9d Landed on GitHub
277 3:44p ✅ QA Fixes Landed on PR #6: [codex] Add Kiro monitor and decision trails
278 " 🔵 Pre-Commit Repository State in kiro-nozomio-hack/baku
279 " 🟣 Vercel Deployment Configuration Added for company-brain App
280 " ✅ TypeScript Typecheck Passed and All Changes Staged for Commit
281 3:45p ✅ Vercel Deployment Config Committed and Pushed to GitHub
282 " ✅ Push to GitHub Confirmed — Branch aayu22809/baku Fully Synced

Access 1016k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>