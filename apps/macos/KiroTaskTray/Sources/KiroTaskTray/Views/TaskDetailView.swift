import SwiftUI

struct TaskDetailView: View {
    @EnvironmentObject private var store: KiroTaskStore
    let task: KiroTask

    var body: some View {
        DetailScroll {
            PixelOfficePreview(task: task, agent: store.primaryAgent, agents: store.agents)
            TaskSummaryCard(task: task)

            HStack(alignment: .top, spacing: 12) {
                FileListCard(title: "Files", systemImage: "doc.text.magnifyingglass", items: task.affectedFiles)
                FileListCard(title: "Tests", systemImage: "checklist", items: task.tests)
            }

            GuardrailCard(guardrail: store.guardrail)
            EvidenceCard(citations: store.citations)
        }
    }
}

struct AgentDetailView: View {
    @EnvironmentObject private var store: KiroTaskStore
    let agent: KiroAgent

    var body: some View {
        DetailScroll {
            AppCard(tint: tint) {
                HStack(alignment: .top, spacing: 18) {
                    PixelAgentAvatar(palette: agent.palette, status: agent.status, scale: 9)

                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(agent.name)
                                    .font(.system(size: 28, weight: .semibold))
                                Text("\(agent.kind.capitalized) agent · \(agent.role)")
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            StatusBadge(text: agent.status.label, tint: tint)
                        }

                        Text(agent.currentPlan)
                            .font(.callout)
                            .fixedSize(horizontal: false, vertical: true)

                        if let owner = store.employee(id: agent.ownerEmployeeID) {
                            HStack(spacing: 10) {
                                MetricTile(label: "Owner", value: owner.name)
                                MetricTile(label: "GitHub", value: owner.github)
                                MetricTile(label: "Employee", value: owner.status.capitalized)
                            }
                        }
                    }
                }
            }

            PixelOfficePreview(task: store.selectedTask, agent: agent, agents: store.agents)

            HStack(alignment: .top, spacing: 12) {
                AgentEventCard(events: store.contextEvents)
                EvidenceCard(citations: store.citations)
            }
        }
    }

    private var tint: Color {
        switch agent.status {
        case .idle: .secondary
        case .working: KiroTheme.cyan
        case .blocked: KiroTheme.amber
        case .ready: KiroTheme.green
        }
    }
}

struct ReadinessDetailView: View {
    @EnvironmentObject private var store: KiroTaskStore

    var body: some View {
        DetailScroll {
            ReadinessCard(readiness: store.readiness)

            HStack(alignment: .top, spacing: 12) {
                FileListCard(title: "Required Tests", systemImage: "checklist", items: store.readiness.tests)
                EvidenceCard(citations: store.citations)
            }

            GuardrailCard(guardrail: store.guardrail)
        }
    }
}

struct DetailScroll<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                content
            }
            .padding(18)
            .frame(maxWidth: 980, alignment: .leading)
        }
        .background(Color(nsColor: .windowBackgroundColor))
    }
}

private struct TaskSummaryCard: View {
    @EnvironmentObject private var store: KiroTaskStore
    let task: KiroTask

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 18) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("\(task.issue) · \(task.owner)")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(KiroTheme.cyan)
                            .textCase(.uppercase)

                        Text(task.title)
                            .font(.title2.weight(.semibold))

                        Text(task.whyMatched.joined(separator: " · "))
                            .font(.callout)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()
                    StatusBadge(text: task.status.label, tint: task.status == .blocked ? KiroTheme.amber : KiroTheme.green)
                }

                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 4), spacing: 10) {
                    MetricTile(label: "Owner", value: task.owner)
                    MetricTile(label: "Engineer", value: task.engineer)
                    MetricTile(label: "Agent", value: store.primaryAgent.name)
                    MetricTile(label: "Progress", value: "\(Int(task.progress * 100))%")
                }

                ProgressView(value: task.progress)
                    .tint(task.status == .blocked ? KiroTheme.amber : KiroTheme.cyan)
            }
        }
    }
}

private struct GuardrailCard: View {
    let guardrail: Guardrail

    var body: some View {
        AppCard(tint: guardrail.isBlocking ? KiroTheme.amber : KiroTheme.cyan) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .firstTextBaseline) {
                    Label(guardrail.isBlocking ? "Blocking Guardrail" : "Guardrail", systemImage: guardrail.isBlocking ? "exclamationmark.triangle.fill" : "checkmark.shield")
                        .font(.headline)
                        .foregroundStyle(guardrail.isBlocking ? KiroTheme.amber : KiroTheme.cyan)
                    Spacer()
                    StatusBadge(text: guardrail.isBlocking ? "blocking" : "active", tint: guardrail.isBlocking ? KiroTheme.amber : KiroTheme.cyan)
                }

                Text(guardrail.title)
                    .font(.title3.weight(.semibold))

                Text(guardrail.detail)
                    .font(.callout)
                    .foregroundStyle(.secondary)

                VStack(alignment: .leading, spacing: 6) {
                    CodeLine(prefix: "-", text: guardrail.badCode, tint: KiroTheme.red)
                    CodeLine(prefix: "+", text: guardrail.fixCode, tint: KiroTheme.green)
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(nsColor: .controlBackgroundColor), in: RoundedRectangle(cornerRadius: 6, style: .continuous))
            }
        }
    }
}

private struct AgentEventCard: View {
    let events: [ContextEvent]

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 10) {
                Label("Live Context Events", systemImage: "waveform.path.ecg")
                    .font(.headline)

                ForEach(events) { event in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(event.title)
                            .font(.subheadline.weight(.semibold))
                        Text(event.body)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Divider()
                }
            }
        }
        .frame(maxWidth: .infinity)
    }
}

private struct EvidenceCard: View {
    let citations: [KiroCitation]

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 10) {
                Label("Decision Evidence", systemImage: "quote.bubble")
                    .font(.headline)

                ForEach(citations) { citation in
                    VStack(alignment: .leading, spacing: 5) {
                        HStack {
                            Text(citation.source.uppercased())
                                .font(.caption.weight(.semibold))
                            Spacer()
                            StatusBadge(text: citation.confidence.rawValue, tint: citation.confidence == .decided ? KiroTheme.green : KiroTheme.cyan)
                        }

                        Text(citation.summary)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    if citation.id != citations.last?.id {
                        Divider()
                    }
                }
            }
        }
        .frame(maxWidth: .infinity)
    }
}

private struct ReadinessCard: View {
    let readiness: PRReadiness

    var body: some View {
        AppCard(tint: readiness.isReady ? KiroTheme.green : KiroTheme.amber) {
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill((readiness.isReady ? KiroTheme.green : KiroTheme.amber).opacity(0.14))
                    Text("\(readiness.score)")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(readiness.isReady ? KiroTheme.green : KiroTheme.amber)
                }
                .frame(width: 64, height: 64)

                VStack(alignment: .leading, spacing: 6) {
                    Label("PR Readiness", systemImage: "checkmark.seal.fill")
                        .font(.headline)
                    Text(readiness.verdict)
                        .font(.title3.weight(.semibold))
                    Text(readiness.recommendation)
                        .font(.callout)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}
