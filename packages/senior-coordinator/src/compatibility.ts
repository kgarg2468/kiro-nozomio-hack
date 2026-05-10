import OpenAI from "openai";
import { z } from "zod";
import type {
  CompatibilityClassification,
  Fingerprint,
  GitHubMemoryCitation
} from "@kiro/senior-shared";
import { compatibilityClassificationSchema } from "@kiro/senior-shared";

export interface CompatibilityInput {
  left: Fingerprint;
  right: Fingerprint;
  leftDiff: string;
  rightDiff: string;
  leftIntent?: string | undefined;
  rightIntent?: string | undefined;
  githubMemory?: GitHubMemoryCitation[] | undefined;
}

export type CompatibilityModelInvoker = (
  input: CompatibilityInput
) => Promise<unknown>;

export interface CompatibilityOptions {
  env?: Record<string, string | undefined>;
  modelInvoker?: CompatibilityModelInvoker;
}

const modelOutputSchema = z.object({
  kind: z.enum(["no_issue", "coordination_notice", "blocking_conflict"]),
  rationale: z.string().min(1).max(800),
  recommendedOwnerWorktreeId: z.string().min(1).optional(),
  recommendedOptionId: z.string().min(1).optional(),
  blastRadiusSummary: z.string().min(1).max(1000).optional(),
  unifiedSpecRecommendation: z.string().min(1).max(2000).optional(),
  githubMemoryEvidence: z.array(z.string().min(1)).max(8).default([]),
  perAgentNextActions: z
    .array(
      z.object({
        worktreeId: z.string().min(1),
        action: z.string().min(1).max(700)
      })
    )
    .max(8)
    .default([]),
  confidence: z.number().min(0).max(1).default(0.5)
});

export async function createCompatibilityClassification(
  input: CompatibilityInput,
  options: CompatibilityOptions = {}
): Promise<CompatibilityClassification | null> {
  const invoker =
    options.modelInvoker ?? createOpenAiCompatibilityInvoker(options.env ?? process.env);
  if (!invoker) return fallbackClassification(input);

  try {
    const raw = await invoker(input);
    const parsed = modelOutputSchema.parse(raw);
    return compatibilityClassificationSchema.parse({
      ...parsed,
      githubMemory: memoryFromEvidence(
        input.githubMemory ?? [],
        parsed.githubMemoryEvidence
      ),
      source: "openai"
    });
  } catch (_error) {
    return fallbackClassification(input);
  }
}

function createOpenAiCompatibilityInvoker(
  env: Record<string, string | undefined>
): CompatibilityModelInvoker | null {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const model = env.OPENAI_MODEL ?? "gpt-5.4-mini";
  const client = new OpenAI({ apiKey });

  return async (input) => {
    const response = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      max_completion_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            "Classify whether two live coding diffs can safely proceed in parallel. Return compact JSON only."
        },
        {
          role: "user",
          content: JSON.stringify({
            requiredShape: {
              kind: "no_issue | coordination_notice | blocking_conflict",
              rationale: "short reason",
              recommendedOwnerWorktreeId: "optional worktree id",
              recommendedOptionId: "optional option id",
              blastRadiusSummary: "short blast-radius summary",
              unifiedSpecRecommendation: "optional unified spec for both branches",
              githubMemoryEvidence: ["ids or titles of relevant GitHub memory"],
              perAgentNextActions: [
                { worktreeId: "worktree id", action: "specific next action" }
              ],
              confidence: "number 0..1"
            },
            left: fingerprintSummary(input.left),
            right: fingerprintSummary(input.right),
            leftIntent: input.leftIntent,
            rightIntent: input.rightIntent,
            githubMemory: (input.githubMemory ?? []).map(memorySummary),
            leftDiff: input.leftDiff.slice(0, 10_000),
            rightDiff: input.rightDiff.slice(0, 10_000)
          })
        }
      ]
    });
    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("Compatibility classifier response was empty");
    return JSON.parse(content) as unknown;
  };
}

function memorySummary(citation: GitHubMemoryCitation) {
  return {
    id: citation.id,
    repo: citation.repo,
    type: citation.type,
    number: citation.number,
    title: citation.title,
    state: citation.state,
    snippet: citation.snippet,
    relevanceReason: citation.relevanceReason
  };
}

function fingerprintSummary(fingerprint: Fingerprint) {
  return {
    worktreeId: fingerprint.worktreeId,
    filesTouched: fingerprint.filesTouched,
    surfaces: fingerprint.surfaces,
    symbols: fingerprint.symbols,
    semanticSummary: fingerprint.semanticSummary,
    contractChanges: fingerprint.contractChanges,
    confidence: fingerprint.confidence
  };
}

function fallbackClassification(
  input: CompatibilityInput
): CompatibilityClassification {
  const combinedDiff = `${input.leftDiff}\n${input.rightDiff}`;
  const leftAdditive = isAdditiveOnly(input.leftDiff);
  const rightAdditive = isAdditiveOnly(input.rightDiff);
  const sharedContractRoot = sharedRoot(input.left, input.right);

  if (!sharedContractRoot && !hasSharedFiles(input.left, input.right)) {
    return compatibilityClassificationSchema.parse({
      kind: "no_issue",
      rationale: "Fallback found no shared files or contract roots.",
      source: "fallback",
      githubMemory: input.githubMemory ?? [],
      blastRadiusSummary: "No shared files or contract roots were detected.",
      confidence: 0.7
    });
  }

  if (leftAdditive && rightAdditive) {
    return compatibilityClassificationSchema.parse({
      kind: "coordination_notice",
      rationale:
        "Fallback classified both diffs as additive changes to the shared surface.",
      recommendedOwnerWorktreeId: input.left.worktreeId,
      recommendedOptionId: "split-ownership",
      source: "fallback",
      githubMemory: input.githubMemory ?? [],
      blastRadiusSummary:
        "Both branches are editing the same surface additively; review the final contract shape before merge.",
      unifiedSpecRecommendation:
        "Agree the shared contract shape first, then let each branch adapt dependent code to that shape.",
      perAgentNextActions: fallbackNextActions(input),
      confidence: 0.74
    });
  }

  const destructive = /(^|\n)\s*-\s*[^-\n].*[:=({]/.test(combinedDiff);
  return compatibilityClassificationSchema.parse({
    kind: destructive ? "blocking_conflict" : "coordination_notice",
    rationale: destructive
      ? "Fallback found removals or replacements in a shared contract surface."
      : "Fallback found overlap but no obvious destructive edit.",
    recommendedOwnerWorktreeId: input.left.worktreeId,
    recommendedOptionId: "split-ownership",
    source: "fallback",
    githubMemory: input.githubMemory ?? [],
    blastRadiusSummary: destructive
      ? "A destructive edit on a shared contract surface may break peer branch assumptions and merge cleanly while behaving incorrectly."
      : "The branches overlap on a shared surface and need a single compatibility plan before merge.",
    unifiedSpecRecommendation:
      "Pause dependent edits, choose one owner for the shared contract, and have the peer branch adapt after the owner publishes the final shape.",
    perAgentNextActions: fallbackNextActions(input),
    confidence: destructive ? 0.78 : 0.62
  });
}

function memoryFromEvidence(
  citations: GitHubMemoryCitation[],
  evidence: string[]
): GitHubMemoryCitation[] {
  if (evidence.length === 0) return citations;
  const normalized = evidence.join("\n").toLowerCase();
  const matched = citations.filter((citation) =>
    [citation.id, citation.title, `#${citation.number}`].some((value) =>
      normalized.includes(value.toLowerCase())
    )
  );
  return matched.length > 0 ? matched : citations;
}

function fallbackNextActions(input: CompatibilityInput) {
  return [
    {
      worktreeId: input.left.worktreeId,
      action:
        "Act as the shared-contract owner: publish the intended contract shape before editing dependent call sites."
    },
    {
      worktreeId: input.right.worktreeId,
      action:
        "Pause dependent work until the owner publishes the contract shape, then adapt around that shape."
    }
  ];
}

function isAdditiveOnly(diff: string): boolean {
  const meaningfulLines = diff
    .split("\n")
    .filter((line) => line.startsWith("+") || line.startsWith("-"))
    .filter((line) => !line.startsWith("+++") && !line.startsWith("---"));
  return (
    meaningfulLines.some((line) => line.startsWith("+")) &&
    meaningfulLines.every((line) => line.startsWith("+"))
  );
}

function hasSharedFiles(left: Fingerprint, right: Fingerprint): boolean {
  const rightFiles = new Set(right.filesTouched);
  return left.filesTouched.some((file) => rightFiles.has(file));
}

function sharedRoot(left: Fingerprint, right: Fingerprint): string | null {
  const leftRoots = new Set(rootLabels(left));
  return rootLabels(right).find((root) => leftRoots.has(root)) ?? null;
}

function rootLabels(fingerprint: Fingerprint): string[] {
  return fingerprint.surfaces
    .map((surface) =>
      surface.label.replace(/\s+(model|type|DTO|API|contract)$/i, "").trim()
    )
    .filter(Boolean);
}
