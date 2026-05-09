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
    }

    @Test
    func pauseResumeUpdatesAgentAndTaskState() {
        let store = KiroTaskStore.fixture()

        #expect(store.primaryAgent.status == .paused)
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
        #expect(store.readiness.verdict == "Ready for Marcus review")
    }

    @Test
    func dashboardURLIsValid() {
        let store = KiroTaskStore.fixture()

        #expect(store.isValidDashboardURL())
        #expect(store.dashboardURL.absoluteString == "http://localhost:3000")
    }
}
