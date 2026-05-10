import type { ContractSurface, SurfaceKind } from "@kiro/senior-shared";

export interface FileSnapshot {
  path: string;
  content: string;
}

export interface SurfaceInput {
  files: FileSnapshot[];
  diff?: string | undefined;
}

export function extractSurfacesFromDiff(input: SurfaceInput): ContractSurface[] {
  const byId = new Map<string, ContractSurface>();
  const diffTextByFile = input.diff
    ? changedContentByFileFromDiff(input.diff)
    : new Map<string, string>();

  for (const file of input.files) {
    for (const surface of extractFileSurfaces(file, diffTextByFile.get(file.path))) {
      const existing = byId.get(surface.id);
      if (existing) {
        existing.files = [...new Set([...existing.files, ...surface.files])].sort();
        existing.evidence = [...new Set([...existing.evidence, ...surface.evidence])];
        existing.confidence = Math.max(existing.confidence, surface.confidence);
      } else {
        byId.set(surface.id, surface);
      }
    }
  }

  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function changedContentByFileFromDiff(diff: string): Map<string, string> {
  const byFile = new Map<string, string>();
  const blocks = diff
    .split(/(?=^diff --git )/gm)
    .filter((block) => block.trim().length > 0);
  for (const block of blocks) {
    const filePath = filePathFromDiffBlock(block);
    if (!filePath) continue;
    const lines: string[] = [];
    let currentDeclaration: string | null = null;
    for (const line of block.split("\n")) {
      if (
        line.startsWith("diff --git ") ||
        line.startsWith("index ") ||
        line.startsWith("--- ") ||
        line.startsWith("+++ ")
      ) {
        continue;
      }
      if (line.startsWith("@@")) {
        currentDeclaration = null;
        continue;
      }
      if (line.startsWith(" ")) {
        const content = line.slice(1);
        if (isDeclarationLine(content)) currentDeclaration = content;
        continue;
      }
      if (line.startsWith("+") || line.startsWith("-")) {
        const content = line.slice(1);
        if (isDeclarationLine(content)) {
          lines.push(content);
        } else if (currentDeclaration) {
          lines.push(currentDeclaration, content);
        } else {
          lines.push(content);
        }
      }
    }
    byFile.set(filePath, lines.join("\n"));
  }
  return byFile;
}

function isDeclarationLine(line: string): boolean {
  return /\b(interface|type|class|function|def)\s+[A-Za-z_][A-Za-z0-9_]*/.test(
    line
  );
}

function extractFileSurfaces(
  file: FileSnapshot,
  changedContent: string | undefined
): ContractSurface[] {
  const lowerPath = file.path.toLowerCase();
  const surfaces: ContractSurface[] = [];
  const changedNames = changedContent
    ? extractLikelyNames(changedContent, file.path, false)
    : [];
  const names =
    changedContent && changedNames.length > 0
      ? changedNames
      : extractLikelyNames(file.content, file.path, true);

  const pathKind = classifyPath(lowerPath);
  for (const name of names) {
    const kind = chooseKindForName(name, pathKind, lowerPath);
    surfaces.push(makeSurface(name, kind, file.path, pathEvidence(lowerPath, kind)));
  }

  if (surfaces.length === 0 && pathKind !== "unknown") {
    const fallback = fallbackLabelFromPath(file.path, pathKind);
    surfaces.push(makeSurface(fallback, pathKind, file.path, [`${pathKind} path`], 0.55));
  }

  return surfaces;
}

function filePathFromDiffBlock(block: string): string | null {
  const firstLine = block.split("\n")[0] ?? "";
  const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(firstLine);
  return match?.[2] ?? null;
}

function classifyPath(lowerPath: string): SurfaceKind {
  if (/(schema|model|entity|migration|drizzle|prisma)/.test(lowerPath)) {
    if (/migration/.test(lowerPath)) return "migration";
    return "schema";
  }
  if (/(route|routes|api|controller|handler|endpoint)/.test(lowerPath)) return "api";
  if (/(dto|request|response|payload)/.test(lowerPath)) return "dto";
  if (/(component|components|tsx$|jsx$)/.test(lowerPath)) return "component";
  if (/(types|interfaces|contract)/.test(lowerPath)) return "type";
  if (/(utils|util|helpers)/.test(lowerPath)) return "utility";
  if (/(test|spec)/.test(lowerPath)) return "test";
  return "unknown";
}

function extractLikelyNames(
  content: string,
  filePath: string,
  includeBasenameFallback: boolean
): string[] {
  const names = new Set<string>();
  const patterns = [
    /\binterface\s+([A-Z][A-Za-z0-9_]*)/g,
    /\btype\s+([A-Z][A-Za-z0-9_]*)/g,
    /\bclass\s+([A-Z][A-Za-z0-9_]*)/g,
    /\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)/g,
    /\bdef\s+([A-Za-z_][A-Za-z0-9_]*)/g,
    /\bpublic\s+(?:class|interface|record)\s+([A-Z][A-Za-z0-9_]*)/g
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      if (match[1]) names.add(normalizeName(match[1]));
    }
  }

  for (const match of content.matchAll(/\bsqliteTable\(\s*["']([A-Za-z0-9_-]+)["']/g)) {
    if (match[1]) names.add(tableNameToModelName(match[1]));
  }

  if (includeBasenameFallback) {
    const basename = filePath.split("/").pop() ?? filePath;
    const base = basename.replace(/\.[^.]+$/, "");
    if (/^[A-Z][A-Za-z0-9_]*(Card|Props|Dto|DTO|Controller|Service|Model)?$/.test(base)) {
      names.add(normalizeName(base));
    }
  }

  return [...names];
}

function normalizeName(name: string): string {
  return name.replace(/Props$/, "").replace(/DTO$/, "Dto");
}

function tableNameToModelName(name: string): string {
  const singular = name.replace(/s$/, "");
  return singular
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function chooseKindForName(
  name: string,
  pathKind: SurfaceKind,
  lowerPath: string
): SurfaceKind {
  if (/Props$/.test(name) || /card|component/.test(lowerPath)) return "component";
  if (/Dto$/.test(name) || pathKind === "dto") return "dto";
  if (/Controller$/.test(name) || pathKind === "api") return "api";
  if (pathKind !== "unknown") return pathKind;
  return "type";
}

function makeSurface(
  rawName: string,
  kind: SurfaceKind,
  filePath: string,
  evidence: string[],
  confidence = 0.75
): ContractSurface {
  const baseName = rawName
    .replace(/Card$/, "Card")
    .replace(/Controller$/, "")
    .replace(/Dto$/, "")
    .replace(/DTO$/, "");
  const label = labelFor(baseName, kind, rawName);
  return {
    id: slug(label),
    label,
    kind,
    files: [filePath],
    confidence,
    evidence
  };
}

function labelFor(baseName: string, kind: SurfaceKind, rawName: string): string {
  if (kind === "schema" || kind === "model" || kind === "migration") {
    return `${stripSuffixes(baseName)} model`;
  }
  if (kind === "api") return `${stripSuffixes(baseName)} API`;
  if (kind === "dto") return `${stripSuffixes(baseName)} DTO`;
  if (kind === "component") {
    if (/Card/.test(rawName)) return `${stripSuffixes(rawName)} props`;
    return `${stripSuffixes(baseName)} component`;
  }
  if (kind === "type") return `${stripSuffixes(baseName)} type`;
  return `${stripSuffixes(baseName)} ${kind}`;
}

function stripSuffixes(name: string): string {
  return name
    .replace(/Props$/, "")
    .replace(/Controller$/, "")
    .replace(/Dto$/, "")
    .replace(/DTO$/, "");
}

function fallbackLabelFromPath(filePath: string, kind: SurfaceKind): string {
  const base = filePath
    .split("/")
    .pop()
    ?.replace(/\.[^.]+$/, "")
    .replace(/[-_](.)/g, (_match, letter: string) => letter.toUpperCase());
  return `${base ?? "unknown"} ${kind}`;
}

function pathEvidence(lowerPath: string, kind: SurfaceKind): string[] {
  const evidence = [`${kind} path`];
  if (lowerPath.endsWith(".ts") || lowerPath.endsWith(".tsx")) evidence.push("TS/JS file");
  if (lowerPath.endsWith(".py")) evidence.push("Python file");
  if (lowerPath.endsWith(".java")) evidence.push("Java file");
  return evidence;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
