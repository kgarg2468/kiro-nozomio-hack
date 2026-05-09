import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var store: KiroTaskStore

    var body: some View {
        Form {
            Section("Dashboard") {
                TextField("Dashboard URL", text: Binding(
                    get: { store.dashboardURL.absoluteString },
                    set: { value in
                        if let url = URL(string: value) {
                            store.dashboardURL = url
                        }
                    }
                ))

                Text(store.isValidDashboardURL() ? "Valid dashboard URL" : "Use an http or https URL.")
                    .font(.caption)
                    .foregroundStyle(store.isValidDashboardURL() ? Color.secondary : Color.red)
            }

            Section("Convex") {
                TextField("Convex deployment URL", text: $store.convexDeploymentURLString)

                HStack {
                    Text(store.isValidConvexURL() ? store.sourceMode.rawValue : "Use an http or https Convex URL.")
                        .font(.caption)
                        .foregroundStyle(store.isValidConvexURL() ? Color.secondary : Color.red)

                    Spacer()

                    Button("Refresh") {
                        Task { await store.refreshFromConvexIfConfigured() }
                    }
                    .disabled(!store.isValidConvexURL() || store.isRefreshing)
                }
            }
        }
        .padding()
        .frame(width: 420)
    }
}
