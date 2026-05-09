import SwiftUI

struct AppCard<Content: View>: View {
    var tint: Color?
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(16)
            .background(KiroTheme.navyRaised.opacity(0.96), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke((tint ?? KiroTheme.cyan).opacity(tint == nil ? 0.18 : 0.34), lineWidth: 1)
            }
            .shadow(color: .black.opacity(0.22), radius: 14, x: 0, y: 8)
    }
}

struct StatusBadge: View {
    let text: String
    let tint: Color

    var body: some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .lineLimit(1)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .foregroundStyle(tint)
            .background(tint.opacity(0.14), in: Capsule())
            .overlay {
                Capsule()
                    .stroke(tint.opacity(0.22), lineWidth: 1)
            }
    }
}

struct MetricTile: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(label)
                .font(.caption)
                .foregroundStyle(KiroTheme.mutedInk)
            Text(value)
                .font(.subheadline.weight(.semibold))
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(11)
        .background(KiroTheme.navyPanel.opacity(0.72), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

struct FileListCard: View {
    let title: String
    let systemImage: String
    let items: [String]

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 12) {
                Label(title, systemImage: systemImage)
                    .font(.headline)

                ForEach(items, id: \.self) { item in
                    Label(item, systemImage: "doc")
                        .font(.caption)
                        .lineLimit(1)
                        .padding(8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(KiroTheme.navyPanel.opacity(0.72), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
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
                .foregroundStyle(.white.opacity(0.92))
                .textSelection(.enabled)
        }
        .font(.system(.caption, design: .monospaced))
    }
}

struct PixelOfficePreview: View {
    let task: KiroTask
    let agent: KiroAgent

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Label("Live Office Map", systemImage: "square.grid.3x3.fill")
                        .font(.headline)
                        .foregroundStyle(KiroTheme.cyan)
                    Spacer()
                    StatusBadge(text: agent.status.label, tint: agent.status == .paused ? KiroTheme.amber : KiroTheme.green)
                }

                ZStack(alignment: .topLeading) {
                    HStack(spacing: 0) {
                        PixelRoom(color: KiroTheme.wood, gridColor: KiroTheme.woodDark.opacity(0.48))
                            .frame(width: 430)
                        PixelRoom(color: KiroTheme.tile, gridColor: Color.black.opacity(0.08))
                            .frame(width: 180)
                        PixelRoom(color: KiroTheme.meetingBlue, gridColor: Color.white.opacity(0.08))
                    }

                    PixelDesk(x: 58, y: 78, name: "Sam", status: .blocked)
                    PixelDesk(x: 286, y: 78, name: "Codex", status: .blocked)
                    PixelDesk(x: 58, y: 230, name: "Marcus", status: .ready)
                    PixelDesk(x: 286, y: 230, name: "Kiro", status: .inProgress)
                    PixelAvatar(x: 515, y: 82, color: .red, initials: "A")
                    PixelMeeting(x: 630, y: 215)
                    PixelPlant(x: 26, y: 55)
                    PixelPlant(x: 690, y: 86)
                    PixelPlant(x: 700, y: 310)
                }
                .frame(height: 360)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(Color.black.opacity(0.35), lineWidth: 2)
                }

                Text("\(task.issue) is paused at Codex while Kiro checks retry policy evidence. The visual map mirrors the pixel-office style from the demo.")
                    .font(.callout)
                    .foregroundStyle(KiroTheme.mutedInk)
            }
        }
    }
}

private struct PixelRoom: View {
    let color: Color
    let gridColor: Color

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                color
                GridLines(width: proxy.size.width, height: proxy.size.height, step: 24, color: gridColor)
            }
        }
    }
}

private struct GridLines: View {
    let width: CGFloat
    let height: CGFloat
    let step: CGFloat
    let color: Color

    var body: some View {
        Path { path in
            var x: CGFloat = 0
            while x <= width {
                path.move(to: CGPoint(x: x, y: 0))
                path.addLine(to: CGPoint(x: x, y: height))
                x += step
            }
            var y: CGFloat = 0
            while y <= height {
                path.move(to: CGPoint(x: 0, y: y))
                path.addLine(to: CGPoint(x: width, y: y))
                y += step
            }
        }
        .stroke(color, lineWidth: 1)
    }
}

private struct PixelDesk: View {
    let x: CGFloat
    let y: CGFloat
    let name: String
    let status: TaskStatus

    var body: some View {
        VStack(spacing: 5) {
            ZStack {
                RoundedRectangle(cornerRadius: 2)
                    .fill(KiroTheme.woodDark)
                    .frame(width: 118, height: 52)
                Rectangle()
                    .fill(KiroTheme.navyPanel)
                    .frame(width: 42, height: 26)
                    .offset(y: -4)
                Rectangle()
                    .fill(KiroTheme.cyan.opacity(0.72))
                    .frame(width: 30, height: 16)
                    .offset(y: -4)
                HStack(spacing: 4) {
                    Rectangle().fill(KiroTheme.tile).frame(width: 34, height: 8)
                    Circle().fill(status == .blocked ? KiroTheme.amber : KiroTheme.green).frame(width: 9, height: 9)
                }
                .offset(y: 18)
            }
            Text(name)
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .foregroundStyle(KiroTheme.ink)
        }
        .position(x: x + 59, y: y + 36)
    }
}

private struct PixelAvatar: View {
    let x: CGFloat
    let y: CGFloat
    let color: Color
    let initials: String

    var body: some View {
        VStack(spacing: 0) {
            Circle().fill(Color.black.opacity(0.82)).frame(width: 30, height: 30)
            RoundedRectangle(cornerRadius: 2).fill(color).frame(width: 26, height: 28)
            Text(initials)
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .foregroundStyle(.white)
                .offset(y: -23)
        }
        .position(x: x, y: y)
    }
}

private struct PixelMeeting: View {
    let x: CGFloat
    let y: CGFloat

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 3)
                .fill(KiroTheme.wood.opacity(0.9))
                .frame(width: 96, height: 72)
            RoundedRectangle(cornerRadius: 3)
                .stroke(KiroTheme.tile.opacity(0.5), lineWidth: 2)
                .frame(width: 96, height: 72)
            PixelAvatar(x: -28, y: 0, color: .purple, initials: "S")
            PixelAvatar(x: 34, y: 3, color: .gray, initials: "M")
        }
        .position(x: x, y: y)
    }
}

private struct PixelPlant: View {
    let x: CGFloat
    let y: CGFloat

    var body: some View {
        VStack(spacing: -2) {
            HStack(spacing: -4) {
                Capsule().fill(KiroTheme.green).frame(width: 9, height: 34).rotationEffect(.degrees(-34))
                Capsule().fill(KiroTheme.green).frame(width: 9, height: 40)
                Capsule().fill(KiroTheme.green).frame(width: 9, height: 34).rotationEffect(.degrees(34))
            }
            RoundedRectangle(cornerRadius: 2)
                .fill(KiroTheme.tile)
                .frame(width: 26, height: 22)
        }
        .position(x: x, y: y)
    }
}
