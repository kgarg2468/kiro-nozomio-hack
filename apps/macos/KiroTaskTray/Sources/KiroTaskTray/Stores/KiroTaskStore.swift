import AppKit
import Foundation

@MainActor
final class KiroTaskStore: ObservableObject {
    @Published var tasks: [KiroTask]
    @Published var agents: [KiroAgent]
    @Published var employees: [KiroEmployee]
    @Published var citations: [KiroCitation]
    @Published var contextEvents: [ContextEvent]
    @Published var guardrail: Guardrail
    @Published var readiness: PRReadiness
    @Published var selection: SidebarItem
    @Published var dashboardURL: URL {
        didSet { UserDefaults.standard.set(dashboardURL.absoluteString, forKey: Self.dashboardURLKey) }
    }
    @Published var convexDeploymentURLString: String {
        didSet { UserDefaults.standard.set(convexDeploymentURLString, forKey: Self.convexURLKey) }
    }
    @Published var sourceMode: DataSourceMode
    @Published var lastRefresh: Date?
    @Published var loadError: String?
    @Published var isRefreshing = false

    init(
        tasks: [KiroTask],
        agents: [KiroAgent],
        employees: [KiroEmployee],
        citations: [KiroCitation],
        contextEvents: [ContextEvent],
        guardrail: Guardrail,
        readiness: PRReadiness,
        selection: SidebarItem,
        dashboardURL: URL = URL(string: UserDefaults.standard.string(forKey: KiroTaskStore.dashboardURLKey) ?? "http://localhost:3000")!,
        convexDeploymentURLString: String = UserDefaults.standard.string(forKey: KiroTaskStore.convexURLKey) ?? ProcessInfo.processInfo.environment["NEXT_PUBLIC_CONVEX_URL"] ?? "",
        sourceMode: DataSourceMode = .fixture
    ) {
        self.tasks = tasks
        self.agents = agents
        self.employees = employees
        self.citations = citations
        self.contextEvents = contextEvents
        self.guardrail = guardrail
        self.readiness = readiness
        self.selection = selection
        self.dashboardURL = dashboardURL
        self.convexDeploymentURLString = convexDeploymentURLString
        self.sourceMode = sourceMode
    }

    private static let dashboardURLKey = "KiroTaskTray.dashboardURL"
    private static let convexURLKey = "KiroTaskTray.convexDeploymentURL"

    static func fixture() -> KiroTaskStore {
        let employees = [
            KiroEmployee(
                id: "sam",
                name: "Sam Rivera",
                email: "sam@kiro.dev",
                role: "New backend engineer",
                github: "sam-rivera",
                status: "blocked",
                palette: 0
            ),
            KiroEmployee(
                id: "marcus",
                name: "Marcus Chen",
                email: "marcus@kiro.dev",
                role: "Notifications owner",
                github: "mchen",
                status: "active",
                palette: 1
            ),
            KiroEmployee(
                id: "alice",
                name: "Alice Morgan",
                email: "alice@kiro.dev",
                role: "Auth platform",
                github: "amorgan",
                status: "coding",
                palette: 2
            )
        ]

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
                whyMatched: [
                    "Localized notification worker change",
                    "Async Python retry path",
                    "Clear owner and tests"
                ],
                affectedFiles: [
                    "notifications/webhook_handler.py",
                    "tests/notifications/test_retry_backoff.py"
                ],
                tests: [
                    "test_retry_backoff.py",
                    "test_webhook_handler.py"
                ]
            )
        ]

        let agents = [
            KiroAgent(
                id: "agent-codex",
                kind: "codex",
                name: "Codex Pair",
                ownerEmployeeID: "sam",
                role: "Coding agent",
                currentPlan: "Patch webhook retry backoff without blocking the async worker.",
                status: .blocked,
                palette: 3
            ),
            KiroAgent(
                id: "agent-kiro",
                kind: "kiro",
                name: "Kiro Guide",
                ownerEmployeeID: "sam",
                role: "Onboarding agent",
                currentPlan: "Keep the decision trail and owner routing live while Codex works.",
                status: .working,
                palette: 4
            )
        ]

        let citations = [
            KiroCitation(
                id: "slack-async-decision",
                source: "slack",
                confidence: .decided,
                summary: "Marcus and Alice agreed notification retries must use async backoff so workers do not block the event loop."
            ),
            KiroCitation(
                id: "notion-notifications-v2",
                source: "notion",
                confidence: .decided,
                summary: "Notification handlers own retry scheduling, idempotency keys, and exponential backoff for transient provider failures."
            ),
            KiroCitation(
                id: "nia-tests-path",
                source: "nia",
                confidence: .convention,
                summary: "Retry tests live under tests/notifications with provider fixtures."
            )
        ]

        return KiroTaskStore(
            tasks: tasks,
            agents: agents,
            employees: employees,
            citations: citations,
            contextEvents: [
                ContextEvent(
                    id: "guardrail-paused-codex",
                    stage: "guardrail",
                    title: "Codex paused on async guardrail",
                    body: "Kiro matched the retry policy decision to the current patch and stopped the blocking sleep.",
                    citationIDs: ["slack-async-decision", "notion-notifications-v2"]
                )
            ],
            guardrail: Guardrail(
                id: "guard-async-sleep",
                title: "Async workers must not block retry backoff",
                detail: "Codex is blocked because the proposed wait blocks async retry workers. Replace it with bounded async backoff before PR readiness.",
                badCode: "time.sleep(backoff_seconds)",
                fixCode: "await asyncio.sleep(min(backoff_seconds, MAX_BACKOFF_SECONDS))",
                isBlocking: true
            ),
            readiness: PRReadiness(
                score: 72,
                verdict: "Blocked on retry guardrail",
                recommendation: "Fix the async wait, then route review to Marcus with the decision trail.",
                isReady: false,
                tests: ["test_retry_backoff.py", "test_webhook_handler.py"]
            ),
            selection: .agent("agent-codex"),
            dashboardURL: URL(string: "http://localhost:3000")!,
            convexDeploymentURLString: ""
        )
    }

    var selectedTask: KiroTask {
        switch selection {
        case .task(let id):
            return tasks.first { $0.id == id } ?? tasks[0]
        case .agent(let id):
            if let agent = agent(id: id),
               let task = tasks.first(where: { $0.agentID == agent.id }) {
                return task
            }
            return tasks[0]
        case .readiness:
            return tasks[0]
        }
    }

    var selectedAgent: KiroAgent {
        switch selection {
        case .agent(let id):
            return agent(id: id) ?? primaryAgent
        case .task, .readiness:
            return primaryAgent
        }
    }

    var primaryAgent: KiroAgent {
        agents.first { $0.id == selectedTask.agentID } ?? agents.first ?? KiroAgent(
            id: "agent-unknown",
            kind: "unknown",
            name: "No agent",
            ownerEmployeeID: "",
            role: "Unassigned",
            currentPlan: "No active plan.",
            status: .idle,
            palette: 0
        )
    }

    var activeTaskCount: Int {
        tasks.filter { $0.status == .inProgress || $0.status == .blocked }.count
    }

    var blockedAgentCount: Int {
        agents.filter { $0.status == .blocked }.count
    }

    var menuBarSymbol: String {
        blockedAgentCount > 0 ? "exclamationmark.triangle.fill" : "checkmark.circle.fill"
    }

    func employee(id: String) -> KiroEmployee? {
        employees.first { $0.id == id }
    }

    func agent(id: String) -> KiroAgent? {
        agents.first { $0.id == id }
    }

    func refreshFromConvexIfConfigured() async {
        guard let url = normalizedConvexURL() else {
            sourceMode = .fixture
            loadError = nil
            return
        }

        isRefreshing = true
        defer { isRefreshing = false }

        do {
            let state = try await ConvexDashboardClient(deploymentURL: url).fetchDashboardState()
            apply(state: state)
            sourceMode = .live
            loadError = nil
            lastRefresh = Date()
        } catch {
            sourceMode = .error
            loadError = error.localizedDescription
        }
    }

    func togglePrimaryAgentPause() {
        updateAgent(id: selectedAgent.id) { agent in
            agent.status = agent.status == .blocked ? .working : .blocked
        }
        if let task = tasks.first(where: { $0.agentID == selectedAgent.id }) {
            updateTask(id: task.id) { task in
                task.status = task.status == .blocked ? .inProgress : .blocked
            }
        }
    }

    func markReady() {
        updateTask(id: selectedTask.id) { task in
            task.status = .ready
            task.progress = max(task.progress, 0.92)
        }
        updateAgent(id: primaryAgent.id) { agent in
            agent.status = .ready
        }
        readiness.isReady = true
        readiness.score = max(readiness.score, 92)
        readiness.verdict = "Ready for owner review"
    }

    func assignSelectedTaskToCodex() {
        updateTask(id: selectedTask.id) { task in
            task.agentID = "agent-codex"
        }
        selection = .agent("agent-codex")
    }

    func openDashboard() {
        NSWorkspace.shared.open(dashboardURL)
    }

    func isValidDashboardURL() -> Bool {
        dashboardURL.scheme?.hasPrefix("http") == true && dashboardURL.host != nil
    }

    func isValidConvexURL() -> Bool {
        normalizedConvexURL() != nil || convexDeploymentURLString.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func normalizedConvexURL() -> URL? {
        let value = convexDeploymentURLString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty, let url = URL(string: value),
              url.scheme?.hasPrefix("http") == true,
              url.host != nil else {
            return nil
        }
        return url
    }

    private func apply(state: ConvexDashboardState) {
        let mappedEmployees = state.employees.map {
            KiroEmployee(
                id: $0.externalID,
                name: $0.name,
                email: $0.email,
                role: $0.role,
                github: $0.github,
                status: $0.status,
                palette: $0.palette
            )
        }
        if !mappedEmployees.isEmpty {
            employees = mappedEmployees
        }

        agents = state.agentSessions.map { session in
            let owner = employees.first { $0.id == session.ownerEmployeeExternalID }
            return KiroAgent(
                id: session.externalID,
                kind: session.kind,
                name: session.displayName,
                ownerEmployeeID: session.ownerEmployeeExternalID,
                role: owner?.role ?? "\(session.kind.capitalized) agent",
                currentPlan: session.currentPlan,
                status: session.status,
                palette: owner?.palette ?? abs(session.externalID.hashValue % 6)
            )
        }

        if let liveTask = state.task {
            let engineer = employees.first { $0.id == liveTask.matchedEmployeeExternalID }?.name ?? liveTask.matchedEmployeeExternalID
            let assignedAgent = agents.first { $0.ownerEmployeeID == liveTask.matchedEmployeeExternalID }?.id ?? agents.first?.id ?? "agent-unknown"
            let tests = state.readiness?.tests ?? readiness.tests
            tasks = [
                KiroTask(
                    id: liveTask.externalID,
                    title: liveTask.title,
                    issue: liveTask.issueID,
                    owner: liveTask.owner,
                    engineer: engineer,
                    agentID: assignedAgent,
                    status: liveTask.status,
                    progress: liveTask.progress,
                    whyMatched: liveTask.whyMatched,
                    affectedFiles: liveTask.files,
                    tests: tests
                )
            ]
            selection = .agent(assignedAgent)
        }

        citations = state.citations.map {
            KiroCitation(id: $0.externalID, source: $0.sourceType, confidence: $0.confidence, summary: $0.snippet)
        }

        contextEvents = state.contextEvents.map {
            ContextEvent(
                id: $0.externalID,
                stage: $0.stage,
                title: $0.title,
                body: $0.body,
                citationIDs: $0.citationExternalIDs
            )
        }

        if let liveGuardrail = state.guardrails.first(where: { $0.active }) ?? state.guardrails.first {
            guardrail = Guardrail(
                id: liveGuardrail.externalID,
                title: liveGuardrail.title,
                detail: liveGuardrail.rule,
                badCode: "blocking wait",
                fixCode: liveGuardrail.recommendation,
                isBlocking: liveGuardrail.severity == "blocking"
            )
        }

        if let liveReadiness = state.readiness {
            readiness = PRReadiness(
                score: liveReadiness.verdict == "ready" ? 92 : 72,
                verdict: liveReadiness.summary,
                recommendation: liveReadiness.recommendation,
                isReady: liveReadiness.verdict == "ready",
                tests: liveReadiness.tests
            )
        }
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
