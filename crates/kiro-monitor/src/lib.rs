use anyhow::{Context, Result, anyhow};
use regex::Regex;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

const MAX_FILE_BYTES: u64 = 128 * 1024;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SurfaceKind {
    Schema,
    Api,
    Type,
    Component,
    Migration,
    Model,
    Dto,
    Test,
    Utility,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct WorktreeSnapshot {
    pub id: String,
    pub path: String,
    pub branch: Option<String>,
    pub head_sha: Option<String>,
    pub dirty: bool,
    pub detached: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChangedFile {
    pub path: String,
    pub status: String,
    pub additions: usize,
    pub deletions: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StatusEntry {
    pub path: String,
    pub status: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ContractSurface {
    pub id: String,
    pub label: String,
    pub kind: SurfaceKind,
    pub files: Vec<String>,
    pub confidence: f32,
    pub evidence: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GuardrailRule {
    pub id: String,
    pub title: String,
    pub severity: String,
    pub pattern: String,
    pub paths: Vec<String>,
    pub recommendation: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MonitorSession {
    pub id: String,
    pub worktree_id: Option<String>,
    pub display_name: String,
    pub current_plan: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct MonitorContext {
    pub guardrails: Vec<GuardrailRule>,
    pub sessions: Vec<MonitorSession>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DiffFingerprint {
    pub id: String,
    pub repo_id: String,
    pub worktree_id: String,
    pub diff_hash: String,
    pub files_touched: Vec<String>,
    pub changed_files: Vec<ChangedFile>,
    pub symbols: Vec<String>,
    pub surfaces: Vec<ContractSurface>,
    pub semantic_summary: String,
    pub confidence: f32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GuardrailViolation {
    pub id: String,
    pub rule_id: String,
    pub title: String,
    pub severity: String,
    pub worktree_id: String,
    pub files: Vec<String>,
    pub evidence: Vec<String>,
    pub recommendation: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct KiroConflict {
    pub id: String,
    pub risk: String,
    pub conflict_type: String,
    pub title: String,
    pub summary: String,
    pub affected_worktree_ids: Vec<String>,
    pub affected_surfaces: Vec<String>,
    pub affected_files: Vec<String>,
    pub evidence: Vec<String>,
    pub pause: bool,
    pub confidence: f32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BlastRadiusEvent {
    pub id: String,
    pub risk: String,
    pub summary: String,
    pub files: Vec<String>,
    pub surfaces: Vec<String>,
    pub guardrail_violation_ids: Vec<String>,
    pub conflict_ids: Vec<String>,
    pub recommendation: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MonitorScanResult {
    pub repo_id: String,
    pub repo_root: String,
    pub worktrees: Vec<WorktreeSnapshot>,
    pub fingerprints: Vec<DiffFingerprint>,
    pub guardrail_violations: Vec<GuardrailViolation>,
    pub conflicts: Vec<KiroConflict>,
    pub blast_radius_events: Vec<BlastRadiusEvent>,
    pub degraded: bool,
}

pub fn parse_worktree_porcelain(output: &str) -> Vec<WorktreeSnapshot> {
    output
        .split("\n\n")
        .filter_map(|block| {
            let block = block.trim();
            if block.is_empty() {
                return None;
            }
            let mut path = String::new();
            let mut head_sha = None;
            let mut branch = None;
            let mut detached = false;
            for line in block.lines() {
                if let Some(value) = line.strip_prefix("worktree ") {
                    path = value.to_string();
                } else if let Some(value) = line.strip_prefix("HEAD ") {
                    head_sha = Some(value.to_string());
                } else if let Some(value) = line.strip_prefix("branch ") {
                    branch = Some(value.trim_start_matches("refs/heads/").to_string());
                } else if line == "detached" {
                    detached = true;
                }
            }
            if path.is_empty() {
                return None;
            }
            Some(WorktreeSnapshot {
                id: stable_id(["worktree", &path]),
                path,
                branch,
                head_sha,
                dirty: false,
                detached,
            })
        })
        .collect()
}

pub fn parse_status_porcelain(output: &str) -> Vec<StatusEntry> {
    output
        .lines()
        .filter_map(|line| {
            if line.len() < 3 || line.starts_with("!! ") {
                return None;
            }
            let (status_code, raw_path) = if line.as_bytes().get(2) == Some(&b' ') {
                (&line[..2], line[3..].trim())
            } else if line.as_bytes().get(1) == Some(&b' ') {
                (&line[..1], line[2..].trim())
            } else {
                return None;
            };
            let path = parse_status_path(raw_path);
            if path.is_empty() {
                return None;
            }
            let status = if status_code == "??" {
                "untracked"
            } else if status_code.contains('D') {
                "deleted"
            } else if status_code.contains('A') {
                "added"
            } else if status_code.contains('R') {
                "renamed"
            } else {
                "modified"
            };
            Some(StatusEntry {
                path,
                status: status.to_string(),
            })
        })
        .collect()
}

pub fn normalize_diff(diff: &str) -> String {
    diff.replace("\r\n", "\n")
        .lines()
        .filter(|line| {
            !line.starts_with("index ")
                && !line.starts_with("similarity index ")
                && !line.starts_with("dissimilarity index ")
        })
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string()
}

pub fn extract_changed_files_from_diff(diff: &str) -> Vec<ChangedFile> {
    diff_blocks(diff)
        .into_iter()
        .filter_map(|block| {
            let first = block.lines().next()?;
            let path = parse_diff_path(first)?;
            let status = if block.contains("\nnew file mode ") {
                "added"
            } else if block.contains("\ndeleted file mode ") {
                "deleted"
            } else if block.contains("\nrename from ") {
                "renamed"
            } else {
                "modified"
            };
            let additions = block
                .lines()
                .filter(|line| line.starts_with('+') && !line.starts_with("+++"))
                .count();
            let deletions = block
                .lines()
                .filter(|line| line.starts_with('-') && !line.starts_with("---"))
                .count();
            Some(ChangedFile {
                path,
                status: status.to_string(),
                additions,
                deletions,
            })
        })
        .collect()
}

pub fn extract_surfaces_from_content(path: &str, content: &str) -> Vec<ContractSurface> {
    let path_kind = classify_path(path);
    let mut names = BTreeSet::new();
    let patterns = [
        r"\binterface\s+([A-Z][A-Za-z0-9_]*)",
        r"\btype\s+([A-Z][A-Za-z0-9_]*)",
        r"\bclass\s+([A-Z][A-Za-z0-9_]*)",
        r"\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)",
        r"\bdef\s+([A-Za-z_][A-Za-z0-9_]*)",
        r#"\bsqliteTable\(\s*["']([A-Za-z0-9_-]+)["']"#,
    ];
    for pattern in patterns {
        let regex = Regex::new(pattern).expect("valid regex");
        for capture in regex.captures_iter(content) {
            if let Some(name) = capture.get(1) {
                names.insert(normalize_symbol_name(name.as_str()));
            }
        }
    }
    if names.is_empty() && path_kind != SurfaceKind::Unknown {
        names.insert(fallback_name_from_path(path));
    }

    let mut by_id = BTreeMap::new();
    for name in names {
        let kind = choose_kind(&name, &path_kind, path);
        let label = label_for(&name, &kind);
        let surface = ContractSurface {
            id: slug(&label),
            label,
            kind,
            files: vec![path.to_string()],
            confidence: 0.75,
            evidence: vec![format!("{} path", path_kind_label(&path_kind))],
        };
        by_id.insert(surface.id.clone(), surface);
    }
    by_id.into_values().collect()
}

pub fn cli_fixture(name: &str) -> Result<MonitorScanResult> {
    match name {
        "demo-auth-overlap" => Ok(demo_auth_overlap_fixture()),
        _ => Err(anyhow!("unknown fixture: {name}")),
    }
}

pub fn scan_repo(repo_root: &str, context: MonitorContext) -> Result<MonitorScanResult> {
    let repo_root = git_root(repo_root)?;
    let repo_id = stable_id(["repo", repo_root.to_string_lossy().as_ref()]);
    let output = git_output(&repo_root, ["worktree", "list", "--porcelain"])?;
    let mut worktrees = parse_worktree_porcelain(&output);
    let mut fingerprints = Vec::new();
    let mut guardrail_violations = Vec::new();
    let mut standalone_conflicts = Vec::new();

    for worktree in &mut worktrees {
        let worktree_path = PathBuf::from(&worktree.path);
        let diff = combined_diff(&worktree_path)?;
        let filtered_diff = filter_ignored_diff(&worktree_path, &diff);
        let normalized = normalize_diff(&filtered_diff);
        let mut changed_files = Vec::new();
        let mut surface_labels = Vec::new();
        let mut has_signal = !normalized.is_empty();

        if !normalized.is_empty() {
            let fingerprint =
                fingerprint_for_diff(&repo_id, &worktree.id, &worktree_path, &filtered_diff);
            changed_files = fingerprint.files_touched.clone();
            surface_labels = fingerprint
                .surfaces
                .iter()
                .map(|surface| surface.label.clone())
                .collect();
            guardrail_violations.extend(match_guardrails(
                &context.guardrails,
                &worktree.id,
                &filtered_diff,
                &fingerprint.changed_files,
            ));
            standalone_conflicts.extend(destructive_conflicts_for_fingerprint(
                &repo_id,
                &fingerprint,
                &filtered_diff,
            ));
            fingerprints.push(fingerprint);
        }

        let state_conflicts =
            repo_state_conflicts(&repo_id, worktree, &changed_files, &surface_labels)?;
        if !state_conflicts.is_empty() {
            has_signal = true;
            standalone_conflicts.extend(state_conflicts);
        }
        worktree.dirty = has_signal;
    }

    let mut conflicts = detect_conflicts(&repo_id, &fingerprints, &context);
    conflicts.extend(standalone_conflicts);
    conflicts.extend(conflicts_from_guardrails(&repo_id, &guardrail_violations));
    let blast_radius_events =
        create_blast_radius_events(&repo_id, &conflicts, &guardrail_violations);

    Ok(MonitorScanResult {
        repo_id,
        repo_root: repo_root.to_string_lossy().to_string(),
        worktrees,
        fingerprints,
        guardrail_violations,
        conflicts,
        blast_radius_events,
        degraded: false,
    })
}

fn git_root(repo_root: &str) -> Result<PathBuf> {
    let root = PathBuf::from(repo_root);
    let output = git_output(&root, ["rev-parse", "--show-toplevel"])?;
    Ok(PathBuf::from(output.trim()))
}

fn combined_diff(worktree_path: &Path) -> Result<String> {
    let unstaged = git_output(worktree_path, ["diff", "--no-ext-diff"])?;
    let staged = git_output(worktree_path, ["diff", "--cached", "--no-ext-diff"])?;
    let untracked = untracked_file_diffs(worktree_path)?;
    Ok([unstaged, staged, untracked]
        .into_iter()
        .filter(|part| !part.trim().is_empty())
        .collect::<Vec<_>>()
        .join("\n"))
}

fn untracked_file_diffs(worktree_path: &Path) -> Result<String> {
    let status = git_output(
        worktree_path,
        ["status", "--porcelain=v1", "--untracked-files=all"],
    )?;
    let rules = read_ignore_rules(worktree_path);
    let blocks = parse_status_porcelain(&status)
        .into_iter()
        .filter(|entry| entry.status == "untracked" && !is_ignored_path(&entry.path, &rules))
        .filter_map(|entry| synthetic_untracked_diff(worktree_path, &entry.path).transpose())
        .collect::<Result<Vec<_>>>()?;
    Ok(blocks.join("\n"))
}

fn synthetic_untracked_diff(worktree_path: &Path, relative_path: &str) -> Result<Option<String>> {
    let full_path = worktree_path.join(relative_path);
    let metadata = match fs::metadata(&full_path) {
        Ok(metadata) => metadata,
        Err(_) => return Ok(None),
    };
    if !metadata.is_file() {
        return Ok(None);
    }
    let content = read_scannable_file(&full_path)?;
    let lines = match content {
        ScannableFile::Text(text) => text
            .lines()
            .map(|line| format!("+{line}"))
            .collect::<Vec<_>>(),
        ScannableFile::Omitted(reason) => vec![format!(
            "+[kiro omitted untracked file content: {reason}]"
        )],
    };
    let line_count = lines.len().max(1);
    Ok(Some(
        [
            format!("diff --git a/{relative_path} b/{relative_path}"),
            "new file mode 100644".to_string(),
            "--- /dev/null".to_string(),
            format!("+++ b/{relative_path}"),
            format!("@@ -0,0 +1,{line_count} @@"),
            lines.join("\n"),
        ]
        .join("\n"),
    ))
}

fn git_output<const N: usize>(cwd: &Path, args: [&str; N]) -> Result<String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .with_context(|| format!("failed to run git in {}", cwd.display()))?;
    if !output.status.success() {
        return Err(anyhow!(
            "git failed in {}\nstdout:\n{}\nstderr:\n{}",
            cwd.display(),
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn fingerprint_for_diff(
    repo_id: &str,
    worktree_id: &str,
    worktree_path: &Path,
    diff: &str,
) -> DiffFingerprint {
    let normalized = normalize_diff(diff);
    let changed_files = extract_changed_files_from_diff(diff);
    let mut symbols = BTreeSet::new();
    let mut surfaces_by_id: BTreeMap<String, ContractSurface> = BTreeMap::new();

    for changed_file in &changed_files {
        let content = if changed_file.status == "deleted" {
            String::new()
        } else {
            match read_scannable_file(&worktree_path.join(&changed_file.path)) {
                Ok(ScannableFile::Text(content)) => content,
                Ok(ScannableFile::Omitted(_)) | Err(_) => String::new(),
            }
        };
        for symbol in extract_symbols(&content) {
            symbols.insert(symbol);
        }
        let mut surfaces = extract_surfaces_from_content(&changed_file.path, &content);
        if surfaces.is_empty() {
            let kind = classify_path(&changed_file.path);
            if kind != SurfaceKind::Unknown {
                let name = fallback_name_from_path(&changed_file.path);
                surfaces.push(ContractSurface {
                    id: slug(&label_for(&name, &kind)),
                    label: label_for(&name, &kind),
                    kind,
                    files: vec![changed_file.path.clone()],
                    confidence: 0.55,
                    evidence: vec!["path fallback".to_string()],
                });
            }
        }
        for surface in surfaces {
            surfaces_by_id
                .entry(surface.id.clone())
                .and_modify(|existing| {
                    for file in &surface.files {
                        if !existing.files.contains(file) {
                            existing.files.push(file.clone());
                        }
                    }
                    existing.confidence = existing.confidence.max(surface.confidence);
                })
                .or_insert(surface);
        }
    }

    let surfaces = surfaces_by_id.into_values().collect::<Vec<_>>();
    let files_touched = changed_files
        .iter()
        .map(|file| file.path.clone())
        .collect::<Vec<_>>();
    let semantic_summary = if surfaces.is_empty() {
        format!("Changes touch {}.", files_touched.join(", "))
    } else {
        format!(
            "Changes touch {}.",
            surfaces
                .iter()
                .map(|surface| surface.label.as_str())
                .collect::<Vec<_>>()
                .join(", ")
        )
    };

    DiffFingerprint {
        id: stable_id([worktree_id, &hash_hex(&normalized)]),
        repo_id: repo_id.to_string(),
        worktree_id: worktree_id.to_string(),
        diff_hash: hash_hex(&normalized),
        files_touched,
        changed_files,
        symbols: symbols.into_iter().collect(),
        surfaces,
        semantic_summary,
        confidence: 0.76,
    }
}

fn match_guardrails(
    rules: &[GuardrailRule],
    worktree_id: &str,
    diff: &str,
    changed_files: &[ChangedFile],
) -> Vec<GuardrailViolation> {
    let diff_lower = diff.to_lowercase();
    rules
        .iter()
        .filter_map(|rule| {
            let pattern = rule.pattern.to_lowercase();
            if !diff_lower.contains(&pattern) {
                return None;
            }
            let files = changed_files
                .iter()
                .filter(|file| {
                    rule.paths.is_empty()
                        || rule
                            .paths
                            .iter()
                            .any(|rule_path| file.path.contains(rule_path))
                })
                .map(|file| file.path.clone())
                .collect::<Vec<_>>();
            if files.is_empty() {
                return None;
            }
            Some(GuardrailViolation {
                id: stable_id(["guardrail", &rule.id, worktree_id]),
                rule_id: rule.id.clone(),
                title: rule.title.clone(),
                severity: rule.severity.clone(),
                worktree_id: worktree_id.to_string(),
                files,
                evidence: vec![format!(
                    "Diff matched forbidden pattern `{}`.",
                    rule.pattern
                )],
                recommendation: rule.recommendation.clone(),
            })
        })
        .collect()
}

fn detect_conflicts(
    repo_id: &str,
    fingerprints: &[DiffFingerprint],
    context: &MonitorContext,
) -> Vec<KiroConflict> {
    let mut conflicts = Vec::new();
    for i in 0..fingerprints.len() {
        for j in (i + 1)..fingerprints.len() {
            if let Some(conflict) =
                compare_fingerprints(repo_id, &fingerprints[i], &fingerprints[j])
            {
                conflicts.push(conflict);
            }
        }
    }
    conflicts.extend(intent_conflicts(repo_id, context));
    conflicts
}

fn compare_fingerprints(
    repo_id: &str,
    left: &DiffFingerprint,
    right: &DiffFingerprint,
) -> Option<KiroConflict> {
    let shared_files = intersection(&left.files_touched, &right.files_touched);
    let left_surface_labels = left
        .surfaces
        .iter()
        .map(|surface| surface.label.clone())
        .collect::<Vec<_>>();
    let right_surface_labels = right
        .surfaces
        .iter()
        .map(|surface| surface.label.clone())
        .collect::<Vec<_>>();
    let shared_surfaces = intersection(&left_surface_labels, &right_surface_labels);
    let shared_symbols = intersection(&left.symbols, &right.symbols);
    if shared_files.is_empty() && shared_surfaces.is_empty() && shared_symbols.is_empty() {
        return None;
    }

    let all_shared_surface_records = left
        .surfaces
        .iter()
        .chain(right.surfaces.iter())
        .filter(|surface| shared_surfaces.contains(&surface.label))
        .collect::<Vec<_>>();
    let destructive = left
        .changed_files
        .iter()
        .chain(right.changed_files.iter())
        .any(|file| {
            shared_files.contains(&file.path)
                && (file.status == "deleted" || file.deletions >= 20)
        });
    let conflict_type = conflict_type_for(&all_shared_surface_records, destructive);
    let high_contract = all_shared_surface_records.iter().any(|surface| {
        matches!(
            surface.kind,
            SurfaceKind::Schema
                | SurfaceKind::Migration
                | SurfaceKind::Model
                | SurfaceKind::Api
                | SurfaceKind::Type
                | SurfaceKind::Dto
        )
    });
    let risk = if destructive || high_contract {
        "high"
    } else if !shared_files.is_empty() || !shared_symbols.is_empty() {
        "medium"
    } else {
        "low"
    };
    let primary = shared_surfaces
        .first()
        .or_else(|| shared_files.first())
        .or_else(|| shared_symbols.first())
        .cloned()
        .unwrap_or_else(|| "shared surface".to_string());
    let mut evidence = Vec::new();
    evidence.extend(
        shared_surfaces
            .iter()
            .map(|surface| format!("Both worktrees touch {surface}.")),
    );
    evidence.extend(
        shared_files
            .iter()
            .map(|file| format!("Both worktrees changed {file}.")),
    );
    evidence.extend(
        shared_symbols
            .iter()
            .map(|symbol| format!("Both worktrees changed symbol {symbol}.")),
    );
    if destructive {
        evidence.push("At least one diff deletes files or removes a broad block.".to_string());
    }

    Some(KiroConflict {
        id: stable_id([
            "conflict",
            repo_id,
            &left.worktree_id,
            &right.worktree_id,
            &primary,
        ]),
        risk: risk.to_string(),
        conflict_type,
        title: format!("{primary} overlap"),
        summary: format!("Two worktrees are changing {primary}."),
        affected_worktree_ids: vec![left.worktree_id.clone(), right.worktree_id.clone()],
        affected_surfaces: shared_surfaces,
        affected_files: shared_files,
        evidence,
        pause: risk == "high" || risk == "medium",
        confidence: 0.78,
    })
}

fn intent_conflicts(repo_id: &str, context: &MonitorContext) -> Vec<KiroConflict> {
    let mut conflicts = Vec::new();
    for i in 0..context.sessions.len() {
        for j in (i + 1)..context.sessions.len() {
            let left = &context.sessions[i];
            let right = &context.sessions[j];
            let Some(left_plan) = left.current_plan.as_ref() else {
                continue;
            };
            let Some(right_plan) = right.current_plan.as_ref() else {
                continue;
            };
            if left_plan.trim().is_empty() || right_plan.trim().is_empty() {
                continue;
            }
            if normalized_task_key(left_plan) != normalized_task_key(right_plan) {
                continue;
            }
            let left_worktree = left.worktree_id.clone().unwrap_or_else(|| left.id.clone());
            let right_worktree = right
                .worktree_id
                .clone()
                .unwrap_or_else(|| right.id.clone());
            conflicts.push(KiroConflict {
                id: stable_id(["intent", repo_id, &left.id, &right.id]),
                risk: "medium".to_string(),
                conflict_type: "intent".to_string(),
                title: "Task intent overlap".to_string(),
                summary: format!(
                    "{} and {} appear to be working on the same task.",
                    left.display_name, right.display_name
                ),
                affected_worktree_ids: vec![left_worktree, right_worktree],
                affected_surfaces: vec!["task intent".to_string()],
                affected_files: Vec::new(),
                evidence: vec![format!(
                    "Both plans normalize to `{}`.",
                    normalized_task_key(left_plan)
                )],
                pause: true,
                confidence: 0.66,
            });
        }
    }
    conflicts
}

fn conflicts_from_guardrails(
    repo_id: &str,
    violations: &[GuardrailViolation],
) -> Vec<KiroConflict> {
    violations
        .iter()
        .map(|violation| KiroConflict {
            id: stable_id(["guardrail-conflict", repo_id, &violation.id]),
            risk: normalize_risk(&violation.severity).to_string(),
            conflict_type: if violation.rule_id.contains("stack")
                || violation.rule_id.contains("postgres")
            {
                "stack".to_string()
            } else {
                "guardrail".to_string()
            },
            title: violation.title.clone(),
            summary: violation.recommendation.clone(),
            affected_worktree_ids: vec![violation.worktree_id.clone()],
            affected_surfaces: vec![violation.title.clone()],
            affected_files: violation.files.clone(),
            evidence: violation.evidence.clone(),
            pause: normalize_risk(&violation.severity) != "low",
            confidence: 0.82,
        })
        .collect()
}

fn destructive_conflicts_for_fingerprint(
    repo_id: &str,
    fingerprint: &DiffFingerprint,
    diff: &str,
) -> Vec<KiroConflict> {
    let destructive_files = fingerprint
        .changed_files
        .iter()
        .filter(|file| file.status == "deleted" || file.deletions >= 20)
        .map(|file| file.path.clone())
        .collect::<Vec<_>>();
    let lower_diff = diff.to_lowercase();
    let risky_patterns = [
        ("rm -rf", "Diff introduces a recursive removal command."),
        ("git reset --hard", "Diff introduces a hard reset command."),
        ("drop table", "Diff introduces a database table drop."),
        ("prisma migrate reset", "Diff introduces a database reset command."),
        ("git rebase", "Diff introduces a rebase command."),
    ];
    let matched_patterns = risky_patterns
        .iter()
        .filter(|(pattern, _)| lower_diff.contains(pattern))
        .map(|(_, evidence)| (*evidence).to_string())
        .collect::<Vec<_>>();
    if destructive_files.is_empty() && matched_patterns.is_empty() {
        return Vec::new();
    }
    let affected_files = if destructive_files.is_empty() {
        fingerprint.files_touched.clone()
    } else {
        destructive_files
    };
    let affected_surfaces = surface_labels_or_files(fingerprint, &affected_files);
    let mut evidence = affected_files
        .iter()
        .map(|file| format!("{file} was deleted or had a broad removal."))
        .collect::<Vec<_>>();
    evidence.extend(matched_patterns);
    vec![KiroConflict {
        id: stable_id([
            "destructive",
            repo_id,
            &fingerprint.worktree_id,
            &fingerprint.diff_hash,
        ]),
        risk: "high".to_string(),
        conflict_type: "destructive".to_string(),
        title: "Destructive local change".to_string(),
        summary: "A worktree contains deletes, broad removals, or risky commands.".to_string(),
        affected_worktree_ids: vec![fingerprint.worktree_id.clone()],
        affected_surfaces,
        affected_files,
        evidence,
        pause: true,
        confidence: 0.8,
    }]
}

fn repo_state_conflicts(
    repo_id: &str,
    worktree: &WorktreeSnapshot,
    changed_files: &[String],
    surface_labels: &[String],
) -> Result<Vec<KiroConflict>> {
    let worktree_path = Path::new(&worktree.path);
    let git_dir = git_dir(worktree_path)?;
    let mut conflicts = Vec::new();
    let state_checks = [
        (
            git_dir.join("rebase-merge"),
            "Rebase in progress",
            "Git reports a rebase in progress in this worktree.",
        ),
        (
            git_dir.join("rebase-apply"),
            "Rebase in progress",
            "Git reports a rebase in progress in this worktree.",
        ),
        (
            git_dir.join("MERGE_HEAD"),
            "Merge in progress",
            "Git reports a merge in progress in this worktree.",
        ),
        (
            git_dir.join("CHERRY_PICK_HEAD"),
            "Cherry-pick in progress",
            "Git reports a cherry-pick in progress in this worktree.",
        ),
    ];
    let mut seen_titles = BTreeSet::new();
    for (path, title, evidence) in state_checks {
        if !path.exists() || !seen_titles.insert(title) {
            continue;
        }
        conflicts.push(repo_state_conflict(
            repo_id,
            worktree,
            title,
            evidence,
            changed_files,
            surface_labels,
        ));
    }
    if worktree.branch.as_deref().is_some_and(is_protected_branch)
        && !changed_files.is_empty()
    {
        conflicts.push(repo_state_conflict(
            repo_id,
            worktree,
            "Protected branch has local changes",
            "Local changes are present on a protected branch.",
            changed_files,
            surface_labels,
        ));
    }
    Ok(conflicts)
}

fn repo_state_conflict(
    repo_id: &str,
    worktree: &WorktreeSnapshot,
    title: &str,
    evidence: &str,
    changed_files: &[String],
    surface_labels: &[String],
) -> KiroConflict {
    let affected_files = changed_files.to_vec();
    let affected_surfaces = if surface_labels.is_empty() {
        if affected_files.is_empty() {
            vec!["repo state".to_string()]
        } else {
            affected_files.clone()
        }
    } else {
        surface_labels.to_vec()
    };
    KiroConflict {
        id: stable_id(["repo-state", repo_id, &worktree.id, title]),
        risk: "high".to_string(),
        conflict_type: "destructive".to_string(),
        title: title.to_string(),
        summary: format!("{title}; checkpoint before continuing."),
        affected_worktree_ids: vec![worktree.id.clone()],
        affected_surfaces,
        affected_files,
        evidence: vec![evidence.to_string()],
        pause: true,
        confidence: 0.76,
    }
}

fn surface_labels_or_files(fingerprint: &DiffFingerprint, affected_files: &[String]) -> Vec<String> {
    let labels = fingerprint
        .surfaces
        .iter()
        .map(|surface| surface.label.clone())
        .collect::<Vec<_>>();
    if labels.is_empty() {
        affected_files.to_vec()
    } else {
        labels
    }
}

fn create_blast_radius_events(
    repo_id: &str,
    conflicts: &[KiroConflict],
    violations: &[GuardrailViolation],
) -> Vec<BlastRadiusEvent> {
    let mut events = conflicts
        .iter()
        .map(|conflict| BlastRadiusEvent {
            id: stable_id(["blast", repo_id, &conflict.id]),
            risk: conflict.risk.clone(),
            summary: conflict.summary.clone(),
            files: conflict.affected_files.clone(),
            surfaces: conflict.affected_surfaces.clone(),
            guardrail_violation_ids: violations
                .iter()
                .filter(|violation| {
                    violation
                        .files
                        .iter()
                        .any(|file| conflict.affected_files.contains(file))
                })
                .map(|violation| violation.id.clone())
                .collect(),
            conflict_ids: vec![conflict.id.clone()],
            recommendation:
                "Pause affected agents and agree one owner or compatibility shape before commit."
                    .to_string(),
        })
        .collect::<Vec<_>>();
    if events.is_empty() && !violations.is_empty() {
        events.extend(violations.iter().map(|violation| BlastRadiusEvent {
            id: stable_id(["blast", repo_id, &violation.id]),
            risk: violation.severity.clone(),
            summary: violation.title.clone(),
            files: violation.files.clone(),
            surfaces: vec![violation.title.clone()],
            guardrail_violation_ids: vec![violation.id.clone()],
            conflict_ids: Vec::new(),
            recommendation: violation.recommendation.clone(),
        }));
    }
    events
}

fn conflict_type_for(surfaces: &[&ContractSurface], destructive: bool) -> String {
    if destructive {
        return "destructive".to_string();
    }
    if surfaces.iter().any(|surface| {
        matches!(
            surface.kind,
            SurfaceKind::Schema | SurfaceKind::Model | SurfaceKind::Migration
        )
    }) {
        return "schema".to_string();
    }
    if surfaces
        .iter()
        .any(|surface| surface.kind == SurfaceKind::Api)
    {
        return "api".to_string();
    }
    if surfaces
        .iter()
        .any(|surface| surface.kind == SurfaceKind::Component)
    {
        return "component".to_string();
    }
    if surfaces
        .iter()
        .any(|surface| matches!(surface.kind, SurfaceKind::Type | SurfaceKind::Dto))
    {
        return "type".to_string();
    }
    "file".to_string()
}

fn classify_path(path: &str) -> SurfaceKind {
    let lower = path.to_lowercase();
    if lower.contains("migration") {
        SurfaceKind::Migration
    } else if lower.contains("schema")
        || lower.contains("model")
        || lower.contains("entity")
        || lower.contains("drizzle")
        || lower.contains("prisma")
    {
        SurfaceKind::Schema
    } else if lower.contains("route")
        || lower.contains("api")
        || lower.contains("controller")
        || lower.contains("handler")
        || lower.contains("endpoint")
    {
        SurfaceKind::Api
    } else if lower.contains("dto") || lower.contains("request") || lower.contains("response") {
        SurfaceKind::Dto
    } else if lower.contains("component") || lower.ends_with(".tsx") || lower.ends_with(".jsx") {
        SurfaceKind::Component
    } else if lower.contains("types") || lower.contains("interfaces") || lower.contains("contract")
    {
        SurfaceKind::Type
    } else if lower.contains("test") || lower.contains("spec") {
        SurfaceKind::Test
    } else if lower.contains("util") || lower.contains("helper") {
        SurfaceKind::Utility
    } else {
        SurfaceKind::Unknown
    }
}

fn choose_kind(name: &str, path_kind: &SurfaceKind, path: &str) -> SurfaceKind {
    let lower = path.to_lowercase();
    if name.ends_with("Props") || lower.contains("component") {
        SurfaceKind::Component
    } else if name.ends_with("Dto") || *path_kind == SurfaceKind::Dto {
        SurfaceKind::Dto
    } else if *path_kind != SurfaceKind::Unknown {
        path_kind.clone()
    } else {
        SurfaceKind::Type
    }
}

fn label_for(name: &str, kind: &SurfaceKind) -> String {
    let base = name
        .trim_end_matches("Props")
        .trim_end_matches("Controller")
        .trim_end_matches("Dto")
        .trim_end_matches("DTO");
    match kind {
        SurfaceKind::Schema | SurfaceKind::Model | SurfaceKind::Migration => {
            format!("{base} model")
        }
        SurfaceKind::Api => format!("{base} API"),
        SurfaceKind::Dto => format!("{base} DTO"),
        SurfaceKind::Component => format!("{base} component"),
        SurfaceKind::Type => format!("{base} type"),
        SurfaceKind::Test => format!("{base} test"),
        SurfaceKind::Utility => format!("{base} utility"),
        SurfaceKind::Unknown => format!("{base} unknown"),
    }
}

fn extract_symbols(content: &str) -> Vec<String> {
    let mut symbols = BTreeSet::new();
    for surface in extract_surfaces_from_content("unknown.ts", content) {
        let symbol = surface
            .label
            .split_whitespace()
            .next()
            .unwrap_or_default()
            .to_string();
        if !symbol.is_empty() {
            symbols.insert(symbol);
        }
    }
    symbols.into_iter().collect()
}

fn normalize_symbol_name(name: &str) -> String {
    if name.contains('_') || name.contains('-') {
        name.split(['_', '-'])
            .filter(|part| !part.is_empty())
            .map(|part| {
                let mut chars = part.chars();
                match chars.next() {
                    Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                    None => String::new(),
                }
            })
            .collect::<Vec<_>>()
            .join("")
    } else if let Some(prefix) = name.strip_suffix("DTO") {
        format!("{prefix}Dto")
    } else {
        name.to_string()
    }
}

fn fallback_name_from_path(path: &str) -> String {
    Path::new(path)
        .file_stem()
        .and_then(|value| value.to_str())
        .map(normalize_symbol_name)
        .unwrap_or_else(|| "Unknown".to_string())
}

fn path_kind_label(kind: &SurfaceKind) -> &'static str {
    match kind {
        SurfaceKind::Schema => "schema",
        SurfaceKind::Api => "api",
        SurfaceKind::Type => "type",
        SurfaceKind::Component => "component",
        SurfaceKind::Migration => "migration",
        SurfaceKind::Model => "model",
        SurfaceKind::Dto => "dto",
        SurfaceKind::Test => "test",
        SurfaceKind::Utility => "utility",
        SurfaceKind::Unknown => "unknown",
    }
}

fn normalized_task_key(plan: &str) -> String {
    let lower = plan.to_lowercase();
    let issue_regex = Regex::new(r"#?\b([a-z]+-\d+|\d{2,})\b").expect("valid regex");
    if let Some(capture) = issue_regex.captures(&lower) {
        return capture.get(1).unwrap().as_str().to_string();
    }
    lower
        .split_whitespace()
        .filter(|word| word.len() > 3)
        .take(6)
        .collect::<Vec<_>>()
        .join(" ")
}

fn diff_blocks(diff: &str) -> Vec<String> {
    let mut blocks = Vec::new();
    let mut current = Vec::new();
    for line in diff.replace("\r\n", "\n").lines() {
        if line.starts_with("diff --git ") && !current.is_empty() {
            blocks.push(current.join("\n"));
            current.clear();
        }
        current.push(line.to_string());
    }
    if !current.is_empty() {
        blocks.push(current.join("\n"));
    }
    blocks
}

fn parse_diff_path(line: &str) -> Option<String> {
    let mut parts = line.split_whitespace();
    parts.next()?;
    parts.next()?;
    let _left = parts.next()?;
    let right = parts.next()?;
    Some(right.trim_start_matches("b/").to_string())
}

fn filter_ignored_diff(repo_root: &Path, diff: &str) -> String {
    let rules = read_ignore_rules(repo_root);
    diff_blocks(diff)
        .into_iter()
        .filter(|block| {
            let path = block
                .lines()
                .next()
                .and_then(parse_diff_path)
                .unwrap_or_default();
            !is_ignored_path(&path, &rules)
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn read_ignore_rules(repo_root: &Path) -> Vec<String> {
    fs::read_to_string(repo_root.join(".tempoignore"))
        .unwrap_or_default()
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.starts_with('#'))
        .map(ToString::to_string)
        .collect()
}

fn is_ignored_path(path: &str, rules: &[String]) -> bool {
    let normalized = path.replace('\\', "/").trim_start_matches("./").to_string();
    let segments = normalized.split('/').collect::<Vec<_>>();
    let basename = segments.last().copied().unwrap_or(normalized.as_str());
    let ignored_segment = [
        ".git",
        ".tempo",
        ".kiro",
        "node_modules",
        ".next",
        "dist",
        "build",
        "coverage",
        ".turbo",
        ".cache",
        "data",
    ]
    .iter()
    .any(|segment| segments.contains(segment));
    if ignored_segment || basename == "next-env.d.ts" || basename == ".DS_Store" {
        return true;
    }
    if basename.ends_with(".tsbuildinfo")
        || basename.ends_with(".sqlite")
        || basename.contains(".sqlite-")
        || basename.ends_with(".log")
    {
        return true;
    }
    rules
        .iter()
        .any(|rule| ignore_rule_matches(&normalized, rule))
}

enum ScannableFile {
    Text(String),
    Omitted(String),
}

fn read_scannable_file(path: &Path) -> Result<ScannableFile> {
    let metadata = fs::metadata(path)?;
    if metadata.len() > MAX_FILE_BYTES {
        return Ok(ScannableFile::Omitted(format!(
            "file exceeds {} byte scan cap",
            MAX_FILE_BYTES
        )));
    }
    let bytes = fs::read(path)?;
    if bytes.contains(&0) {
        return Ok(ScannableFile::Omitted("binary file".to_string()));
    }
    match String::from_utf8(bytes) {
        Ok(content) => Ok(ScannableFile::Text(content)),
        Err(_) => Ok(ScannableFile::Omitted("non-utf8 file".to_string())),
    }
}

fn git_dir(worktree_path: &Path) -> Result<PathBuf> {
    let output = git_output(worktree_path, ["rev-parse", "--git-dir"])?;
    let path = PathBuf::from(output.trim());
    if path.is_absolute() {
        Ok(path)
    } else {
        Ok(worktree_path.join(path))
    }
}

fn is_protected_branch(branch: &str) -> bool {
    matches!(branch, "main" | "master" | "production" | "prod" | "release")
}

fn normalize_risk(value: &str) -> &'static str {
    match value {
        "high" => "high",
        "medium" => "medium",
        _ => "low",
    }
}

fn parse_status_path(raw_path: &str) -> String {
    raw_path
        .rsplit_once(" -> ")
        .map(|(_, target)| target)
        .unwrap_or(raw_path)
        .trim()
        .trim_matches('"')
        .to_string()
}

fn ignore_rule_matches(path: &str, rule: &str) -> bool {
    let rule = rule.trim_start_matches("./");
    if let Some(dir) = rule.strip_suffix('/') {
        return path == dir || path.starts_with(&format!("{dir}/"));
    }
    if rule.contains('/') {
        path == rule || path.starts_with(&format!("{rule}/"))
    } else {
        path.split('/').any(|segment| segment == rule)
    }
}

fn intersection(left: &[String], right: &[String]) -> Vec<String> {
    let right = right.iter().collect::<BTreeSet<_>>();
    left.iter()
        .filter(|item| right.contains(item))
        .cloned()
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect()
}

fn slug(value: &str) -> String {
    value
        .to_lowercase()
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

fn stable_id<const N: usize>(parts: [&str; N]) -> String {
    hash_hex(&parts.join(":"))[..16].to_string()
}

fn hash_hex(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn demo_auth_overlap_fixture() -> MonitorScanResult {
    let repo_id = "demo-repo".to_string();
    let wt_codex = "wt-codex-auth".to_string();
    let wt_claude = "wt-claude-oauth".to_string();
    let left_surface = ContractSurface {
        id: "authprofile-model".to_string(),
        label: "AuthProfile model".to_string(),
        kind: SurfaceKind::Schema,
        files: vec!["convex/schema.ts".to_string()],
        confidence: 0.86,
        evidence: vec!["schema path".to_string()],
    };
    let right_surface = left_surface.clone();
    let fingerprints = vec![
        DiffFingerprint {
            id: "fp-codex-auth".to_string(),
            repo_id: repo_id.clone(),
            worktree_id: wt_codex.clone(),
            diff_hash: "demo-a".to_string(),
            files_touched: vec!["convex/schema.ts".to_string()],
            changed_files: vec![ChangedFile {
                path: "convex/schema.ts".to_string(),
                status: "modified".to_string(),
                additions: 8,
                deletions: 2,
            }],
            symbols: vec!["AuthProfile".to_string()],
            surfaces: vec![left_surface],
            semantic_summary: "Codex edits AuthProfile schema.".to_string(),
            confidence: 0.86,
        },
        DiffFingerprint {
            id: "fp-claude-oauth".to_string(),
            repo_id: repo_id.clone(),
            worktree_id: wt_claude.clone(),
            diff_hash: "demo-b".to_string(),
            files_touched: vec!["convex/schema.ts".to_string()],
            changed_files: vec![ChangedFile {
                path: "convex/schema.ts".to_string(),
                status: "modified".to_string(),
                additions: 5,
                deletions: 1,
            }],
            symbols: vec!["AuthProfile".to_string()],
            surfaces: vec![right_surface],
            semantic_summary: "Claude edits OAuth profile fields.".to_string(),
            confidence: 0.84,
        },
    ];
    let guardrail_violations = vec![GuardrailViolation {
        id: "gv-postgres-only".to_string(),
        rule_id: "postgres-only".to_string(),
        title: "Do not introduce MongoDB".to_string(),
        severity: "high".to_string(),
        worktree_id: wt_claude.clone(),
        files: vec!["package.json".to_string()],
        evidence: vec!["Diff matched forbidden pattern `mongodb`.".to_string()],
        recommendation: "Use Postgres-backed storage only.".to_string(),
    }];
    let mut conflicts = detect_conflicts(
        &repo_id,
        &fingerprints,
        &MonitorContext {
            guardrails: vec![],
            sessions: vec![],
        },
    );
    let blast_radius_events =
        create_blast_radius_events(&repo_id, &conflicts, &guardrail_violations);
    MonitorScanResult {
        repo_id,
        repo_root: "/demo/kiro".to_string(),
        worktrees: vec![
            WorktreeSnapshot {
                id: wt_codex,
                path: "/demo/kiro-agent-a".to_string(),
                branch: Some("agent-a".to_string()),
                head_sha: Some("demo".to_string()),
                dirty: true,
                detached: false,
            },
            WorktreeSnapshot {
                id: wt_claude,
                path: "/demo/kiro-agent-b".to_string(),
                branch: Some("agent-b".to_string()),
                head_sha: Some("demo".to_string()),
                dirty: true,
                detached: false,
            },
        ],
        fingerprints,
        guardrail_violations,
        conflicts: {
            if conflicts.len() > 1 {
                conflicts.truncate(1);
            }
            conflicts
        },
        blast_radius_events,
        degraded: false,
    }
}
