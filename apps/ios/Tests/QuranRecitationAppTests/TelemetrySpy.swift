import Foundation
@testable import QuranRecitationApp

/// `Telemetry` test double that captures events and errors so tests can
/// assert on what was reported. `measure(_:_:)` runs the block and
/// records both a `<name>.measured` start marker and a final
/// `<name>.succeeded` / `.failed` event with `duration_ms` set to "0"
/// (deterministic for assertions).
final class TelemetrySpy: Telemetry {
  enum Record: Equatable {
    case event(name: String, attributes: [String: String])
    case error(code: String, context: [String: String])
  }

  private(set) var records: [Record] = []

  func event(_ name: String, attributes: [String: String]) {
    records.append(.event(name: name, attributes: attributes))
  }

  func measure<T>(_ name: String, _ block: () async throws -> T) async rethrows -> T {
    do {
      let result = try await block()
      records.append(.event(name: name + ".succeeded", attributes: ["duration_ms": "0"]))
      return result
    } catch {
      records.append(.event(name: name + ".failed", attributes: ["duration_ms": "0"]))
      throw error
    }
  }

  func error(_ error: AppError, context: [String: String]) {
    var combined = context
    combined["error_code"] = error.telemetryCode
    records.append(.error(code: error.telemetryCode, context: combined))
  }

  func eventNames() -> [String] {
    records.compactMap {
      if case let .event(name, _) = $0 { return name } else { return nil }
    }
  }
}
