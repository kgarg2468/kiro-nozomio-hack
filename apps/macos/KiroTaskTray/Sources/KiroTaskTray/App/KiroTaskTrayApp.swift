import AppKit
import SwiftUI

@main
struct KiroTaskTrayApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var store = KiroTaskStore.fixture()

    var body: some Scene {
        WindowGroup("Kiro Task Tray", id: "main") {
            ContentView()
                .environmentObject(store)
                .frame(minWidth: 960, minHeight: 640)
                .task {
                    await store.refreshFromConvexIfConfigured()
                }
        }
        .commands {
            CommandGroup(after: .appInfo) {
                Button("Open Dashboard") {
                    store.openDashboard()
                }
                .keyboardShortcut("d", modifiers: [.command, .shift])
            }

            CommandMenu("Kiro") {
                Button(store.selectedAgent.isBlocked ? "Resume Agent" : "Block Agent") {
                    store.togglePrimaryAgentPause()
                }
                .keyboardShortcut("p", modifiers: [.command, .shift])

                Button("Refresh Convex") {
                    Task { await store.refreshFromConvexIfConfigured() }
                }
                .keyboardShortcut("l", modifiers: [.command, .shift])

                Button("Mark Ready") {
                    store.markReady()
                }
                .keyboardShortcut("r", modifiers: [.command, .shift])
            }
        }

        MenuBarExtra {
            MenuBarPopoverView()
                .environmentObject(store)
        } label: {
            Label("\(store.blockedAgentCount) blocked", systemImage: store.menuBarSymbol)
        }
        .menuBarExtraStyle(.window)

        Settings {
            SettingsView()
                .environmentObject(store)
        }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }
}
