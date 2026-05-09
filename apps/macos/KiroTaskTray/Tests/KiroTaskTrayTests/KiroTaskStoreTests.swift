import Testing
@testable import KiroTaskTray

@MainActor
struct KiroTaskStoreTests {
    @Test
    func fixtureLoadsSelectedTask142() {
        let store = KiroTaskStore.fixture()

        #expect(store.selectedTask.issue == "#142")
        #expect(store.selectedTask.title == "Fix notification webhook retry hang")
        #expect(store.primaryAgent.name == "Codex Pair")
        #expect(store.blockedAgentCount == 1)
        #expect(store.selectedAgent.name == "Codex Pair")
    }

    @Test
    func pauseResumeUpdatesAgentAndTaskState() {
        let store = KiroTaskStore.fixture()

        #expect(store.primaryAgent.status == .blocked)
        #expect(store.selectedTask.status == .blocked)

        store.togglePrimaryAgentPause()

        #expect(store.primaryAgent.status == .working)
        #expect(store.selectedTask.status == .inProgress)
    }

    @Test
    func markReadyUpdatesReadinessState() {
        let store = KiroTaskStore.fixture()

        store.markReady()

        #expect(store.selectedTask.status == .ready)
        #expect(store.primaryAgent.status == .ready)
        #expect(store.readiness.isReady)
        #expect(store.readiness.verdict == "Ready for owner review")
    }

    @Test
    func dashboardURLIsValid() {
        let store = KiroTaskStore.fixture()

        #expect(store.isValidDashboardURL())
        #expect(store.dashboardURL.absoluteString == "http://localhost:3000")
    }

    @Test
    func agentSelectionDoesNotRouteBackToFirstTask() {
        let store = KiroTaskStore.fixture()

        store.selection = .agent("agent-kiro")

        #expect(store.selectedAgent.name == "Kiro Guide")
        #expect(store.selectedAgent.status == .working)
    }
}
