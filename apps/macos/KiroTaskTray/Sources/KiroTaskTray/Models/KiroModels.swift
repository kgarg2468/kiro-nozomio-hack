import Foundation

enum TaskStatus: String, Codable, Equatable {
    case selected
    case inProgress = "in_progress"
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
    case idle
    case working
    case blocked
    case ready

    var label: String {
        switch self {
        case .idle: "Idle"
        case .working: "Working"
        case .blocked: "Blocked"
        case .ready: "Ready"
        }
    }
}

enum ConfidenceLabel: String, Codable, Equatable {
    case decided = "Decided"
    case convention = "Convention"
    case considered = "Considered"
    case stale = "Stale"
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
    var whyMatched: [String]
    var affectedFiles: [String]
    var tests: [String]
}

struct KiroAgent: Identifiable, Codable, Equatable {
    let id: String
    var kind: String
    var name: String
    var ownerEmployeeID: String
    var role: String
    var currentPlan: String
    var status: AgentStatus
    var palette: Int

    var isBlocked: Bool {
        status == .blocked
    }
}

struct KiroEmployee: Identifiable, Codable, Equatable {
    let id: String
    var name: String
    var email: String
    var role: String
    var github: String
    var status: String
    var palette: Int
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
    var tests: [String]
}

struct ContextEvent: Identifiable, Codable, Equatable {
    let id: String
    var stage: String
    var title: String
    var body: String
    var citationIDs: [String]
}

enum DataSourceMode: String, Equatable {
    case fixture = "Fixture"
    case live = "Live Convex"
    case error = "Convex Error"
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
