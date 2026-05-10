import Database from "better-sqlite3";
import type {
  AgentSession,
  Advisory,
  ConflictDecision,
  ConflictStatus,
  ContractPublication,
  Fingerprint,
  Intervention,
  KiroConflict,
  KiroEvent,
  KiroRepo,
  KiroWorktree
} from "@kiro/shared";
import {
  agentSessionSchema,
  advisorySchema,
  conflictDecisionSchema,
  conflictSchema,
  contractPublicationSchema,
  eventSchema,
  fingerprintSchema,
  interventionSchema,
  repoSchema,
  worktreeSchema
} from "@kiro/shared";

export interface KiroStore {
  upsertRepo(repo: KiroRepo): void;
  getRepo(repoId: string): KiroRepo | null;
  upsertWorktree(worktree: KiroWorktree): void;
  markMissingWorktrees(repoId: string, activeWorktreeIds: string[], observedAt: number): void;
  listWorktrees(repoId: string): KiroWorktree[];
  addEvent(event: KiroEvent): void;
  listEvents(repoId: string): KiroEvent[];
  upsertFingerprint(fingerprint: Fingerprint): void;
  listFingerprints(repoId: string): Fingerprint[];
  upsertAgentSession(session: AgentSession): void;
  listAgentSessions(repoId: string): AgentSession[];
  updateAgentPlan(sessionId: string, plan: string, updatedAt: number): void;
  updateAgentCheckpoint(sessionId: string, updatedAt: number): void;
  upsertConflict(conflict: KiroConflict): void;
  listConflicts(repoId: string): KiroConflict[];
  updateConflictStatus(id: string, status: ConflictStatus, updatedAt: number): void;
  upsertConflictDecision(decision: ConflictDecision): void;
  getActiveConflictDecision(conflictId: string): ConflictDecision | null;
  listConflictDecisions(repoId: string): ConflictDecision[];
  upsertAdvisory(advisory: Advisory): void;
  listAdvisories(repoId: string): Advisory[];
  upsertContractPublication(publication: ContractPublication): void;
  listContractPublications(repoId: string): ContractPublication[];
  upsertIntervention(intervention: Intervention): void;
  listInterventions(repoId: string): Intervention[];
  listQueuedInterventions(repoId: string, agentSessionId: string): Intervention[];
  markInterventionFetched(id: string, fetchedAt: number): void;
  markInterventionAcknowledged(id: string, acknowledgedAt: number): void;
  close(): void;
}

export function createKiroStore(dbPath: string): KiroStore {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return new BetterSqliteKiroStore(db);
}

class BetterSqliteKiroStore implements KiroStore {
  constructor(private readonly db: Database.Database) {}

  upsertRepo(repo: KiroRepo): void {
    const parsed = repoSchema.parse(repo);
    this.db
      .prepare(
        `
        insert into repos (id, root_path, name, created_at, updated_at)
        values (@id, @rootPath, @name, @createdAt, @updatedAt)
        on conflict(id) do update set
          root_path = excluded.root_path,
          name = excluded.name,
          updated_at = excluded.updated_at
      `
      )
      .run(parsed);
  }

  getRepo(repoId: string): KiroRepo | null {
    const row = this.db.prepare("select * from repos where id = ?").get(repoId);
    if (!row) return null;
    return repoSchema.parse(repoFromRow(row as RepoRow));
  }

  upsertWorktree(worktree: KiroWorktree): void {
    const parsed = worktreeSchema.parse(worktree);
    this.db
      .prepare(
        `
        insert into worktrees (
          id, repo_id, path, branch, head_sha, dirty, status, last_observed_at
        )
        values (
          @id, @repoId, @path, @branch, @headSha, @dirty, @status, @lastObservedAt
        )
        on conflict(repo_id, path) do update set
          branch = excluded.branch,
          head_sha = excluded.head_sha,
          dirty = excluded.dirty,
          status = excluded.status,
          last_observed_at = excluded.last_observed_at
      `
      )
      .run({
        ...parsed,
        dirty: parsed.dirty ? 1 : 0
      });
  }

  markMissingWorktrees(
    repoId: string,
    activeWorktreeIds: string[],
    observedAt: number
  ): void {
    const existing = this.listWorktrees(repoId);
    const activeIds = new Set(activeWorktreeIds);
    const markMissing = this.db.prepare(
      "update worktrees set status = 'missing', dirty = 0, last_observed_at = ? where repo_id = ? and id = ?"
    );
    for (const worktree of existing) {
      if (!activeIds.has(worktree.id) && worktree.status !== "missing") {
        markMissing.run(observedAt, repoId, worktree.id);
      }
    }
  }

  listWorktrees(repoId: string): KiroWorktree[] {
    const rows = this.db
      .prepare("select * from worktrees where repo_id = ? order by path asc")
      .all(repoId) as WorktreeRow[];
    return rows.map((row) => worktreeSchema.parse(worktreeFromRow(row)));
  }

  addEvent(event: KiroEvent): void {
    const parsed = eventSchema.parse(event);
    this.db
      .prepare(
        `
        insert or ignore into events (id, repo_id, type, message, payload_json, created_at)
        values (@id, @repoId, @type, @message, @payloadJson, @createdAt)
      `
      )
      .run({ ...parsed, payloadJson: JSON.stringify(parsed.payload) });
  }

  listEvents(repoId: string): KiroEvent[] {
    const rows = this.db
      .prepare("select * from events where repo_id = ? order by created_at asc")
      .all(repoId) as EventRow[];
    return rows.map((row) => eventSchema.parse(eventFromRow(row)));
  }

  upsertFingerprint(fingerprint: Fingerprint): void {
    const parsed = fingerprintSchema.parse(fingerprint);
    this.db
      .prepare(
        `
        insert into fingerprints (
          id, repo_id, worktree_id, diff_hash, created_at,
          files_touched_json, symbols_json, surfaces_json, semantic_summary,
          contract_changes_json, confidence, source
        )
        values (
          @id, @repoId, @worktreeId, @diffHash, @createdAt,
          @filesTouchedJson, @symbolsJson, @surfacesJson, @semanticSummary,
          @contractChangesJson, @confidence, @source
        )
        on conflict(worktree_id, diff_hash) do nothing
      `
      )
      .run({
        ...parsed,
        filesTouchedJson: JSON.stringify(parsed.filesTouched),
        symbolsJson: JSON.stringify(parsed.symbols),
        surfacesJson: JSON.stringify(parsed.surfaces),
        contractChangesJson: JSON.stringify(parsed.contractChanges)
      });
  }

  listFingerprints(repoId: string): Fingerprint[] {
    const rows = this.db
      .prepare("select * from fingerprints where repo_id = ? order by created_at desc")
      .all(repoId) as FingerprintRow[];
    return rows.map((row) => fingerprintSchema.parse(fingerprintFromRow(row)));
  }

  upsertAgentSession(session: AgentSession): void {
    const parsed = agentSessionSchema.parse(session);
    this.db
      .prepare(
        `
        insert into agent_sessions (
          id, repo_id, worktree_id, agent_kind, coordination_role, cwd, display_name,
          current_plan, last_checkpoint_at, joined_at
        )
        values (
          @id, @repoId, @worktreeId, @agentKind, @coordinationRole, @cwd, @displayName,
          @currentPlan, @lastCheckpointAt, @joinedAt
        )
        on conflict(id) do update set
          worktree_id = excluded.worktree_id,
          agent_kind = excluded.agent_kind,
          coordination_role = excluded.coordination_role,
          cwd = excluded.cwd,
          display_name = excluded.display_name,
          last_checkpoint_at = excluded.last_checkpoint_at
      `
      )
      .run({
        ...parsed,
        coordinationRole: parsed.coordinationRole ?? "feature",
        currentPlan: parsed.currentPlan ?? null
      });
  }

  listAgentSessions(repoId: string): AgentSession[] {
    const rows = this.db
      .prepare("select * from agent_sessions where repo_id = ? order by joined_at desc")
      .all(repoId) as AgentSessionRow[];
    return rows.map((row) => agentSessionSchema.parse(agentSessionFromRow(row)));
  }

  updateAgentPlan(sessionId: string, plan: string, updatedAt: number): void {
    this.db
      .prepare(
        "update agent_sessions set current_plan = ?, last_checkpoint_at = ? where id = ?"
      )
      .run(plan, updatedAt, sessionId);
  }

  updateAgentCheckpoint(sessionId: string, updatedAt: number): void {
    this.db
      .prepare("update agent_sessions set last_checkpoint_at = ? where id = ?")
      .run(updatedAt, sessionId);
  }

  upsertConflict(conflict: KiroConflict): void {
    const parsed = conflictSchema.parse(conflict);
    this.db
      .prepare(
        `
        insert into conflicts (
          id, repo_id, status, risk, confidence, type, title, summary,
          primary_surface, affected_worktree_ids_json, affected_surfaces_json,
          evidence_json, risk_reasons_json, classification_json,
          created_at, updated_at
        )
        values (
          @id, @repoId, @status, @risk, @confidence, @type, @title, @summary,
          @primarySurface, @affectedWorktreeIdsJson, @affectedSurfacesJson,
          @evidenceJson, @riskReasonsJson, @classificationJson,
          @createdAt, @updatedAt
        )
        on conflict(id) do update set
          status = excluded.status,
          risk = excluded.risk,
          confidence = excluded.confidence,
          type = excluded.type,
          title = excluded.title,
          summary = excluded.summary,
          primary_surface = excluded.primary_surface,
          affected_worktree_ids_json = excluded.affected_worktree_ids_json,
          affected_surfaces_json = excluded.affected_surfaces_json,
          evidence_json = excluded.evidence_json,
          risk_reasons_json = excluded.risk_reasons_json,
          classification_json = excluded.classification_json,
          updated_at = excluded.updated_at
      `
      )
      .run({
        ...parsed,
        affectedWorktreeIdsJson: JSON.stringify(parsed.affectedWorktreeIds),
        affectedSurfacesJson: JSON.stringify(parsed.affectedSurfaces),
        evidenceJson: JSON.stringify(parsed.evidence),
        riskReasonsJson: JSON.stringify(parsed.riskReasons),
        classificationJson: parsed.classification
          ? JSON.stringify(parsed.classification)
          : null
      });
  }

  listConflicts(repoId: string): KiroConflict[] {
    const rows = this.db
      .prepare("select * from conflicts where repo_id = ? order by updated_at desc")
      .all(repoId) as ConflictRow[];
    return rows.map((row) => conflictSchema.parse(conflictFromRow(row)));
  }

  updateConflictStatus(
    id: string,
    status: ConflictStatus,
    updatedAt: number
  ): void {
    this.db
      .prepare("update conflicts set status = ?, updated_at = ? where id = ?")
      .run(status, updatedAt, id);
  }

  upsertConflictDecision(decision: ConflictDecision): void {
    const parsed = conflictDecisionSchema.parse(decision);
    this.db
      .prepare(
        `
        insert into conflict_decisions (
          id, repo_id, conflict_id, selected_option_id, selected_option_title,
          selected_option_direction, owner_agent_session_id, created_by, status,
          created_at, updated_at
        )
        values (
          @id, @repoId, @conflictId, @selectedOptionId, @selectedOptionTitle,
          @selectedOptionDirection, @ownerAgentSessionId, @createdBy, @status,
          @createdAt, @updatedAt
        )
        on conflict(id) do update set
          selected_option_id = excluded.selected_option_id,
          selected_option_title = excluded.selected_option_title,
          selected_option_direction = excluded.selected_option_direction,
          owner_agent_session_id = excluded.owner_agent_session_id,
          status = excluded.status,
          updated_at = excluded.updated_at
      `
      )
      .run({
        ...parsed,
        ownerAgentSessionId: parsed.ownerAgentSessionId ?? null
      });
  }

  getActiveConflictDecision(conflictId: string): ConflictDecision | null {
    const row = this.db
      .prepare(
        "select * from conflict_decisions where conflict_id = ? and status = 'active' order by created_at asc limit 1"
      )
      .get(conflictId) as ConflictDecisionRow | undefined;
    return row ? conflictDecisionSchema.parse(conflictDecisionFromRow(row)) : null;
  }

  listConflictDecisions(repoId: string): ConflictDecision[] {
    const rows = this.db
      .prepare("select * from conflict_decisions where repo_id = ? order by created_at desc")
      .all(repoId) as ConflictDecisionRow[];
    return rows.map((row) =>
      conflictDecisionSchema.parse(conflictDecisionFromRow(row))
    );
  }

  upsertAdvisory(advisory: Advisory): void {
    const parsed = advisorySchema.parse(advisory);
    this.db
      .prepare(
        `
        insert into advisories (id, repo_id, conflict_id, options_json, source, created_at)
        values (@id, @repoId, @conflictId, @optionsJson, @source, @createdAt)
        on conflict(id) do update set
          options_json = excluded.options_json,
          source = excluded.source
      `
      )
      .run({
        ...parsed,
        optionsJson: JSON.stringify(parsed.options)
      });
  }

  listAdvisories(repoId: string): Advisory[] {
    const rows = this.db
      .prepare("select * from advisories where repo_id = ? order by created_at desc")
      .all(repoId) as AdvisoryRow[];
    return rows.map((row) => advisorySchema.parse(advisoryFromRow(row)));
  }

  upsertContractPublication(publication: ContractPublication): void {
    const parsed = contractPublicationSchema.parse(publication);
    this.db
      .prepare(
        `
        insert into contract_publications (
          id, repo_id, conflict_id, owner_agent_session_id, surface,
          shape_summary, files_json, created_at
        )
        values (
          @id, @repoId, @conflictId, @ownerAgentSessionId, @surface,
          @shapeSummary, @filesJson, @createdAt
        )
        on conflict(id) do update set
          surface = excluded.surface,
          shape_summary = excluded.shape_summary,
          files_json = excluded.files_json
      `
      )
      .run({
        ...parsed,
        filesJson: JSON.stringify(parsed.files)
      });
  }

  listContractPublications(repoId: string): ContractPublication[] {
    const rows = this.db
      .prepare(
        "select * from contract_publications where repo_id = ? order by created_at desc"
      )
      .all(repoId) as ContractPublicationRow[];
    return rows.map((row) =>
      contractPublicationSchema.parse(contractPublicationFromRow(row))
    );
  }

  upsertIntervention(intervention: Intervention): void {
    const parsed = interventionSchema.parse(intervention);
    this.db
      .prepare(
        `
        insert into interventions (
          id, repo_id, conflict_id, target_agent_session_ids_json, draft,
          edited_direction, directive_json, status, created_at, sent_at, fetched_at,
          acknowledged_at
        )
        values (
          @id, @repoId, @conflictId, @targetAgentSessionIdsJson, @draft,
          @editedDirection, @directiveJson, @status, @createdAt, @sentAt,
          @fetchedAt, @acknowledgedAt
        )
        on conflict(id) do update set
          target_agent_session_ids_json = excluded.target_agent_session_ids_json,
          draft = excluded.draft,
          edited_direction = excluded.edited_direction,
          directive_json = excluded.directive_json,
          status = excluded.status,
          sent_at = excluded.sent_at,
          fetched_at = excluded.fetched_at,
          acknowledged_at = excluded.acknowledged_at
      `
      )
      .run({
        ...parsed,
        targetAgentSessionIdsJson: JSON.stringify(parsed.targetAgentSessionIds),
        directiveJson: parsed.directive ? JSON.stringify(parsed.directive) : null,
        sentAt: parsed.sentAt ?? null,
        fetchedAt: parsed.fetchedAt ?? null,
        acknowledgedAt: parsed.acknowledgedAt ?? null
      });
  }

  listInterventions(repoId: string): Intervention[] {
    const rows = this.db
      .prepare("select * from interventions where repo_id = ? order by created_at desc")
      .all(repoId) as InterventionRow[];
    return rows.map((row) => interventionSchema.parse(interventionFromRow(row)));
  }

  listQueuedInterventions(repoId: string, agentSessionId: string): Intervention[] {
    const rows = this.db
      .prepare(
        "select * from interventions where repo_id = ? and status = 'queued' order by created_at asc"
      )
      .all(repoId) as InterventionRow[];
    return rows
      .map((row) => interventionSchema.parse(interventionFromRow(row)))
      .filter((intervention) =>
        intervention.targetAgentSessionIds.includes(agentSessionId)
      );
  }

  markInterventionFetched(id: string, fetchedAt: number): void {
    this.db
      .prepare("update interventions set status = 'fetched', fetched_at = ? where id = ?")
      .run(fetchedAt, id);
  }

  markInterventionAcknowledged(id: string, acknowledgedAt: number): void {
    this.db
      .prepare(
        "update interventions set status = 'acknowledged', acknowledged_at = ? where id = ?"
      )
      .run(acknowledgedAt, id);
  }

  close(): void {
    this.db.close();
  }
}

function migrate(db: Database.Database): void {
  db.exec(`
    create table if not exists repos (
      id text primary key,
      root_path text not null,
      name text not null,
      created_at integer not null,
      updated_at integer not null
    );

    create table if not exists worktrees (
      id text primary key,
      repo_id text not null,
      path text not null,
      branch text,
      head_sha text,
      dirty integer not null default 0,
      status text not null,
      last_observed_at integer not null,
      unique(repo_id, path)
    );

    create table if not exists agent_sessions (
      id text primary key,
      repo_id text not null,
      worktree_id text,
      agent_kind text not null,
      coordination_role text not null default 'feature',
      cwd text not null,
      display_name text not null,
      current_plan text,
      last_checkpoint_at integer,
      joined_at integer not null
    );

    create table if not exists fingerprints (
      id text primary key,
      repo_id text not null,
      worktree_id text not null,
      diff_hash text not null,
      created_at integer not null,
      files_touched_json text not null,
      symbols_json text not null,
      surfaces_json text not null,
      semantic_summary text not null,
      contract_changes_json text not null,
      confidence real not null,
      source text not null,
      unique(worktree_id, diff_hash)
    );

    create table if not exists conflicts (
      id text primary key,
      repo_id text not null,
      status text not null,
      risk text not null,
      confidence real not null,
      type text not null,
      title text not null,
      summary text not null,
      primary_surface text not null default 'shared surface',
      affected_worktree_ids_json text not null,
      affected_surfaces_json text not null,
      evidence_json text not null,
      risk_reasons_json text not null default '[]',
      created_at integer not null,
      updated_at integer not null
    );

    create table if not exists advisories (
      id text primary key,
      repo_id text not null,
      conflict_id text not null,
      options_json text not null,
      source text not null,
      created_at integer not null
    );

    create table if not exists conflict_decisions (
      id text primary key,
      repo_id text not null,
      conflict_id text not null,
      selected_option_id text not null,
      selected_option_title text not null,
      selected_option_direction text not null,
      owner_agent_session_id text,
      created_by text not null,
      status text not null,
      created_at integer not null,
      updated_at integer not null
    );

    create table if not exists contract_publications (
      id text primary key,
      repo_id text not null,
      conflict_id text not null,
      owner_agent_session_id text not null,
      surface text not null,
      shape_summary text not null,
      files_json text not null,
      created_at integer not null
    );

    create table if not exists interventions (
      id text primary key,
      repo_id text not null,
      conflict_id text not null,
      target_agent_session_ids_json text not null,
      draft text not null,
      edited_direction text not null,
      directive_json text,
      status text not null,
      created_at integer not null,
      sent_at integer,
      fetched_at integer,
      acknowledged_at integer
    );

    create table if not exists events (
      id text primary key,
      repo_id text not null,
      type text not null,
      message text not null,
      payload_json text not null,
      created_at integer not null
    );

    create table if not exists eval_runs (
      id text primary key,
      repo_id text not null,
      status text not null,
      metrics_json text not null,
      created_at integer not null,
      completed_at integer
    );

    create table if not exists eval_cases (
      id text primary key,
      run_id text not null,
      language text not null,
      expected_risk text not null,
      actual_risk text,
      verdict text,
      latency_ms integer,
      evidence_json text not null
    );

    create table if not exists settings (
      key text primary key,
      value_json text not null,
      updated_at integer not null
    );
  `);
  addColumnIfMissing(
    db,
    "conflicts",
    "primary_surface",
    "primary_surface text not null default 'shared surface'"
  );
  addColumnIfMissing(
    db,
    "conflicts",
    "risk_reasons_json",
    "risk_reasons_json text not null default '[]'"
  );
  addColumnIfMissing(
    db,
    "interventions",
    "directive_json",
    "directive_json text"
  );
  addColumnIfMissing(
    db,
    "conflicts",
    "classification_json",
    "classification_json text"
  );
  addColumnIfMissing(
    db,
    "agent_sessions",
    "coordination_role",
    "coordination_role text not null default 'feature'"
  );
}

function addColumnIfMissing(
  db: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  const columns = db.prepare(`pragma table_info(${table})`).all() as Array<{
    name: string;
  }>;
  if (!columns.some((candidate) => candidate.name === column)) {
    db.exec(`alter table ${table} add column ${definition};`);
  }
}

interface RepoRow {
  id: string;
  root_path: string;
  name: string;
  created_at: number;
  updated_at: number;
}

function repoFromRow(row: RepoRow): KiroRepo {
  return {
    id: row.id,
    rootPath: row.root_path,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

interface EventRow {
  id: string;
  repo_id: string;
  type: string;
  message: string;
  payload_json: string;
  created_at: number;
}

interface WorktreeRow {
  id: string;
  repo_id: string;
  path: string;
  branch: string | null;
  head_sha: string | null;
  dirty: number;
  status: KiroWorktree["status"];
  last_observed_at: number;
}

function worktreeFromRow(row: WorktreeRow): KiroWorktree {
  return {
    id: row.id,
    repoId: row.repo_id,
    path: row.path,
    branch: row.branch,
    headSha: row.head_sha,
    dirty: Boolean(row.dirty),
    status: row.status,
    lastObservedAt: row.last_observed_at
  };
}

function eventFromRow(row: EventRow): KiroEvent {
  return {
    id: row.id,
    repoId: row.repo_id,
    type: row.type,
    message: row.message,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
    createdAt: row.created_at
  };
}

interface ConflictRow {
  id: string;
  repo_id: string;
  status: ConflictStatus;
  risk: KiroConflict["risk"];
  confidence: number;
  type: KiroConflict["type"];
  title: string;
  summary: string;
  primary_surface: string;
  affected_worktree_ids_json: string;
  affected_surfaces_json: string;
  evidence_json: string;
  risk_reasons_json: string;
  classification_json: string | null;
  created_at: number;
  updated_at: number;
}

function conflictFromRow(row: ConflictRow): KiroConflict {
  return {
    id: row.id,
    repoId: row.repo_id,
    status: row.status,
    risk: row.risk,
    confidence: row.confidence,
    type: row.type,
    title: row.title,
    summary: row.summary,
    primarySurface: row.primary_surface,
    affectedWorktreeIds: JSON.parse(row.affected_worktree_ids_json) as string[],
    affectedSurfaces: JSON.parse(row.affected_surfaces_json) as string[],
    evidence: JSON.parse(row.evidence_json) as string[],
    riskReasons: JSON.parse(row.risk_reasons_json) as KiroConflict["riskReasons"],
    ...(row.classification_json
      ? {
          classification: JSON.parse(
            row.classification_json
          ) as KiroConflict["classification"]
        }
      : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

interface FingerprintRow {
  id: string;
  repo_id: string;
  worktree_id: string;
  diff_hash: string;
  created_at: number;
  files_touched_json: string;
  symbols_json: string;
  surfaces_json: string;
  semantic_summary: string;
  contract_changes_json: string;
  confidence: number;
  source: Fingerprint["source"];
}

function fingerprintFromRow(row: FingerprintRow): Fingerprint {
  return {
    id: row.id,
    repoId: row.repo_id,
    worktreeId: row.worktree_id,
    diffHash: row.diff_hash,
    createdAt: row.created_at,
    filesTouched: JSON.parse(row.files_touched_json) as string[],
    symbols: JSON.parse(row.symbols_json) as Fingerprint["symbols"],
    surfaces: JSON.parse(row.surfaces_json) as Fingerprint["surfaces"],
    semanticSummary: row.semantic_summary,
    contractChanges: JSON.parse(row.contract_changes_json) as string[],
    confidence: row.confidence,
    source: row.source
  };
}

interface AgentSessionRow {
  id: string;
  repo_id: string;
  worktree_id: string | null;
  agent_kind: AgentSession["agentKind"];
  coordination_role: NonNullable<AgentSession["coordinationRole"]>;
  cwd: string;
  display_name: string;
  current_plan: string | null;
  last_checkpoint_at: number | null;
  joined_at: number;
}

function agentSessionFromRow(row: AgentSessionRow): AgentSession {
  const base = {
    id: row.id,
    repoId: row.repo_id,
    worktreeId: row.worktree_id,
    agentKind: row.agent_kind,
    coordinationRole: row.coordination_role,
    cwd: row.cwd,
    displayName: row.display_name,
    lastCheckpointAt: row.last_checkpoint_at,
    joinedAt: row.joined_at
  };
  return row.current_plan
    ? { ...base, currentPlan: row.current_plan }
    : base;
}

interface InterventionRow {
  id: string;
  repo_id: string;
  conflict_id: string;
  target_agent_session_ids_json: string;
  draft: string;
  edited_direction: string;
  directive_json: string | null;
  status: Intervention["status"];
  created_at: number;
  sent_at: number | null;
  fetched_at: number | null;
  acknowledged_at: number | null;
}

interface AdvisoryRow {
  id: string;
  repo_id: string;
  conflict_id: string;
  options_json: string;
  source: Advisory["source"];
  created_at: number;
}

interface ConflictDecisionRow {
  id: string;
  repo_id: string;
  conflict_id: string;
  selected_option_id: string;
  selected_option_title: string;
  selected_option_direction: string;
  owner_agent_session_id: string | null;
  created_by: ConflictDecision["createdBy"];
  status: ConflictDecision["status"];
  created_at: number;
  updated_at: number;
}

interface ContractPublicationRow {
  id: string;
  repo_id: string;
  conflict_id: string;
  owner_agent_session_id: string;
  surface: string;
  shape_summary: string;
  files_json: string;
  created_at: number;
}

function conflictDecisionFromRow(row: ConflictDecisionRow): ConflictDecision {
  return {
    id: row.id,
    repoId: row.repo_id,
    conflictId: row.conflict_id,
    selectedOptionId: row.selected_option_id,
    selectedOptionTitle: row.selected_option_title,
    selectedOptionDirection: row.selected_option_direction,
    ...(row.owner_agent_session_id
      ? { ownerAgentSessionId: row.owner_agent_session_id }
      : {}),
    createdBy: row.created_by,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function advisoryFromRow(row: AdvisoryRow): Advisory {
  return {
    id: row.id,
    repoId: row.repo_id,
    conflictId: row.conflict_id,
    options: JSON.parse(row.options_json) as Advisory["options"],
    source: row.source,
    createdAt: row.created_at
  };
}

function contractPublicationFromRow(
  row: ContractPublicationRow
): ContractPublication {
  return {
    id: row.id,
    repoId: row.repo_id,
    conflictId: row.conflict_id,
    ownerAgentSessionId: row.owner_agent_session_id,
    surface: row.surface,
    shapeSummary: row.shape_summary,
    files: JSON.parse(row.files_json) as string[],
    createdAt: row.created_at
  };
}

function interventionFromRow(row: InterventionRow): Intervention {
  const base = {
    id: row.id,
    repoId: row.repo_id,
    conflictId: row.conflict_id,
    targetAgentSessionIds: JSON.parse(row.target_agent_session_ids_json) as string[],
    draft: row.draft,
    editedDirection: row.edited_direction,
    ...(row.directive_json
      ? { directive: JSON.parse(row.directive_json) as Intervention["directive"] }
      : {}),
    status: row.status,
    createdAt: row.created_at
  };
  return {
    ...base,
    ...(row.sent_at ? { sentAt: row.sent_at } : {}),
    ...(row.fetched_at ? { fetchedAt: row.fetched_at } : {}),
    ...(row.acknowledged_at ? { acknowledgedAt: row.acknowledged_at } : {})
  };
}
