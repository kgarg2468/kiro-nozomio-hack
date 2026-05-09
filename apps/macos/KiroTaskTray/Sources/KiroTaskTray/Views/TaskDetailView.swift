import SwiftUI

struct TaskDetailView: View {
    @EnvironmentObject private var store: KiroTaskStore
    let task: KiroTask

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                PixelOfficePreview(task: task, agent: store.primaryAgent)
                TaskSummaryCard(task: task)
                GuardrailCard(guardrail: store.guardrail)

                HStack(alignment: .top, spacing: 16) {
                    FileListCard(title: "Affected Files", systemImage: "doc.text.magnifyingglass", items: task.affectedFiles)
                    FileListCard(title: "Tests", systemImage: "checklist", items: task.tests)
                }

                HStack(alignment: .top, spacing: 16) {
                    EvidenceCard(citations: store.citations)
                    ReadinessCard(readiness: store.readiness)
                }
            }
            .padding(24)
            .frame(maxWidth: 920, alignment: .leading)
        }
        .background(
            LinearGradient(
                colors: [KiroTheme.navy, KiroTheme.navyRaised],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }
}

private struct TaskSummaryCard: View {
    @EnvironmentObject private var store: KiroTaskStore
    let task: KiroTask

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top, spacing: 18) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("\(task.issue) · Notifications")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(KiroTheme.cyan)
                            .textCase(.uppercase)

                        Text(task.title)
                            .font(.system(size: 25, weight: .semibold))
                            .foregroundStyle(KiroTheme.ink)

                        Text("Selected for Sam because the bug is localized, Python async-heavy, and has a clear owner path.")
                            .font(.callout)
                            .foregroundStyle(KiroTheme.mutedInk)
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

                HStack(alignment: .center, spacing: 10) {
                    Text("Next action: fix retry wait, then reopen PR readiness.")
                        .font(.callout)
                        .foregroundStyle(KiroTheme.mutedInk)

                    Spacer()

                    Button {
                        store.togglePrimaryAgentPause()
                    } label: {
                        Label(store.primaryAgent.isPaused ? "Resume" : "Pause", systemImage: store.primaryAgent.isPaused ? "play.fill" : "pause.fill")
                    }
                    .buttonStyle(.borderedProminent)

                    Button("Assign") {
                        store.assignSelectedTaskToCodex()
                    }
                    .buttonStyle(.bordered)

                    Button("Mark Ready") {
                        store.markReady()
                    }
                    .buttonStyle(.bordered)
                }
            }
        }
    }
}

private struct GuardrailCard: View {
    let guardrail: Guardrail

    var body: some View {
        AppCard(tint: .orange) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .firstTextBaseline) {
                Label("Blocking Guardrail", systemImage: "exclamationmark.triangle.fill")
                        .font(.headline)
                        .foregroundStyle(KiroTheme.amber)
                    Spacer()
                    StatusBadge(text: "warning", tint: KiroTheme.amber)
                }

                Text(guardrail.title)
                    .font(.title3.weight(.semibold))

                Text(guardrail.detail)
                    .font(.callout)
                    .foregroundStyle(KiroTheme.mutedInk)

                VStack(alignment: .leading, spacing: 6) {
                    CodeLine(prefix: "-", text: guardrail.badCode, tint: .red)
                    CodeLine(prefix: "+", text: guardrail.fixCode, tint: .green)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.black.opacity(0.58), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
        }
    }
}

private struct EvidenceCard: View {
    let citations: [KiroCitation]

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 12) {
                Label("Evidence", systemImage: "quote.bubble")
                    .font(.headline)

                ForEach(citations) { citation in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(citation.source)
                                .font(.subheadline.weight(.semibold))
                            Spacer()
                            StatusBadge(text: citation.confidence.rawValue, tint: citation.confidence == .decided ? KiroTheme.green : KiroTheme.cyan)
                        }

                        Text(citation.summary)
                            .font(.caption)
                            .foregroundStyle(KiroTheme.mutedInk)
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
        AppCard(tint: .green) {
            VStack(alignment: .leading, spacing: 14) {
                Label("PR Readiness", systemImage: "checkmark.seal.fill")
                    .font(.headline)
                    .foregroundStyle(KiroTheme.green)

                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(KiroTheme.green.opacity(0.14))
                        Text("\(readiness.score)")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(KiroTheme.green)
                    }
                    .frame(width: 58, height: 58)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(readiness.verdict)
                            .font(.title3.weight(.semibold))
                        Text(readiness.recommendation)
                            .font(.callout)
                            .foregroundStyle(KiroTheme.mutedInk)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity)
    }
}
