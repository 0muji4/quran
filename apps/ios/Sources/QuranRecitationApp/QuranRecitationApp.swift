import SwiftUI

@main
struct QuranRecitationApp: App {
  @StateObject private var session: SessionStore
  private let backend: QuranBackend
  private let authService: AuthService
  private let meClient: MeClient
  private let profileService: ProfileService
  private let historyStore: HistoryStore
  private let telemetry: Telemetry

  init() {
    let telemetry = OSLogTelemetry()
    let authService = URLSessionAuthService()
    let tokenStore = KeychainTokenStore()
    let session = SessionStore(tokenStore: tokenStore)
    let refresher = TokenRefresher(authService: authService, tokenStore: tokenStore)
    // Share `refresher` and `onSignOut` between Apollo and the REST
    // HTTP client so concurrent 401s on the two transports coalesce
    // into a single `POST /auth/refresh` and route through the same
    // sign-out destination.
    let backend = ApolloBackend(
      tokenStore: tokenStore,
      refresher: refresher,
      onSignOut: { session.signOut() }
    )
    let http = AuthHTTPClient(
      tokenStore: tokenStore,
      refresher: refresher,
      onSignOut: { session.signOut() }
    )
    let meClient = HTTPMeClient(http: http)
    let profileService = HTTPProfileService(http: http)
    let historyStore = SignInGatedHistoryStore(
      base: RemoteSyncedHistoryStore(
        cache: UserDefaultsHistoryStore(),
        me: meClient,
        telemetry: telemetry
      ),
      isSignedIn: { session.isSignedIn }
    )

    self.telemetry = telemetry
    self.backend = backend
    self.authService = authService
    self.meClient = meClient
    self.profileService = profileService
    self.historyStore = historyStore
    self._session = StateObject(wrappedValue: session)
  }

  var body: some Scene {
    WindowGroup {
      AppRoot(
        session: session,
        backend: backend,
        authService: authService,
        telemetry: telemetry,
        historyStore: historyStore,
        meClient: meClient,
        profileService: profileService
      )
    }
  }
}
