import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var store: KiroTaskStore

    var body: some View {
        NavigationSplitView {
            SidebarView()
                .navigationSplitViewColumnWidth(min: 220, ideal: 250, max: 300)
        } detail: {
            DetailRouter()
        }
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                Button {
                    Task { await store.refreshFromConvexIfConfigured() }
                } label: {
                    Label(store.isRefreshing ? "Refreshing" : "Refresh", systemImage: "arrow.clockwise")
                }
                .disabled(store.isRefreshing)

                Button {
                    store.togglePrimaryAgentPause()
                } label: {
                    Label(store.selectedAgent.isBlocked ? "Resume" : "Block", systemImage: store.selectedAgent.isBlocked ? "play.fill" : "pause.fill")
                }

                Button {
                    store.openDashboard()
                } label: {
                    Label("Dashboard", systemImage: "safari")
                }
            }
        }
    }
}

private struct DetailRouter: View {
    @EnvironmentObject private var store: KiroTaskStore

    var body: some View {
        switch store.selection {
        case .agent:
            AgentDetailView(agent: store.selectedAgent)
        case .task:
            TaskDetailView(task: store.selectedTask)
        case .readiness:
            ReadinessDetailView()
        }
    }
}
