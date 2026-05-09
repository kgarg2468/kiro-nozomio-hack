import AppKit
import Foundation

final class KiroTaskStore: ObservableObject {
    @Published var tasks: [KiroTask]
    @Published var agents: [KiroAgent]
    @Published var citations: [KiroCitation]
    @Published var guardrail: Guardrail
    @Published var readiness: PRReadiness
    @Published var selection: SidebarItem
    @Published var dashboardURL: URL

    init(
        tasks: [KiroTask],
        agents: [KiroAgent],
        citations: [KiroCitation],
        guardrail: Guardrail,
        readiness: PRReadiness,
        selection: SidebarItem,
        dashboardURL: URL = URL(string: "http://localhost:3000")!
    ) {
        self.tasks = tasks
        self.agents = agents
        self.citations = citations
        self.guardrail = guardrail
        self.readiness = readiness
        self.selection = selection
        self.dashboardURL = dashboardURL
    }

    static func fixture() -> KiroTaskStore {
        let tasks = [
            KiroTask(
                id: "task-142",
                title: "Fix notification webhook retry hang",
                issue: "#142",
                owner: "Marcus Chen",
                engineer: "Sam Rivera",
                agentID: "agent-codex",
                status: .blocked,
                progress: 0.68,
                affectedFiles: [
                    "notifications/webhook_handler.py",
                    "tests/notifications/test_retry_backoff.py"
                ],
                tests: [
                    "test_retry_backoff.py",
                    "test_webhook_handler.py"
                ]
            ),
            KiroTask(
                id: "task-oauth-fields",
                title: "OAuth profile fields",
                issue: "#156",
                owner: "Alice Morgan",
                engineer: "Alice Morgan",
                agentID: "agent-kiro",
                status: .inProgress,
                progress: 0.34,
                affectedFiles: ["auth/user_profile.ts", "auth/oauth_schema.ts"],
                tests: ["test_oauth_profile.ts"]
            ),
            KiroTask(
                id: "task-readiness",
                title: "PR readiness packet",
                issue: "#142",
                owner: "Marcus Chen",
                engineer: "Sam Rivera",
                agentID: "agent-kiro",
                status: .ready,
                progress: 0.92,
                affectedFiles: ["notifications/webhook_handler.py"],
                tests: ["test_retry_backoff.py"]
            )
        ]

        let agents = [
            KiroAgent(id: "agent-codex", name: "Codex Pair", role: "Coding agent", status: .paused),
            KiroAgent(id: "agent-kiro", name: "Kiro Guide", role: "Onboarding agent", status: .working)
        ]

        let citations = [
            KiroCitation(
                id: "slack-async-decision",
                source: "Slack #engineering",
                confidence: .decided,
                summary: "Marcus and Alice agreed notification retries must use async backoff so workers do not block the event loop."
            ),
            KiroCitation(
                id: "notion-notifications-v2",
                source: "Notion notifications-v2",
                confidence: .decided,
                summary: "Notification handlers own retry scheduling, idempotency keys, and exponential backoff for transient provider failures."
            ),
            KiroCitation(
                id: "nia-tests-path",
                source: "Nia code convention",
                confidence: .convention,
                summary: "Retry tests live under tests/notifications with provider fixtures."
            )
        ]

        return KiroTaskStore(
            tasks: tasks,
            agents: agents,
            citations: citations,
            guardrail: Guardrail(
                id: "guard-async-sleep",
                title: "Async workers must not block retry backoff",
                detail: "Codex is paused because the proposed wait blocks async retry workers. Replace it with bounded async backoff before PR readiness.",
                badCode: "time.sleep(backoff_seconds)",
                fixCode: "await asyncio.sleep(min(backoff_seconds, MAX_BACKOFF_SECONDS))",
                isBlocking: true
            ),
            readiness: PRReadiness(
                score: 92,
                verdict: "Low risk after guardrail fix",
                recommendation: "Route review to Marcus and include the retry policy decision trail.",
                isReady: false
            ),
            selection: .task("task-142")
        )
    }

    var selectedTask: KiroTask {
        switch selection {
        case .task(let id):
            tasks.first { $0.id == id } ?? tasks[0]
        case .agent, .readiness:
            tasks[0]
        }
    }

    var primaryAgent: KiroAgent {
        agents.first { $0.id == selectedTask.agentID } ?? agents[0]
    }

    var activeTaskCount: Int {
        tasks.filter { $0.status == .inProgress || $0.status == .blocked }.count
    }

    var blockedAgentCount: Int {
        agents.filter { $0.status == .paused }.count
    }

    var menuBarSymbol: String {
        blockedAgentCount > 0 ? "exclamationmark.triangle.fill" : "checkmark.circle.fill"
    }

    func togglePrimaryAgentPause() {
        updateAgent(id: primaryAgent.id) { agent in
            agent.status = agent.status == .paused ? .working : .paused
        }
        updateTask(id: selectedTask.id) { task in
            task.status = task.status == .blocked ? .inProgress : .blocked
        }
    }

    func markReady() {
        updateTask(id: selectedTask.id) { task in
            task.status = .ready
            task.progress = 0.92
        }
        updateAgent(id: primaryAgent.id) { agent in
            agent.status = .ready
        }
        readiness.isReady = true
        readiness.verdict = "Ready for Marcus review"
    }

    func assignSelectedTaskToCodex() {
        updateTask(id: selectedTask.id) { task in
            task.agentID = "agent-codex"
        }
    }

    func openDashboard() {
        NSWorkspace.shared.open(dashboardURL)
    }

    func isValidDashboardURL() -> Bool {
        dashboardURL.scheme?.hasPrefix("http") == true && dashboardURL.host != nil
    }

    private func updateTask(id: String, mutate: (inout KiroTask) -> Void) {
        guard let index = tasks.firstIndex(where: { $0.id == id }) else { return }
        mutate(&tasks[index])
    }

    private func updateAgent(id: String, mutate: (inout KiroAgent) -> Void) {
        guard let index = agents.firstIndex(where: { $0.id == id }) else { return }
        mutate(&agents[index])
    }
}
