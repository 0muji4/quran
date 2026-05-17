import Foundation

/// Cross-cutting telemetry surface. Every layer can emit product-level
/// events, time-bounded measurements, and errors through this single
/// protocol. Implementations are swappable: `OSLogTelemetry` ships the
/// production surface (OSLog + signposts) and `NoOpTelemetry` is used by
/// tests and SwiftUI Previews. See ADR 0008 for the rationale.
protocol Telemetry {
  /// Fire a discrete event. `name` must be one of `TelemetryEvent.*`
  /// to keep the cross-platform taxonomy consistent.
  func event(_ name: String, attributes: [String: String])

  /// Time the duration of an async operation. Implementations also emit
  /// signpost intervals so the region appears in Instruments timelines.
  /// On success or failure, a `<name>.succeeded` / `<name>.failed` event
  /// is emitted with `duration_ms`.
  func measure<T>(_ name: String, _ block: () async throws -> T) async rethrows -> T

  /// Log a recoverable or user-visible error. Writes the stable
  /// `AppError.telemetryCode` so dashboards group by failure mode.
  func error(_ error: AppError, context: [String: String])
}

extension Telemetry {
  /// Convenience: attribute-less event.
  func event(_ name: String) {
    event(name, attributes: [:])
  }

  /// Convenience: error without extra context.
  func error(_ error: AppError) {
    self.error(error, context: [:])
  }
}

/// Stable event names. Centralised so a typo or rename touches one place
/// and so the cross-platform telemetry catalogue can be diffed against
/// the web / Android codebases. See `docs/telemetry.md` (PR 26).
enum TelemetryEvent {
  // Library
  static let libraryTabSelected   = "library.tab.selected"
  static let librarySurahOpened   = "library.surah.opened"

  // Practice
  static let practiceReferencePlayed = "practice.reference.played"
  static let practiceRateChanged      = "practice.rate.changed"
  static let practiceRecordingStarted = "practice.recording.started"
  static let practiceRecordingStopped = "practice.recording.stopped"
  static let practiceUploadCompleted  = "practice.upload.completed"
  static let practiceScoringCompleted = "practice.scoring.completed"
  static let practiceScoringFailed    = "practice.scoring.failed"

  // Result
  static let resultTryAgainTapped  = "result.try_again.tapped"
  static let resultContinueTapped  = "result.continue.tapped"

  // Auth — sign-in / sign-up success and failure are emitted by
  // `telemetry.measure("auth.signin" / "auth.signup")` as
  // `<name>.succeeded` / `<name>.failed`; no discrete event names are
  // needed here.
}
