import Foundation

struct ConvexDashboardClient {
    let deploymentURL: URL
    var session: URLSession = .shared

    func fetchDashboardState() async throws -> ConvexDashboardState {
        let queryURL = deploymentURL.appending(path: "api/query")
        var request = URLRequest(url: queryURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONEncoder().encode(
            ConvexQueryRequest(path: "onboarding:dashboardState", args: [:], format: "json")
        )

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200..<300).contains(httpResponse.statusCode) else {
            throw ConvexDashboardError.badHTTPResponse
        }

        let envelope = try JSONDecoder().decode(ConvexResponse<ConvexDashboardState>.self, from: data)
        switch envelope.status {
        case "success":
            if let value = envelope.value { return value }
            throw ConvexDashboardError.missingValue
        default:
            throw ConvexDashboardError.server(envelope.errorMessage ?? "Convex query failed")
        }
    }
}

enum ConvexDashboardError: LocalizedError, Equatable {
    case badHTTPResponse
    case missingValue
    case server(String)

    var errorDescription: String? {
        switch self {
        case .badHTTPResponse:
            "Convex returned a non-2xx response."
        case .missingValue:
            "Convex returned success without a value."
        case .server(let message):
            message
        }
    }
}

private struct ConvexQueryRequest: Encodable {
    let path: String
    let args: [String: String]
    let format: String
}

private struct ConvexResponse<Value: Decodable>: Decodable {
    let status: String
    let value: Value?
    let errorMessage: String?
}

struct ConvexDashboardState: Decodable, Equatable {
    var employees: [ConvexEmployee]
    var citations: [ConvexCitation]
    var task: ConvexTask?
    var agentSessions: [ConvexAgentSession]
    var contextEvents: [ConvexContextEvent]
    var guardrails: [ConvexGuardrail]
    var readiness: ConvexReadinessReport?
}

struct ConvexEmployee: Decodable, Equatable {
    let externalID: String
    let name: String
    let email: String
    let role: String
    let github: String
    let status: String
    let palette: Int

    enum CodingKeys: String, CodingKey {
        case externalID = "external_id"
        case name
        case email
        case role
        case github
        case status
        case palette
    }
}

struct ConvexCitation: Decodable, Equatable {
    let externalID: String
    let sourceType: String
    let title: String
    let snippet: String
    let confidence: ConfidenceLabel

    enum CodingKeys: String, CodingKey {
        case externalID = "external_id"
        case sourceType = "source_type"
        case title
        case snippet
        case confidence
    }
}

struct ConvexTask: Decodable, Equatable {
    let externalID: String
    let title: String
    let issueID: String
    let owner: String
    let matchedEmployeeExternalID: String
    let status: TaskStatus
    let progress: Double
    let whyMatched: [String]
    let files: [String]

    enum CodingKeys: String, CodingKey {
        case externalID = "external_id"
        case title
        case issueID = "issue_id"
        case owner
        case matchedEmployeeExternalID = "matched_employee_external_id"
        case status
        case progress
        case whyMatched = "why_matched"
        case files
    }
}

struct ConvexAgentSession: Decodable, Equatable {
    let externalID: String
    let kind: String
    let displayName: String
    let ownerEmployeeExternalID: String
    let currentPlan: String
    let status: AgentStatus

    enum CodingKeys: String, CodingKey {
        case externalID = "external_id"
        case kind
        case displayName = "display_name"
        case ownerEmployeeExternalID = "owner_employee_external_id"
        case currentPlan = "current_plan"
        case status
    }
}

struct ConvexContextEvent: Decodable, Equatable {
    let externalID: String
    let stage: String
    let title: String
    let body: String
    let citationExternalIDs: [String]

    enum CodingKeys: String, CodingKey {
        case externalID = "external_id"
        case stage
        case title
        case body
        case citationExternalIDs = "citation_external_ids"
    }
}

struct ConvexGuardrail: Decodable, Equatable {
    let externalID: String
    let title: String
    let severity: String
    let rule: String
    let recommendation: String
    let active: Bool

    enum CodingKeys: String, CodingKey {
        case externalID = "external_id"
        case title
        case severity
        case rule
        case recommendation
        case active
    }
}

struct ConvexReadinessReport: Decodable, Equatable {
    let externalID: String
    let verdict: String
    let summary: String
    let tests: [String]
    let risk: String
    let recommendation: String

    enum CodingKeys: String, CodingKey {
        case externalID = "external_id"
        case verdict
        case summary
        case tests
        case risk
        case recommendation
    }
}
