import { z } from "zod";

export const riskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const conflictStatusSchema = z.enum([
  "open",
  "acknowledged",
  "resolved",
  "ignored"
]);
export type ConflictStatus = z.infer<typeof conflictStatusSchema>;

export const compatibilityKindSchema = z.enum([
  "no_issue",
  "coordination_notice",
  "blocking_conflict"
]);
export type CompatibilityKind = z.infer<typeof compatibilityKindSchema>;

export const compatibilityClassificationSchema = z.object({
  kind: compatibilityKindSchema,
  rationale: z.string().min(1),
  recommendedOwnerWorktreeId: z.string().min(1).optional(),
  recommendedOptionId: z.string().min(1).optional(),
  source: z.enum(["openai", "fallback"]).optional(),
  confidence: z.number().min(0).max(1).default(0.5)
});
export type CompatibilityClassification = z.infer<
  typeof compatibilityClassificationSchema
>;

export const coordinationRoleSchema = z.enum(["feature", "integration"]);
export type CoordinationRole = z.infer<typeof coordinationRoleSchema>;

export const surfaceKindSchema = z.enum([
  "schema",
  "api",
  "type",
  "component",
  "model",
  "dto",
  "utility",
  "test",
  "migration",
  "unknown"
]);
export type SurfaceKind = z.infer<typeof surfaceKindSchema>;

export const repoSchema = z.object({
  id: z.string().min(1),
  rootPath: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.number(),
  updatedAt: z.number()
});
export type KiroRepo = z.infer<typeof repoSchema>;

export const worktreeSchema = z.object({
  id: z.string().min(1),
  repoId: z.string().min(1),
  path: z.string().min(1),
  branch: z.string().nullable(),
  headSha: z.string().nullable(),
  dirty: z.boolean(),
  status: z.enum(["active", "missing", "unjoined"]),
  lastObservedAt: z.number()
});
export type KiroWorktree = z.infer<typeof worktreeSchema>;

export const agentSessionSchema = z.object({
  id: z.string().min(1),
  repoId: z.string().min(1),
  worktreeId: z.string().min(1).nullable(),
  agentKind: z.enum(["codex", "claude", "unknown"]),
  coordinationRole: coordinationRoleSchema.optional(),
  cwd: z.string().min(1),
  displayName: z.string().min(1),
  currentPlan: z.string().optional(),
  lastCheckpointAt: z.number().nullable(),
  joinedAt: z.number()
});
export type AgentSession = z.infer<typeof agentSessionSchema>;

export const contractSurfaceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: surfaceKindSchema,
  files: z.array(z.string().min(1)),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string().min(1))
});
export type ContractSurface = z.infer<typeof contractSurfaceSchema>;

export const fingerprintSchema = z.object({
  id: z.string().min(1),
  repoId: z.string().min(1),
  worktreeId: z.string().min(1),
  diffHash: z.string().min(1),
  createdAt: z.number(),
  filesTouched: z.array(z.string().min(1)),
  symbols: z.object({
    added: z.array(z.string()),
    modified: z.array(z.string()),
    removed: z.array(z.string())
  }),
  surfaces: z.array(contractSurfaceSchema),
  semanticSummary: z.string(),
  contractChanges: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  source: z.enum(["heuristic", "openai", "mixed"])
});
export type Fingerprint = z.infer<typeof fingerprintSchema>;

export const conflictTypeSchema = z.enum([
  "schema",
  "api",
  "component",
  "type",
  "intent",
  "unknown"
]);
export type ConflictType = z.infer<typeof conflictTypeSchema>;

export const conflictSchema = z.object({
  id: z.string().min(1),
  repoId: z.string().min(1),
  status: conflictStatusSchema,
  risk: riskLevelSchema,
  confidence: z.number().min(0).max(1),
  type: conflictTypeSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  primarySurface: z.string().min(1).default("shared surface"),
  affectedWorktreeIds: z.array(z.string().min(1)),
  affectedSurfaces: z.array(z.string().min(1)),
  evidence: z.array(z.string().min(1)),
  riskReasons: z
    .array(
      z.object({
        label: z.string().min(1),
        detail: z.string().min(1),
        weight: z.number().min(0).max(100)
      })
    )
    .default([]),
  classification: compatibilityClassificationSchema.optional(),
  createdAt: z.number(),
  updatedAt: z.number()
});
export type KiroConflict = z.infer<typeof conflictSchema>;

export const contractPublicationSchema = z.object({
  id: z.string().min(1),
  repoId: z.string().min(1),
  conflictId: z.string().min(1),
  ownerAgentSessionId: z.string().min(1),
  surface: z.string().min(1),
  shapeSummary: z.string().min(1).max(2000),
  files: z.array(z.string().min(1)).default([]),
  createdAt: z.number()
});
export type ContractPublication = z.infer<typeof contractPublicationSchema>;

export const interventionDirectiveRoleSchema = z.enum([
  "contract_owner",
  "adapter",
  "pause_only",
  "compatibility_owner"
]);
export type InterventionDirectiveRole = z.infer<
  typeof interventionDirectiveRoleSchema
>;

export const interventionDirectiveSchema = z.object({
  role: interventionDirectiveRoleSchema,
  conflict: z.string().min(1),
  peerAgentName: z.string().min(1).optional(),
  peerWorktreeId: z.string().min(1).optional(),
  peerIntentSummary: z.string().min(1).max(180).optional(),
  sharedSurfaces: z.array(z.string().min(1)).max(5).default([]),
  sharedFiles: z.array(z.string().min(1)).max(5).default([]),
  nextAction: z.string().min(1).max(500),
  planSteps: z.array(z.string().min(1)).max(5).optional()
});
export type InterventionDirective = z.infer<typeof interventionDirectiveSchema>;

export const advisorySchema = z.object({
  id: z.string().min(1),
  repoId: z.string().min(1),
  conflictId: z.string().min(1),
  options: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      direction: z.string().min(1),
      rationale: z.string().min(1),
      affectedSurfaces: z.array(z.string().min(1)),
      directives: z.array(interventionDirectiveSchema).optional()
    })
  ),
  source: z.enum(["heuristic", "openai"]),
  createdAt: z.number()
});
export type Advisory = z.infer<typeof advisorySchema>;

export const interventionSchema = z.object({
  id: z.string().min(1),
  repoId: z.string().min(1),
  conflictId: z.string().min(1),
  targetAgentSessionIds: z.array(z.string().min(1)),
  draft: z.string().min(1),
  editedDirection: z.string().min(1),
  directive: interventionDirectiveSchema.optional(),
  status: z.enum(["draft", "queued", "fetched", "acknowledged", "cancelled"]),
  createdAt: z.number(),
  sentAt: z.number().optional(),
  fetchedAt: z.number().optional(),
  acknowledgedAt: z.number().optional()
});
export type Intervention = z.infer<typeof interventionSchema>;

export const conflictDecisionSchema = z.object({
  id: z.string().min(1),
  repoId: z.string().min(1),
  conflictId: z.string().min(1),
  selectedOptionId: z.string().min(1),
  selectedOptionTitle: z.string().min(1),
  selectedOptionDirection: z.string().min(1),
  ownerAgentSessionId: z.string().min(1).optional(),
  createdBy: z.enum(["dashboard", "agent"]),
  status: z.enum(["active", "cancelled", "superseded"]),
  createdAt: z.number(),
  updatedAt: z.number()
});
export type ConflictDecision = z.infer<typeof conflictDecisionSchema>;

export const eventSchema = z.object({
  id: z.string().min(1),
  repoId: z.string().min(1),
  type: z.string().min(1),
  message: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.number()
});
export type KiroEvent = z.infer<typeof eventSchema>;
