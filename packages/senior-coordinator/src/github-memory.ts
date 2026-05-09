import { createHash } from "node:crypto";
import type { Fingerprint, GitHubMemoryCitation } from "@kiro/senior-shared";
import { githubMemoryCitationSchema } from "@kiro/senior-shared";

export interface GitHubMemoryInput {
  left: Fingerprint;
  right: Fingerprint;
  leftIntent?: string | undefined;
  rightIntent?: string | undefined;
  env?: Record<string, string | undefined> | undefined;
  fetcher?: typeof fetch | undefined;
}

interface GitHubSearchItem {
  html_url?: string;
  repository_url?: string;
  number?: number;
  title?: string;
  state?: string;
  body?: string | null;
  updated_at?: string;
  pull_request?: unknown;
}

interface GitHubSearchResponse {
  items?: GitHubSearchItem[];
}

const MAX_REPOS = 5;
const MAX_TERMS = 8;
const MAX_RESULTS_PER_REPO = 4;

export async function fetchGitHubMemory(
  input: GitHubMemoryInput
): Promise<GitHubMemoryCitation[]> {
  const env = input.env ?? process.env;
  const repos = configuredRepos(env.KIRO_GITHUB_REPOS);
  if (repos.length === 0) return [];

  const terms = termsForGitHubMemory(input).slice(0, MAX_TERMS);
  if (terms.length === 0) return [];

  const fetchImpl = input.fetcher ?? fetch;
  const results: GitHubMemoryCitation[] = [];
  for (const repo of repos.slice(0, MAX_REPOS)) {
    const query = ["repo:" + repo, ...terms].join(" ");
    const url = new URL("https://api.github.com/search/issues");
    url.searchParams.set("q", query);
    url.searchParams.set("sort", "updated");
    url.searchParams.set("order", "desc");
    url.searchParams.set("per_page", String(MAX_RESULTS_PER_REPO));

    try {
      const response = await fetchImpl(url, {
        headers: githubHeaders(env)
      });
      if (!response.ok) continue;
      const body = (await response.json()) as GitHubSearchResponse;
      for (const item of body.items ?? []) {
        const citation = normalizeGitHubItem(repo, item, terms);
        if (citation) results.push(citation);
      }
    } catch (_error) {
      continue;
    }
  }

  return dedupeCitations(results)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);
}

export function termsForGitHubMemory(input: GitHubMemoryInput): string[] {
  const values = [
    input.leftIntent,
    input.rightIntent,
    input.left.semanticSummary,
    input.right.semanticSummary,
    ...input.left.filesTouched,
    ...input.right.filesTouched,
    ...input.left.contractChanges,
    ...input.right.contractChanges,
    ...input.left.surfaces.map((surface) => surface.label),
    ...input.right.surfaces.map((surface) => surface.label),
    ...input.left.symbols.added,
    ...input.left.symbols.modified,
    ...input.right.symbols.added,
    ...input.right.symbols.modified
  ];
  const terms = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    for (const term of value.split(/[^A-Za-z0-9_/-]+/)) {
      const normalized = normalizeTerm(term);
      if (normalized) terms.add(normalized);
    }
  }
  return [...terms];
}

function normalizeGitHubItem(
  repo: string,
  item: GitHubSearchItem,
  terms: string[]
): GitHubMemoryCitation | null {
  if (!item.number || !item.title) return null;
  const haystack = `${item.title}\n${item.body ?? ""}`.toLowerCase();
  const matchedTerms = terms.filter((term) => haystack.includes(term.toLowerCase()));
  const snippet = compactSnippet(item.body ?? item.title);
  return githubMemoryCitationSchema.parse({
    id: stableCitationId(repo, item),
    repo,
    type: item.pull_request ? "pull_request" : "issue",
    number: item.number,
    title: item.title,
    ...(item.html_url ? { url: item.html_url } : {}),
    ...(item.state ? { state: item.state } : {}),
    snippet,
    relevanceReason:
      matchedTerms.length > 0
        ? `Matched ${matchedTerms.slice(0, 4).join(", ")} in GitHub history.`
        : "Returned by GitHub issue and PR search for the active branch surfaces.",
    confidence: matchedTerms.length > 0 ? Math.min(0.9, 0.48 + matchedTerms.length * 0.08) : 0.42,
    ...(item.updated_at ? { updatedAt: Date.parse(item.updated_at) } : {})
  });
}

function configuredRepos(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((repo) => repo.trim())
    .filter((repo) => /^[^/\s]+\/[^/\s]+$/.test(repo));
}

function githubHeaders(env: Record<string, string | undefined>): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }
  return headers;
}

function normalizeTerm(term: string): string | null {
  const trimmed = term.trim().replace(/^src\//, "");
  if (trimmed.length < 3) return null;
  if (/^(the|and|for|with|from|this|that|into|touch|changes?)$/i.test(trimmed)) {
    return null;
  }
  if (/^\d+$/.test(trimmed)) return null;
  return trimmed.slice(0, 64);
}

function compactSnippet(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 900) || "No issue body was provided.";
}

function stableCitationId(repo: string, item: GitHubSearchItem): string {
  return createHash("sha1")
    .update(`${repo}:${item.pull_request ? "pr" : "issue"}:${item.number}`)
    .digest("hex")
    .slice(0, 16);
}

function dedupeCitations(
  citations: GitHubMemoryCitation[]
): GitHubMemoryCitation[] {
  const byId = new Map<string, GitHubMemoryCitation>();
  for (const citation of citations) {
    byId.set(citation.id, citation);
  }
  return [...byId.values()];
}
