import SwiftUI

@main
struct QuranRecitationApp: App {
  @StateObject private var session: SessionStore
  private let backend: QuranBackend
  private let authService: AuthService
  private let meClient: MeClient
  private let telemetry: Telemetry

  init() {
    let telemetry = OSLogTelemetry()
    let backend = ApolloBackend()
    let authService = URLSessionAuthService()
    let tokenStore = KeychainTokenStore()
    let session = SessionStore(tokenStore: tokenStore)
    let refresher = TokenRefresher(authService: authService, tokenStore: tokenStore)
    let http = AuthHTTPClient(
      tokenStore: tokenStore,
      refresher: refresher,
      onSignOut: { session.signOut() }
    )

    self.telemetry = telemetry
    self.backend = backend
    self.authService = authService
    self.meClient = HTTPMeClient(http: http)
    self._session = StateObject(wrappedValue: session)
  }

  var body: some Scene {
    WindowGroup {
      AppRoot(
        session: session,
        backend: backend,
        authService: authService,
        telemetry: telemetry,
        meClient: meClient
      )
    }
  }
}
