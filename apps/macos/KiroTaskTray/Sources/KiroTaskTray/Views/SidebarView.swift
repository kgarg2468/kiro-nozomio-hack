import SwiftUI

struct SidebarView: View {
    @EnvironmentObject private var store: KiroTaskStore

    var body: some View {
        List(selection: $store.selection) {
            Section("Today") {
                ForEach(store.tasks) { task in
                    SidebarTaskRow(task: task)
                        .tag(SidebarItem.task(task.id))
                }
            }

            Section("Agents") {
                ForEach(store.agents) { agent in
                    SidebarAgentRow(agent: agent)
                        .tag(SidebarItem.agent(agent.id))
                }
            }

            Section("Ready") {
                Label {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("PR readiness packet")
                            .lineLimit(1)
                        Text(store.readiness.verdict)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                } icon: {
                    Image(systemName: "checkmark.seal")
                        .foregroundStyle(.green)
                }
                .tag(SidebarItem.readiness)
            }
        }
        .listStyle(.sidebar)
        .scrollContentBackground(.hidden)
        .background(KiroTheme.navyRaised.opacity(0.82))
        .safeAreaInset(edge: .top) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    Image(systemName: "brain.head.profile")
                        .font(.title3)
                        .symbolRenderingMode(.hierarchical)
                        .foregroundStyle(KiroTheme.cyan)
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Kiro")
                            .font(.headline)
                        Text("\(store.activeTaskCount) active · \(store.blockedAgentCount) blocked")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass")
                    Text("Search tasks, agents, files")
                    Spacer()
                }
                .font(.caption)
                .foregroundStyle(KiroTheme.mutedInk)
                .padding(.horizontal, 9)
                .frame(height: 28)
                .background(KiroTheme.navyPanel.opacity(0.72), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(KiroTheme.cyan.opacity(0.18), lineWidth: 1)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
        }
    }
}

private struct SidebarTaskRow: View {
    let task: KiroTask

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: iconName)
                .foregroundStyle(iconColor)
                .frame(width: 17)

            VStack(alignment: .leading, spacing: 2) {
                Text(task.title)
                    .lineLimit(1)
                Text("\(task.issue) · \(task.engineer)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            StatusBadge(text: task.status.label, tint: tint)
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

    private var iconColor: Color {
        switch task.status {
        case .blocked: KiroTheme.amber
        case .ready: KiroTheme.green
        case .inProgress: KiroTheme.cyan
        case .selected: .secondary
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
            Image(systemName: agent.status == .paused ? "pause.circle" : "terminal")
                .foregroundStyle(agent.status == .paused ? KiroTheme.amber : KiroTheme.cyan)
                .frame(width: 17)

            VStack(alignment: .leading, spacing: 2) {
                Text(agent.name)
                    .lineLimit(1)
                Text(agent.role)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            StatusBadge(text: agent.status.label, tint: agent.status == .paused ? KiroTheme.amber : KiroTheme.cyan)
        }
        .frame(minHeight: 34)
    }
}
