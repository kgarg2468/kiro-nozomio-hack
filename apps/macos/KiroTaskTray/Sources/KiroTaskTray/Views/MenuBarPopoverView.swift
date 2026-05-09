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

            HStack(spacing: 10) {
                PixelAgentAvatar(palette: store.selectedAgent.palette, status: store.selectedAgent.status, scale: 4)
                VStack(alignment: .leading, spacing: 3) {
                    Text(store.selectedAgent.name)
                        .font(.subheadline.weight(.semibold))
                    Text(store.selectedAgent.currentPlan)
                        .font(.caption)
                        .foregroundStyle(KiroTheme.mutedInk)
                        .lineLimit(3)
                }
            }
            .padding(10)
            .background(KiroTheme.amber.opacity(store.selectedAgent.isBlocked ? 0.12 : 0.04), in: RoundedRectangle(cornerRadius: 8, style: .continuous))

            Text(store.sourceMode == .live ? "Connected to Convex dashboardState." : "Using fixture data until a Convex deployment URL is configured.")
                .font(.caption)
                .foregroundStyle(KiroTheme.mutedInk)
                .fixedSize(horizontal: false, vertical: true)

            Grid(horizontalSpacing: 8, verticalSpacing: 8) {
                GridRow {
                    Button("Open Agent") {
                        store.selection = .agent(store.selectedAgent.id)
                    }
                    Button(store.selectedAgent.isBlocked ? "Resume" : "Block") {
                        store.togglePrimaryAgentPause()
                    }
                }

                GridRow {
                    Button("Dashboard") {
                        store.openDashboard()
                    }
                    Button("Refresh") {
                        Task { await store.refreshFromConvexIfConfigured() }
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
