import SwiftUI

struct AppCard<Content: View>: View {
    var tint: Color?
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(14)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke((tint ?? Color.secondary).opacity(tint == nil ? 0.16 : 0.38), lineWidth: 1)
            }
    }
}

struct StatusBadge: View {
    let text: String
    let tint: Color

    var body: some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .lineLimit(1)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .foregroundStyle(tint)
            .background(tint.opacity(0.12), in: Capsule())
    }
}

struct PixelAgentAvatar: View {
    let palette: Int
    let status: AgentStatus
    var scale: CGFloat = 4

    private var bodyColor: Color { KiroTheme.agentPalette[abs(palette) % KiroTheme.agentPalette.count] }
    private var statusColor: Color {
        switch status {
        case .idle: .secondary
        case .working: KiroTheme.cyan
        case .blocked: KiroTheme.amber
        case .ready: KiroTheme.green
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            PixelRow([0, 1, 1, 1, 0], scale: scale, colors: colors)
            PixelRow([1, 2, 2, 2, 1], scale: scale, colors: colors)
            PixelRow([1, 3, 2, 3, 1], scale: scale, colors: colors)
            PixelRow([0, 1, 1, 1, 0], scale: scale, colors: colors)
            PixelRow([0, 4, 4, 4, 0], scale: scale, colors: colors)
            PixelRow([4, 4, 5, 4, 4], scale: scale, colors: colors)
            PixelRow([0, 4, 4, 4, 0], scale: scale, colors: colors)
            PixelRow([0, 6, 0, 6, 0], scale: scale, colors: colors)
        }
        .padding(scale)
        .background(Color.black.opacity(0.08), in: RoundedRectangle(cornerRadius: 4, style: .continuous))
        .overlay(alignment: .bottomTrailing) {
            Rectangle()
                .fill(statusColor)
                .frame(width: scale * 2.2, height: scale * 2.2)
                .offset(x: scale * 0.8, y: scale * 0.8)
        }
    }

    private var colors: [Int: Color] {
        [
            1: Color(red: 0.18, green: 0.14, blue: 0.12),
            2: Color(red: 0.86, green: 0.66, blue: 0.48),
            3: Color.black.opacity(0.8),
            4: bodyColor,
            5: bodyColor.opacity(0.72),
            6: Color(red: 0.12, green: 0.15, blue: 0.2)
        ]
    }
}

private struct PixelRow: View {
    let values: [Int]
    let scale: CGFloat
    let colors: [Int: Color]

    init(_ values: [Int], scale: CGFloat, colors: [Int: Color]) {
        self.values = values
        self.scale = scale
        self.colors = colors
    }

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(values.enumerated()), id: \.offset) { _, value in
                Rectangle()
                    .fill(colors[value] ?? .clear)
                    .frame(width: scale, height: scale)
            }
        }
    }
}

struct MetricTile: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.subheadline.weight(.semibold))
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(Color(nsColor: .controlBackgroundColor), in: RoundedRectangle(cornerRadius: 6, style: .continuous))
    }
}

struct FileListCard: View {
    let title: String
    let systemImage: String
    let items: [String]

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 10) {
                Label(title, systemImage: systemImage)
                    .font(.headline)

                ForEach(items, id: \.self) { item in
                    Label(item, systemImage: "doc")
                        .font(.caption)
                        .lineLimit(1)
                        .padding(.vertical, 5)
                }
            }
        }
        .frame(maxWidth: .infinity)
    }
}

struct CodeLine: View {
    let prefix: String
    let text: String
    let tint: Color

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(prefix)
                .foregroundStyle(tint)
            Text(text)
                .foregroundStyle(.primary)
                .textSelection(.enabled)
        }
        .font(.system(.caption, design: .monospaced))
    }
}

struct PixelOfficePreview: View {
    let task: KiroTask
    let agent: KiroAgent
    let agents: [KiroAgent]

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Label("Live Pixel Agent Floor", systemImage: "square.grid.3x3.fill")
                        .font(.headline)
                    Spacer()
                    StatusBadge(text: agent.status.label, tint: tint(for: agent.status))
                }

                GeometryReader { proxy in
                    let width = proxy.size.width
                    ZStack(alignment: .topLeading) {
                        PixelFloor()
                        ForEach(Array(agents.enumerated()), id: \.element.id) { index, liveAgent in
                            PixelAgentNode(agent: liveAgent, index: index, width: width)
                        }
                    }
                }
                .frame(height: 270)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(Color.primary.opacity(0.12), lineWidth: 1)
                }

                Text("\(task.issue) follows \(agent.name)'s live session state. Agent rows, detail panes, and the menu bar all read from the same store.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func tint(for status: AgentStatus) -> Color {
        switch status {
        case .idle: .secondary
        case .working: KiroTheme.cyan
        case .blocked: KiroTheme.amber
        case .ready: KiroTheme.green
        }
    }
}

private struct PixelFloor: View {
    var body: some View {
        ZStack {
            KiroTheme.floor
            GridLines(step: 18, color: Color.black.opacity(0.08))
            VStack(spacing: 18) {
                HStack(spacing: 18) {
                    PixelDeskBlock()
                    PixelDeskBlock()
                    Spacer()
                    PixelMeetingBlock()
                }
                Spacer()
                HStack(spacing: 18) {
                    PixelDeskBlock()
                    PixelDeskBlock()
                    Spacer()
                    PixelPlantBlock()
                }
            }
            .padding(18)
        }
    }
}

private struct PixelAgentNode: View {
    let agent: KiroAgent
    let index: Int
    let width: CGFloat

    var body: some View {
        VStack(spacing: 5) {
            PixelAgentAvatar(palette: agent.palette, status: agent.status, scale: 5)
            Text(agent.name)
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .lineLimit(1)
        }
        .frame(width: 90)
        .position(position)
    }

    private var position: CGPoint {
        let points = [
            CGPoint(x: 95, y: 105),
            CGPoint(x: 250, y: 105),
            CGPoint(x: 95, y: 215),
            CGPoint(x: 250, y: 215),
            CGPoint(x: max(width - 130, 330), y: 145),
            CGPoint(x: max(width - 210, 420), y: 215)
        ]
        return points[index % points.count]
    }
}

private struct GridLines: View {
    let step: CGFloat
    let color: Color

    var body: some View {
        GeometryReader { proxy in
            Path { path in
                var x: CGFloat = 0
                while x <= proxy.size.width {
                    path.move(to: CGPoint(x: x, y: 0))
                    path.addLine(to: CGPoint(x: x, y: proxy.size.height))
                    x += step
                }
                var y: CGFloat = 0
                while y <= proxy.size.height {
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: proxy.size.width, y: y))
                    y += step
                }
            }
            .stroke(color, lineWidth: 1)
        }
    }
}

private struct PixelDeskBlock: View {
    var body: some View {
        ZStack {
            Rectangle().fill(KiroTheme.wood).frame(width: 112, height: 44)
            Rectangle().fill(KiroTheme.woodDark).frame(width: 112, height: 8).offset(y: 18)
            Rectangle().fill(Color.black.opacity(0.55)).frame(width: 34, height: 22).offset(y: -6)
            Rectangle().fill(KiroTheme.cyan.opacity(0.65)).frame(width: 24, height: 12).offset(y: -6)
        }
    }
}

private struct PixelMeetingBlock: View {
    var body: some View {
        ZStack {
            Rectangle().fill(KiroTheme.meetingBlue).frame(width: 130, height: 76)
            Rectangle().fill(Color.white.opacity(0.14)).frame(width: 118, height: 64)
        }
    }
}

private struct PixelPlantBlock: View {
    var body: some View {
        VStack(spacing: -2) {
            HStack(spacing: -3) {
                Rectangle().fill(KiroTheme.green).frame(width: 9, height: 34).rotationEffect(.degrees(-25))
                Rectangle().fill(KiroTheme.green).frame(width: 9, height: 38)
                Rectangle().fill(KiroTheme.green).frame(width: 9, height: 34).rotationEffect(.degrees(25))
            }
            Rectangle().fill(KiroTheme.tile).frame(width: 30, height: 22)
        }
    }
}
