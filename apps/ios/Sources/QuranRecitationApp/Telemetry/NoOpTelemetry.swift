import Foundation

/// Telemetry that drops every signal. Used by SwiftUI Previews and as
/// the default for tests that do not assert on telemetry. When tests
/// need to assert, PR 6 introduces `TelemetrySpy` in the test target.
struct NoOpTelemetry: Telemetry {
  func event(_ name: String, attributes: [String: String]) {}

  func measure<T>(_ name: String, _ block: () async throws -> T) async rethrows -> T {
    try await block()
  }

  func error(_ error: AppError, context: [String: String]) {}
}
