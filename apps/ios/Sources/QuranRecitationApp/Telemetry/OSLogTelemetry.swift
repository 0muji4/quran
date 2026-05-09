import Foundation
import os

/// Production telemetry implementation. Writes structured records to
/// OSLog under the subsystem declared in `AppConfig`, and emits a
/// signpost interval for each `measure(_:_:)` invocation so that
/// Instruments shows the regions on the timeline. Zero per-event runtime
/// cost when log levels are filtered out.
final class OSLogTelemetry: Telemetry {
  private let eventLogger: Logger
  private let errorLogger: Logger
  private let signposter: OSSignposter

  init(subsystem: String = AppConfig.telemetrySubsystem) {
    self.eventLogger = Logger(subsystem: subsystem, category: "event")
    self.errorLogger = Logger(subsystem: subsystem, category: "error")
    self.signposter = OSSignposter(subsystem: subsystem, category: "measure")
  }

  func event(_ name: String, attributes: [String: String]) {
    eventLogger.info("event=\(name, privacy: .public) \(Self.format(attributes), privacy: .public)")
  }

  func measure<T>(_ name: String, _ block: () async throws -> T) async rethrows -> T {
    let id = signposter.makeSignpostID()
    let state = signposter.beginInterval("Telemetry.measure", id: id, "\(name, privacy: .public)")
    let start = Date()
    do {
      let result = try await block()
      let durationMs = Self.elapsedMs(since: start)
      signposter.endInterval("Telemetry.measure", state, "success")
      event(name + ".succeeded", attributes: ["duration_ms": String(durationMs)])
      return result
    } catch {
      let durationMs = Self.elapsedMs(since: start)
      signposter.endInterval("Telemetry.measure", state, "failure")
      event(name + ".failed", attributes: ["duration_ms": String(durationMs)])
      throw error
    }
  }

  func error(_ appError: AppError, context: [String: String]) {
    var combined = context
    combined["error_code"] = appError.telemetryCode
    errorLogger.error(
      "error=\(appError.telemetryCode, privacy: .public) \(Self.format(combined), privacy: .public)"
    )
  }

  // MARK: - Helpers

  private static func elapsedMs(since start: Date) -> Int {
    Int(Date().timeIntervalSince(start) * 1000)
  }

  private static func format(_ attributes: [String: String]) -> String {
    guard !attributes.isEmpty else { return "" }
    return attributes
      .sorted(by: { $0.key < $1.key })
      .map { "\($0.key)=\($0.value)" }
      .joined(separator: " ")
  }
}
