import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var store: KiroTaskStore

    var body: some View {
        NavigationSplitView {
            SidebarView()
                .navigationSplitViewColumnWidth(min: 240, ideal: 270, max: 320)
        } detail: {
            TaskDetailView(task: store.selectedTask)
        }
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                Button {
                    store.togglePrimaryAgentPause()
                } label: {
                    Label(store.primaryAgent.isPaused ? "Resume" : "Pause", systemImage: store.primaryAgent.isPaused ? "play.fill" : "pause.fill")
                }

                Button {
                    store.markReady()
                } label: {
                    Label("Mark Ready", systemImage: "checkmark.seal.fill")
                }

                Button {
                    store.openDashboard()
                } label: {
                    Label("Open Dashboard", systemImage: "safari")
                }
            }
        }
        .background(KiroTheme.navy)
        .preferredColorScheme(.dark)
    }
}
