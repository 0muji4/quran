import SwiftUI

@main
struct QuranRecitationApp: App {
  var body: some Scene {
    WindowGroup {
      AppRoot(
        backend: ApolloBackend(),
        telemetry: OSLogTelemetry()
      )
    }
  }
}
