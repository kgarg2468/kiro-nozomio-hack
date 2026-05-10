import type {
  BrainSourcePacket,
  CaptureCoverageItem,
  Decision,
  DemoState,
  Employee,
  OnboardingProfile,
  SourceCitation
} from "@/lib/types";

const NOW = 1778353200000;
const RETRY_DECISION_ID = "decision-retry-policy";
const RETRY_THREAD_ID = "thread-retry-policy-142";

export const fixtureCitations: SourceCitation[] = [
  {
    id: "crm-customer-handoff",
    sourceType: "crm",
    title: "CRM handoff: Acme retry failure",
    snippet:
      "Customer success logged that Acme's webhook retries stalled after a 503, with poor sales-to-CS handoff context.",
    confidence: "Decided",
    freshness: NOW - 1000 * 60 * 18,
    live: false,
    decisionId: RETRY_DECISION_ID,
    threadId: RETRY_THREAD_ID,
    captureMethod: "fixture",
    capturedAt: NOW - 1000 * 60 * 18,
    decisionRole: "originated"
  },
  {
    id: "gmail-customer-complaint",
    sourceType: "gmail",
    title: "Gmail: Acme escalation about webhook retries",
    snippet:
      "The account owner forwarded a customer complaint asking why retries blocked follow-up notifications.",
    confidence: "Decided",
    freshness: NOW - 1000 * 60 * 17,
    live: false,
    decisionId: RETRY_DECISION_ID,
    threadId: RETRY_THREAD_ID,
    captureMethod: "fixture",
    capturedAt: NOW - 1000 * 60 * 17,
    decisionRole: "originated"
  },
  {
    id: "slack-async-decision",
    sourceType: "slack",
    title: "Slack #engineering: retry workers stay async",
    snippet:
      "Marcus and Alice agreed notification retries must use async backoff so workers do not block the event loop.",
    confidence: "Decided",
    freshness: NOW - 1000 * 60 * 22,
    live: false,
    decisionId: RETRY_DECISION_ID,
    threadId: RETRY_THREAD_ID,
    captureMethod: "connector",
    capturedAt: NOW - 1000 * 60 * 22,
    decisionRole: "debated"
  },
  {
    id: "meeting-retry-finalized",
    sourceType: "meeting",
    title: "Meeting transcript: retry policy finalized",
    snippet:
      "Marcus closed the discussion: keep retry waits async, add bounded exponential backoff, and route review to notifications.",
    confidence: "Decided",
    freshness: NOW - 1000 * 60 * 16,
    live: false,
    decisionId: RETRY_DECISION_ID,
    threadId: RETRY_THREAD_ID,
    captureMethod: "transcript",
    capturedAt: NOW - 1000 * 60 * 16,
    decisionRole: "finalized"
  },
  {
    id: "notion-notifications-v2",
    sourceType: "notion",
    title: "Notion /architecture/notifications-v2",
    snippet:
      "Notification handlers own retry scheduling, idempotency keys, and exponential backoff for transient provider failures.",
    confidence: "Decided",
    freshness: NOW - 1000 * 60 * 55,
    live: false,
    decisionId: RETRY_DECISION_ID,
    threadId: RETRY_THREAD_ID,
    captureMethod: "connector",
    capturedAt: NOW - 1000 * 60 * 55,
    decisionRole: "codified"
  },
  {
    id: "pr-89-pattern",
    sourceType: "pr",
    title: "PR #89: retry timeout fix",
    snippet:
      "A junior engineer fixed a similar webhook retry bug by replacing fixed sleeps with bounded exponential backoff.",
    confidence: "Convention",
    freshness: NOW - 1000 * 60 * 90,
    live: false,
    decisionId: RETRY_DECISION_ID,
    threadId: RETRY_THREAD_ID,
    captureMethod: "connector",
    capturedAt: NOW - 1000 * 60 * 90,
    decisionRole: "implemented"
  },
  {
    id: "nia-tests-path",
    sourceType: "nia",
    title: "Nia code convention: tests/notifications",
    snippet:
      "Nia found notification retry tests colocated under tests/notifications with provider fixtures in tests/fixtures/providers.",
    confidence: "Convention",
    freshness: NOW - 1000 * 60 * 6,
    live: false,
    decisionId: RETRY_DECISION_ID,
    threadId: RETRY_THREAD_ID,
    captureMethod: "agent_checkpoint",
    capturedAt: NOW - 1000 * 60 * 6,
    decisionRole: "implemented"
  },
  {
    id: "github-issue-142",
    sourceType: "github",
    title: "GitHub Issue #142: webhook retry hangs",
    snippet:
      "Retry worker hangs after provider 503 because the handler blocks while waiting between attempts.",
    confidence: "Decided",
    freshness: NOW - 1000 * 60 * 14,
    live: false,
    decisionId: RETRY_DECISION_ID,
    threadId: RETRY_THREAD_ID,
    captureMethod: "connector",
    capturedAt: NOW - 1000 * 60 * 14,
    decisionRole: "originated"
  },
  {
    id: "slack-callbacks-considered",
    sourceType: "slack",
    title: "Slack #backend: callback queue proposal",
    snippet:
      "Sarah proposed moving retry scheduling to callbacks, but the thread ended without an owner or accepted design.",
    confidence: "Considered",
    freshness: NOW - 1000 * 60 * 60 * 25,
    live: false,
    decisionId: "decision-callback-queue",
    threadId: "thread-callback-queue",
    captureMethod: "connector",
    capturedAt: NOW - 1000 * 60 * 60 * 25,
    decisionRole: "debated"
  },
  {
    id: "notion-postgres-only",
    sourceType: "notion",
    title: "Notion /engineering/data-store-policy",
    snippet:
      "Production persistence stays on Postgres. New MongoDB or Redis-backed durable state requires architecture review.",
    confidence: "Decided",
    freshness: NOW - 1000 * 60 * 41,
    live: false,
    captureMethod: "connector",
    capturedAt: NOW - 1000 * 60 * 41,
    decisionRole: "codified"
  }
];

const decisions: Decision[] = [
  {
    id: RETRY_DECISION_ID,
    title: "Retry policy decision",
    summary:
      "Issue #142 is a customer-visible retry failure, not just a code bug. Kiro links the CRM/email complaint, Slack debate, meeting transcript, Notion policy, prior PR, and Nia code convention into one decision trail.",
    status: "decided",
    finalRecommendation:
      "Use bounded asyncio backoff in the existing notification handler, preserve idempotency keys, and route review to Marcus.",
    sourceCitationIds: [
      "crm-customer-handoff",
      "gmail-customer-complaint",
      "slack-async-decision",
      "meeting-retry-finalized",
      "notion-notifications-v2",
      "pr-89-pattern",
      "nia-tests-path"
    ],
    owner: "Marcus Chen",
    freshness: NOW - 1000 * 60 * 6
  }
];

const captureCoverage: CaptureCoverageItem[] = [
  {
    id: "coverage-slack",
    label: "Slack",
    sourceType: "slack",
    status: "captured",
    detail: "Engineering debate captured"
  },
  {
    id: "coverage-notion",
    label: "Notion",
    sourceType: "notion",
    status: "captured",
    detail: "Architecture docs captured"
  },
  {
    id: "coverage-github",
    label: "GitHub",
    sourceType: "github",
    status: "captured",
    detail: "Issues and PRs captured"
  },
  {
    id: "coverage-gmail-crm",
    label: "Gmail / CRM",
    sourceType: "crm",
    status: "fixture",
    detail: "Customer complaint fixture"
  },
  {
    id: "coverage-meeting",
    label: "Meeting transcript",
    sourceType: "meeting",
    status: "fixture",
    detail: "Decision transcript fixture"
  },
  {
    id: "coverage-nia",
    label: "Nia",
    sourceType: "nia",
    status: "indexed",
    detail: "Codebase convention indexed"
  },
  {
    id: "coverage-outside-window",
    label: "SMS / hallway",
    sourceType: "transcript",
    status: "missing",
    detail: "Outside Kiro capture window"
  }
];

const employees: Employee[] = [
  {
    id: "sam",
    name: "Sam Rivera",
    email: "sam@kiro.dev",
    role: "New backend engineer",
    github: "sam-rivera",
    status: "onboarding",
    palette: 0
  },
  {
    id: "marcus",
    name: "Marcus Chen",
    email: "marcus@kiro.dev",
    role: "Notifications owner",
    github: "mchen",
    status: "active",
    palette: 1
  },
  {
    id: "alice",
    name: "Alice Morgan",
    email: "alice@kiro.dev",
    role: "Auth platform owner",
    github: "alice-m",
    status: "active",
    palette: 2
  },
  {
    id: "kiro-guide",
    name: "Kiro Guide",
    email: "guide@kiro.dev",
    role: "Onboarding agent",
    github: "kiro-guide",
    status: "coding",
    palette: 3
  },
  {
    id: "codex-session",
    name: "Codex Pair",
    email: "codex@kiro.dev",
    role: "Coding agent",
    github: "codex",
    status: "coding",
    palette: 4
  }
];

const profile: OnboardingProfile = {
  employeeId: "sam",
  headline: "Python-strong new engineer, TypeScript-light, safe for localized backend fixes.",
  strengths: ["Python async", "API debugging", "small test-first fixes"],
  weakSpots: ["TypeScript UI", "auth schema migrations"],
  knownModules: ["notifications/webhook_handler.py", "tests/notifications", "provider retry fixtures"],
  sourceCoverage: 91,
  contextRiskScore: 29,
  summary:
    "Kiro matched Sam to a contained retry bug and reconstructed the decision trail from customer complaint to code convention."
};

const brainSources: BrainSourcePacket[] = [
  {
    provider: "hyperspell",
    status: "fallback",
    counts: { messages: 2341, docs: 47, prs: 200, crm: 1, emails: 1, meetings: 1, decisions: 9 },
    summary:
      "Fixture packet: Slack decisions, Notion docs, GitHub PRs, Gmail, CRM, and meeting context synthesized into decisions.",
    citations: fixtureCitations.filter((c) =>
      ["crm", "gmail", "slack", "meeting", "notion", "github", "pr"].includes(c.sourceType)
    )
  },
  {
    provider: "nia",
    status: "fallback",
    counts: { repos: 1 },
    summary:
      "Fixture packet: codebase conventions, test locations, and notification ownership retrieved from Nia-shaped context.",
    citations: fixtureCitations.filter((c) => c.sourceType === "nia")
  },
  {
    provider: "fixture",
    status: "connected",
    counts: { messages: 8, docs: 4, prs: 3, repos: 1, crm: 1, emails: 1, meetings: 1, decisions: 1 },
    summary:
      "Local fixture keeps the demo deterministic when sponsor APIs or WiFi are unavailable.",
    citations: fixtureCitations.slice(0, 3)
  }
];

export function getFixtureProfile(): OnboardingProfile {
  return profile;
}

export function getFixtureBrainSources(): BrainSourcePacket[] {
  return brainSources;
}

export function getFixtureDemoState(): DemoState {
  return {
    mode: "fixture",
    employees,
    profile,
    brainSources,
    captureCoverage,
    citations: fixtureCitations,
    decisions,
    task: {
      id: "task-142",
      title: "Fix notification webhook retry hang",
      issueId: "#142",
      owner: "Marcus Chen",
      matchedEmployeeId: "sam",
      status: "selected",
      progress: 68,
      whyMatched: [
        "Python async bug fits Sam's strength",
        "Localized to one handler and one test folder",
        "Customer complaint, Slack debate, meeting decision, and Notion policy resolve to one retry policy",
        "Prior junior-friendly fix exists in PR #89",
        "Marcus is online for review"
      ],
      files: [
        "notifications/webhook_handler.py",
        "tests/notifications/test_retry_backoff.py"
      ]
    },
    agents: [
      {
        id: "agent-kiro",
        kind: "kiro",
        displayName: "Kiro Guide",
        ownerEmployeeId: "sam",
        currentPlan: "Assemble context, pick starter task, verify guardrails.",
        status: "working"
      },
      {
        id: "agent-codex",
        kind: "codex",
        displayName: "Codex Pair",
        ownerEmployeeId: "sam",
        currentPlan: "Patch retry wait to bounded asyncio backoff and add coverage.",
        status: "blocked"
      }
    ],
    contextEvents: [
      {
        id: "evt-assembly",
        stage: "assemble",
        title: "Context capture window checked",
        body: "If a conversation happens outside the capture window, the agent is not in the room. Kiro brings those decisions back before code is written.",
        citationIds: ["crm-customer-handoff", "gmail-customer-complaint", "meeting-retry-finalized"]
      },
      {
        id: "evt-task",
        stage: "task",
        title: "Starter task selected",
        body: "Issue #142 links a customer complaint, Slack debate, meeting decision, Notion policy, prior PR pattern, and active owner.",
        citationIds: ["github-issue-142", "slack-async-decision", "pr-89-pattern"]
      },
      {
        id: "evt-guardrail",
        stage: "guardrail",
        title: "Guardrail warning",
        body: "The proposed fixed sleep conflicts with the synthesized retry policy decision.",
        citationIds: ["slack-async-decision", "meeting-retry-finalized", "notion-notifications-v2"]
      },
      {
        id: "evt-readiness",
        stage: "readiness",
        title: "PR readiness generated",
        body: "Tests pass, affected surface is narrow, and the decision trail names Marcus as reviewer.",
        citationIds: ["meeting-retry-finalized", "nia-tests-path", "pr-89-pattern"]
      }
    ],
    guardrails: [
      {
        id: "guard-async-sleep",
        title: "Use asyncio.sleep for retry waits",
        severity: "warning",
        rule: "Async workers must not block the event loop during retry backoff.",
        recommendation: "Replace time.sleep with bounded asyncio.sleep and preserve idempotency key handling.",
        citationIds: ["slack-async-decision", "meeting-retry-finalized", "notion-notifications-v2"],
        active: true
      }
    ],
    readiness: {
      id: "ready-142",
      taskId: "task-142",
      verdict: "ready",
      summary:
        "Patch is ready for owner review. Blast radius is limited to notification retry behavior and tests.",
      tests: ["tests/notifications/test_retry_backoff.py", "tests/notifications/test_webhook_handler.py"],
      risk: "low",
      recommendation: "Open PR with Marcus as reviewer and include the retry policy decision trail.",
      citationIds: decisions[0]!.sourceCitationIds
    },
    seniorMode: {
      title: "Senior mode flash: OAuth schema overlap",
      risk: "high",
      summary:
        "Codex and Claude are editing the same auth contract from different worktrees before either PR exists.",
      affectedSurfaces: ["AuthUser model", "OAuth profile DTO", "auth migrations"],
      recommendation: "Pause one agent, pick Alice as contract owner, publish the unified field shape."
    }
  };
}
