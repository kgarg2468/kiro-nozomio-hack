import SwiftUI

struct MenuBarPopoverView: View {
    @EnvironmentObject private var store: KiroTaskStore

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label("Kiro", systemImage: "brain.head.profile")
                    .font(.headline)
                Spacer()
                StatusBadge(text: "\(store.blockedAgentCount) blocked", tint: store.blockedAgentCount > 0 ? KiroTheme.amber : KiroTheme.green)
            }

            HStack(spacing: 8) {
                MiniStat(value: "\(store.activeTaskCount)", label: "active")
                MiniStat(value: "\(store.blockedAgentCount)", label: "blocked")
                MiniStat(value: "\(Int(store.selectedTask.progress * 100))%", label: store.selectedTask.issue)
            }

            Text("Codex is paused on a retry guardrail. Replace blocking sleep with bounded async backoff before PR readiness.")
                .font(.caption)
                .foregroundStyle(KiroTheme.mutedInk)
                .fixedSize(horizontal: false, vertical: true)
                .padding(10)
                .background(KiroTheme.amber.opacity(0.12), in: RoundedRectangle(cornerRadius: 10, style: .continuous))

            Grid(horizontalSpacing: 8, verticalSpacing: 8) {
                GridRow {
                    Button("Open Task") {
                        store.selection = .task(store.selectedTask.id)
                    }
                    Button(store.primaryAgent.isPaused ? "Resume" : "Pause") {
                        store.togglePrimaryAgentPause()
                    }
                }

                GridRow {
                    Button("Dashboard") {
                        store.openDashboard()
                    }
                    Button("Mark Ready") {
                        store.markReady()
                    }
                }
            }
            .buttonStyle(.bordered)
        }
        .padding(16)
        .frame(width: 320)
        .background(KiroTheme.navyRaised)
    }
}

private struct MiniStat: View {
    let value: String
    let label: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.title3.weight(.semibold))
            Text(label)
                .font(.caption2)
                .foregroundStyle(KiroTheme.mutedInk)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(KiroTheme.navyPanel.opacity(0.72), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}
