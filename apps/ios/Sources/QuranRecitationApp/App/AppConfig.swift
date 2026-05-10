import Foundation

/// Application-wide configuration: backend endpoints and stable identifiers.
///
/// The iOS app currently builds via SwiftPM only (no `.xcodeproj`), so the
/// long-term plan of `xcconfig` → `Info.plist` → `AppConfig` cannot run yet.
/// Until an Xcode project layer is introduced, endpoints are switched via
/// `#if DEBUG` and an optional environment-variable override for ad-hoc QA.
/// `AppConfig` will remain the single migration point when the build setup
/// catches up; call sites do not need to change.
enum AppConfig {
  /// GraphQL endpoint consumed by `ApolloBackend` (introduced in PR 4).
  static let graphqlURL: URL = makeURL(
    environmentKey: "BFF_GRAPHQL_URL",
    debugDefault: "http://localhost:4000/graphql"
  )

  /// REST base URL consumed by `ReferenceAudioClient` (introduced in PR 13).
  static let restBaseURL: URL = makeURL(
    environmentKey: "BFF_REST_URL",
    debugDefault: "http://localhost:4000"
  )

  /// OSLog subsystem used by `OSLogTelemetry` (introduced in PR 3).
  static let telemetrySubsystem: String = "com.tilawah.ios"

  // MARK: - Helpers

  private static func makeURL(environmentKey: String, debugDefault: String) -> URL {
    if let override = ProcessInfo.processInfo.environment[environmentKey],
       let url = URL(string: override) {
      return url
    }
    #if DEBUG
    guard let url = URL(string: debugDefault) else {
      fatalError("AppConfig: invalid debug URL \(debugDefault)")
    }
    return url
    #else
    fatalError(
      "AppConfig: \(environmentKey) must be provided for release builds. "
      + "No production endpoint is wired yet (see ADR 0001)."
    )
    #endif
  }
}
