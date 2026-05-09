import Foundation

enum TaskStatus: String, Codable, Equatable {
    case selected
    case inProgress
    case blocked
    case ready

    var label: String {
        switch self {
        case .selected: "Selected"
        case .inProgress: "In Progress"
        case .blocked: "Blocked"
        case .ready: "Ready"
        }
    }
}

enum AgentStatus: String, Codable, Equatable {
    case working
    case paused
    case ready

    var label: String {
        switch self {
        case .working: "Working"
        case .paused: "Paused"
        case .ready: "Ready"
        }
    }
}

enum ConfidenceLabel: String, Codable, Equatable {
    case decided = "Decided"
    case convention = "Convention"
}

struct KiroTask: Identifiable, Codable, Equatable {
    let id: String
    var title: String
    var issue: String
    var owner: String
    var engineer: String
    var agentID: String
    var status: TaskStatus
    var progress: Double
    var affectedFiles: [String]
    var tests: [String]
}

struct KiroAgent: Identifiable, Codable, Equatable {
    let id: String
    var name: String
    var role: String
    var status: AgentStatus

    var isPaused: Bool {
        status == .paused
    }
}

struct KiroCitation: Identifiable, Codable, Equatable {
    let id: String
    var source: String
    var confidence: ConfidenceLabel
    var summary: String
}

struct Guardrail: Identifiable, Codable, Equatable {
    let id: String
    var title: String
    var detail: String
    var badCode: String
    var fixCode: String
    var isBlocking: Bool
}

struct PRReadiness: Codable, Equatable {
    var score: Int
    var verdict: String
    var recommendation: String
    var isReady: Bool
}

enum SidebarItem: Hashable, Identifiable {
    case task(String)
    case agent(String)
    case readiness

    var id: String {
        switch self {
        case .task(let id): "task-\(id)"
        case .agent(let id): "agent-\(id)"
        case .readiness: "readiness"
        }
    }
}
