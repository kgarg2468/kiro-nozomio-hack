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
        }
        .padding()
        .frame(width: 420)
    }
}
