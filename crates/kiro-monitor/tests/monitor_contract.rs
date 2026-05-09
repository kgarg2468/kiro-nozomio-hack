use std::fs;
use std::process::Command;

use kiro_monitor::{
    GuardrailRule, MonitorContext, SurfaceKind, cli_fixture, extract_changed_files_from_diff,
    extract_surfaces_from_content, normalize_diff, parse_status_porcelain,
    parse_worktree_porcelain, scan_repo,
};
use tempfile::TempDir;

#[test]
fn parses_git_worktree_porcelain() {
    let output = "\
worktree /repo/main
HEAD abc123
branch refs/heads/main

worktree /repo/agent-a
HEAD def456
branch refs/heads/agent-a

worktree /repo/detached
HEAD fedcba
detached
";

    let worktrees = parse_worktree_porcelain(output);

    assert_eq!(worktrees.len(), 3);
    assert_eq!(worktrees[0].path, "/repo/main");
    assert_eq!(worktrees[0].branch.as_deref(), Some("main"));
    assert_eq!(worktrees[2].branch, None);
    assert!(worktrees[2].detached);
}

#[test]
fn normalizes_diff_and_extracts_file_stats() {
    let diff = "\
diff --git a/src/db/schema.ts b/src/db/schema.ts
index 111..222 100644
--- a/src/db/schema.ts
+++ b/src/db/schema.ts
@@ -1,3 +1,4 @@
 export interface User {
-  name: string
+  displayName: string
+  profileUrl?: string
 }
diff --git a/src/old.ts b/src/old.ts
deleted file mode 100644
--- a/src/old.ts
+++ /dev/null
@@ -1 +0,0 @@
-export const old = true
";

    let normalized = normalize_diff(diff);
    assert!(!normalized.contains("index 111..222"));

    let files = extract_changed_files_from_diff(diff);
    assert_eq!(files.len(), 2);
    assert_eq!(files[0].path, "src/db/schema.ts");
    assert_eq!(files[0].status, "modified");
    assert_eq!(files[0].additions, 2);
    assert_eq!(files[0].deletions, 1);
    assert_eq!(files[1].status, "deleted");
}

#[test]
fn parses_status_porcelain_for_tracked_and_untracked_files() {
    let entries = parse_status_porcelain(
        "\
 M src/db/schema.ts
M  src/api/route.ts
?? src/new-contract.ts
D  src/old-api.ts
",
    );

    assert_eq!(
        entries
            .iter()
            .map(|entry| (entry.path.as_str(), entry.status.as_str()))
            .collect::<Vec<_>>(),
        vec![
            ("src/db/schema.ts", "modified"),
            ("src/api/route.ts", "modified"),
            ("src/new-contract.ts", "untracked"),
            ("src/old-api.ts", "deleted"),
        ]
    );
}

#[test]
fn extracts_contract_surfaces_from_paths_and_symbols() {
    let surfaces = extract_surfaces_from_content(
        "src/api/auth/schema.ts",
        "export interface OAuthProfile { id: string }\nexport type AuthToken = string\n",
    );

    assert!(surfaces.iter().any(|surface| {
        surface.label == "OAuthProfile model" && surface.kind == SurfaceKind::Schema
    }));
    assert!(surfaces.iter().any(|surface| {
        surface.label == "AuthToken model" && surface.kind == SurfaceKind::Schema
    }));
}

#[test]
fn fixture_returns_blocking_demo_conflict_with_guardrails() {
    let result = cli_fixture("demo-auth-overlap").expect("fixture should exist");

    assert_eq!(result.conflicts.len(), 1);
    assert_eq!(result.conflicts[0].risk, "high");
    assert!(result.conflicts[0].pause);
    assert!(
        result
            .guardrail_violations
            .iter()
            .any(|violation| { violation.rule_id == "postgres-only" })
    );
    assert_eq!(result.blast_radius_events.len(), 1);
}

#[test]
fn scan_repo_detects_two_worktrees_editing_same_schema() {
    let repo = TempRepo::new();
    repo.write(
        "src/db/schema.ts",
        "export interface User { name: string }\n",
    );
    repo.git(["add", "."]);
    repo.git(["commit", "-m", "initial"]);
    let agent_a = repo.add_worktree("agent-a");
    let agent_b = repo.add_worktree("agent-b");

    fs::write(
        agent_a.path().join("src/db/schema.ts"),
        "export interface User { displayName: string }\n",
    )
    .unwrap();
    fs::write(
        agent_b.path().join("src/db/schema.ts"),
        "export interface User { profileUrl?: string }\n",
    )
    .unwrap();

    let result = scan_repo(
        repo.path().to_str().unwrap(),
        MonitorContext {
            guardrails: vec![],
            sessions: vec![],
        },
    )
    .unwrap();

    assert_eq!(result.fingerprints.len(), 2);
    assert_eq!(result.conflicts.len(), 1);
    assert_eq!(result.conflicts[0].risk, "high");
    assert_eq!(result.conflicts[0].conflict_type, "schema");
}

#[test]
fn scan_repo_detects_untracked_schema_overlap() {
    let repo = TempRepo::new();
    repo.write("README.md", "initial\n");
    repo.git(["add", "."]);
    repo.git(["commit", "-m", "initial"]);
    let agent_a = repo.add_worktree("agent-untracked-a");
    let agent_b = repo.add_worktree("agent-untracked-b");

    fs::create_dir_all(agent_a.path().join("src/db")).unwrap();
    fs::create_dir_all(agent_b.path().join("src/db")).unwrap();
    fs::write(
        agent_a.path().join("src/db/schema.ts"),
        "export interface Account { id: string; plan: string }\n",
    )
    .unwrap();
    fs::write(
        agent_b.path().join("src/db/schema.ts"),
        "export interface Account { id: string; ownerId: string }\n",
    )
    .unwrap();

    let result = scan_repo(
        repo.path().to_str().unwrap(),
        MonitorContext {
            guardrails: vec![],
            sessions: vec![],
        },
    )
    .unwrap();

    assert_eq!(result.fingerprints.len(), 2);
    assert_eq!(result.conflicts.len(), 1);
    assert_eq!(result.conflicts[0].conflict_type, "schema");
    assert_eq!(
        result.conflicts[0].affected_files,
        vec!["src/db/schema.ts".to_string()]
    );
}

#[test]
fn scan_repo_detects_staged_only_schema_overlap() {
    let repo = TempRepo::new();
    repo.write(
        "src/db/schema.ts",
        "export interface User { name: string }\n",
    );
    repo.git(["add", "."]);
    repo.git(["commit", "-m", "initial"]);
    let agent_a = repo.add_worktree("agent-staged-a");
    let agent_b = repo.add_worktree("agent-staged-b");

    fs::write(
        agent_a.path().join("src/db/schema.ts"),
        "export interface User { displayName: string }\n",
    )
    .unwrap();
    fs::write(
        agent_b.path().join("src/db/schema.ts"),
        "export interface User { profileUrl?: string }\n",
    )
    .unwrap();
    run_git(agent_a.path(), ["add", "src/db/schema.ts"]);
    run_git(agent_b.path(), ["add", "src/db/schema.ts"]);

    let result = scan_repo(
        repo.path().to_str().unwrap(),
        MonitorContext {
            guardrails: vec![],
            sessions: vec![],
        },
    )
    .unwrap();

    assert_eq!(result.fingerprints.len(), 2);
    assert_eq!(result.conflicts[0].conflict_type, "schema");
}

#[test]
fn scan_repo_flags_standalone_destructive_delete() {
    let repo = TempRepo::new();
    repo.write("src/api/auth.ts", "export function login() { return true }\n");
    repo.git(["add", "."]);
    repo.git(["commit", "-m", "initial"]);
    let agent = repo.add_worktree("agent-delete");

    fs::remove_file(agent.path().join("src/api/auth.ts")).unwrap();

    let result = scan_repo(
        repo.path().to_str().unwrap(),
        MonitorContext {
            guardrails: vec![],
            sessions: vec![],
        },
    )
    .unwrap();

    let destructive = result
        .conflicts
        .iter()
        .find(|conflict| conflict.conflict_type == "destructive")
        .expect("delete should create standalone destructive conflict");
    assert_eq!(destructive.affected_files, vec!["src/api/auth.ts"]);
    assert!(destructive.pause);
}

#[test]
fn scan_repo_keeps_unrelated_delete_out_of_schema_overlap_type() {
    let repo = TempRepo::new();
    repo.write("src/api/brain.ts", "export function brain() { return true }\n");
    repo.git(["add", "."]);
    repo.git(["commit", "-m", "initial"]);
    let agent_a = repo.add_worktree("agent-schema-delete");
    let agent_b = repo.add_worktree("agent-schema-only");

    fs::create_dir_all(agent_a.path().join("src/db")).unwrap();
    fs::create_dir_all(agent_b.path().join("src/db")).unwrap();
    fs::write(
        agent_a.path().join("src/db/untracked_schema.ts"),
        "export interface Account { id: string; plan: string }\n",
    )
    .unwrap();
    fs::write(
        agent_b.path().join("src/db/untracked_schema.ts"),
        "export interface Account { id: string; ownerId: string }\n",
    )
    .unwrap();
    fs::remove_file(agent_a.path().join("src/api/brain.ts")).unwrap();

    let result = scan_repo(
        repo.path().to_str().unwrap(),
        MonitorContext {
            guardrails: vec![],
            sessions: vec![],
        },
    )
    .unwrap();

    let overlap = result
        .conflicts
        .iter()
        .find(|conflict| {
            conflict.affected_files == vec!["src/db/untracked_schema.ts"]
                && conflict.affected_worktree_ids.len() == 2
        })
        .expect("shared untracked schema should create a pairwise overlap");
    assert_eq!(overlap.conflict_type, "schema");
}

#[test]
fn scan_repo_flags_rebase_state() {
    let repo = TempRepo::new();
    repo.write("src/db/schema.ts", "export interface User { id: string }\n");
    repo.git(["add", "."]);
    repo.git(["commit", "-m", "initial"]);
    let agent = repo.add_worktree("agent-rebase");
    fs::write(
        agent.path().join("src/db/schema.ts"),
        "export interface User { id: string; email: string }\n",
    )
    .unwrap();

    let git_dir = git_output(agent.path(), ["rev-parse", "--git-dir"]);
    fs::create_dir_all(agent.path().join(git_dir.trim()).join("rebase-merge")).unwrap();

    let result = scan_repo(
        repo.path().to_str().unwrap(),
        MonitorContext {
            guardrails: vec![],
            sessions: vec![],
        },
    )
    .unwrap();

    assert!(
        result
            .conflicts
            .iter()
            .any(|conflict| conflict.title.contains("Rebase in progress"))
    );
}

#[test]
fn scan_repo_caps_oversized_untracked_file_content() {
    let repo = TempRepo::new();
    repo.write("README.md", "initial\n");
    repo.git(["add", "."]);
    repo.git(["commit", "-m", "initial"]);
    let agent = repo.add_worktree("agent-large");
    fs::create_dir_all(agent.path().join("src/db")).unwrap();
    fs::write(
        agent.path().join("src/db/schema.ts"),
        format!(
            "export interface Hidden {{ marker: string }}\n{}",
            "x".repeat(200_000)
        ),
    )
    .unwrap();

    let result = scan_repo(
        repo.path().to_str().unwrap(),
        MonitorContext {
            guardrails: vec![],
            sessions: vec![],
        },
    )
    .unwrap();

    let fingerprint = result
        .fingerprints
        .iter()
        .find(|fingerprint| fingerprint.files_touched == vec!["src/db/schema.ts"])
        .expect("oversized untracked file should still produce a file record");
    assert!(fingerprint.symbols.is_empty());
    assert!(fingerprint.semantic_summary.contains("schema model"));
}

#[test]
fn scan_repo_flags_forbidden_dependency_choices() {
    let repo = TempRepo::new();
    repo.write("package.json", "{\"dependencies\":{}}\n");
    repo.git(["add", "."]);
    repo.git(["commit", "-m", "initial"]);
    let agent = repo.add_worktree("agent-stack");

    fs::write(
        agent.path().join("package.json"),
        "{\"dependencies\":{\"mongodb\":\"latest\"}}\n",
    )
    .unwrap();

    let result = scan_repo(
        repo.path().to_str().unwrap(),
        MonitorContext {
            sessions: vec![],
            guardrails: vec![GuardrailRule {
                id: "postgres-only".to_string(),
                title: "Do not introduce MongoDB".to_string(),
                severity: "high".to_string(),
                pattern: "mongodb".to_string(),
                paths: vec!["package.json".to_string()],
                recommendation: "Use Postgres-backed storage only.".to_string(),
            }],
        },
    )
    .unwrap();

    assert_eq!(result.guardrail_violations.len(), 1);
    assert_eq!(result.guardrail_violations[0].rule_id, "postgres-only");
    assert!(
        result
            .conflicts
            .iter()
            .any(|conflict| conflict.affected_files == vec!["package.json"])
    );
}

struct TempRepo {
    dir: TempDir,
}

impl TempRepo {
    fn new() -> Self {
        let dir = tempfile::tempdir().unwrap();
        let repo = Self { dir };
        repo.git(["init"]);
        repo.git(["config", "user.email", "kiro@example.com"]);
        repo.git(["config", "user.name", "Kiro Test"]);
        repo
    }

    fn path(&self) -> &std::path::Path {
        self.dir.path()
    }

    fn write(&self, path: &str, content: &str) {
        let full_path = self.path().join(path);
        fs::create_dir_all(full_path.parent().unwrap()).unwrap();
        fs::write(full_path, content).unwrap();
    }

    fn git<const N: usize>(&self, args: [&str; N]) {
        run_git(self.path(), args);
    }

    fn add_worktree(&self, branch: &str) -> TempDir {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().to_str().unwrap().to_string();
        self.git(["worktree", "add", "-b", branch, &path]);
        dir
    }
}

fn run_git<const N: usize>(cwd: &std::path::Path, args: [&str; N]) {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "git failed\nstdout:\n{}\nstderr:\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
}

fn git_output<const N: usize>(cwd: &std::path::Path, args: [&str; N]) -> String {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "git failed\nstdout:\n{}\nstderr:\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    String::from_utf8_lossy(&output.stdout).to_string()
}
