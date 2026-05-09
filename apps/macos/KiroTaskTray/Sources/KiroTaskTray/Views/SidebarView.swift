import SwiftUI

struct SidebarView: View {
    @EnvironmentObject private var store: KiroTaskStore

    var body: some View {
        List(selection: $store.selection) {
            Section("Agents") {
                ForEach(store.agents) { agent in
                    SidebarAgentRow(agent: agent)
                        .tag(SidebarItem.agent(agent.id))
                }
            }

            Section("Tasks") {
                ForEach(store.tasks) { task in
                    SidebarTaskRow(task: task)
                        .tag(SidebarItem.task(task.id))
                }
            }

            Section("Review") {
                Label {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("PR readiness")
                            .lineLimit(1)
                        Text(store.readiness.isReady ? "Ready" : "Needs work")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                } icon: {
                    Image(systemName: store.readiness.isReady ? "checkmark.seal" : "exclamationmark.triangle")
                        .foregroundStyle(store.readiness.isReady ? KiroTheme.green : KiroTheme.amber)
                }
                .tag(SidebarItem.readiness)
            }
        }
        .listStyle(.sidebar)
        .safeAreaInset(edge: .top) {
            SidebarHeader()
        }
    }
}

private struct SidebarHeader: View {
    @EnvironmentObject private var store: KiroTaskStore

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "brain.head.profile")
                    .font(.title3)
                    .foregroundStyle(KiroTheme.cyan)
                VStack(alignment: .leading, spacing: 1) {
                    Text("Kiro")
                        .font(.headline)
                    Text("\(store.sourceMode.rawValue) · \(store.blockedAgentCount) blocked")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if let loadError = store.loadError {
                Text(loadError)
                    .font(.caption2)
                    .lineLimit(2)
                    .foregroundStyle(KiroTheme.amber)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }
}

private struct SidebarTaskRow: View {
    let task: KiroTask

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: iconName)
                .foregroundStyle(tint)
                .frame(width: 16)

            VStack(alignment: .leading, spacing: 2) {
                Text(task.title)
                    .lineLimit(1)
                Text("\(task.issue) · \(task.engineer)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .frame(minHeight: 34)
    }

    private var iconName: String {
        switch task.status {
        case .blocked: "exclamationmark.triangle"
        case .ready: "checkmark.circle"
        case .inProgress: "hammer"
        case .selected: "circle"
        }
    }

    private var tint: Color {
        switch task.status {
        case .blocked: KiroTheme.amber
        case .ready: KiroTheme.green
        case .inProgress: KiroTheme.cyan
        case .selected: .secondary
        }
    }
}

private struct SidebarAgentRow: View {
    let agent: KiroAgent

    var body: some View {
        HStack(spacing: 10) {
            PixelAgentAvatar(palette: agent.palette, status: agent.status, scale: 2.4)

            VStack(alignment: .leading, spacing: 2) {
                Text(agent.name)
                    .lineLimit(1)
                Text("\(agent.kind.capitalized) · \(agent.status.label)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .frame(minHeight: 36)
    }
}
