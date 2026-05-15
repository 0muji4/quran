import SwiftUI

@main
struct QuranRecitationApp: App {
  @StateObject private var session: SessionStore
  private let backend: QuranBackend
  private let authService: AuthService
  private let telemetry: Telemetry

  init() {
    self.telemetry = OSLogTelemetry()
    self.backend = ApolloBackend()
    self.authService = URLSessionAuthService()
    self._session = StateObject(
      wrappedValue: SessionStore(tokenStore: KeychainTokenStore())
    )
  }

  var body: some Scene {
    WindowGroup {
      AppRoot(
        session: session,
        backend: backend,
        authService: authService,
        telemetry: telemetry
      )
    }
  }
}
