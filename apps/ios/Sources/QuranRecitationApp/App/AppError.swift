import Foundation

/// Single error type that every layer (Backend, Audio, Storage) converts to
/// before throwing across protocol boundaries. Centralising error vocabulary
/// is what lets the View, telemetry, and retry policy share one switch.
///
/// See ADR 0006 (iOS Layer Boundaries) for the rationale and ADR 0009
/// (iOS Internationalization) for the user-facing copy contract.
enum AppError: LocalizedError {
  case network(underlying: Error)
  case backendUnavailable(operation: String)
  case audioPermissionDenied
  case audioRecordingFailed(underlying: Error)
  case audioPlaybackFailed(underlying: Error)
  case referenceUnavailable(surahId: String, ayah: Int)
  case scoringTimeout
  case storageUnavailable

  // MARK: - LocalizedError

  var errorDescription: String? {
    AppErrorStrings.title(for: self)
  }

  var recoverySuggestion: String? {
    AppErrorStrings.recovery(for: self)
  }

  /// Whether the action that produced this error can be retried as-is
  /// (without user intervention beyond a button tap). Drives the choice
  /// between "Replay" and "Record again" in the Practice error panel.
  var isRetriable: Bool {
    switch self {
    case .network, .backendUnavailable, .scoringTimeout:
      return true
    case .audioPermissionDenied, .audioRecordingFailed, .audioPlaybackFailed,
         .referenceUnavailable, .storageUnavailable:
      return false
    }
  }

  /// Stable identifier emitted as the `error_code` attribute on telemetry
  /// events such as `practice.scoring.failed` (see ADR 0008).
  var telemetryCode: String {
    switch self {
    case .network:               return "network"
    case .backendUnavailable:    return "backend_unavailable"
    case .audioPermissionDenied: return "audio_permission_denied"
    case .audioRecordingFailed:  return "audio_recording_failed"
    case .audioPlaybackFailed:   return "audio_playback_failed"
    case .referenceUnavailable:  return "reference_unavailable"
    case .scoringTimeout:        return "scoring_timeout"
    case .storageUnavailable:    return "storage_unavailable"
    }
  }
}

private enum AppErrorStrings {
  static func title(for error: AppError) -> String {
    localized(key(for: error) + ".title")
  }

  static func recovery(for error: AppError) -> String {
    localized(key(for: error) + ".recovery")
  }

  private static func key(for error: AppError) -> String {
    switch error {
    case .network:               return "error.network"
    case .backendUnavailable:    return "error.backendUnavailable"
    case .audioPermissionDenied: return "error.audioPermissionDenied"
    case .audioRecordingFailed:  return "error.audioRecordingFailed"
    case .audioPlaybackFailed:   return "error.audioPlaybackFailed"
    case .referenceUnavailable:  return "error.referenceUnavailable"
    case .scoringTimeout:        return "error.scoringTimeout"
    case .storageUnavailable:    return "error.storageUnavailable"
    }
  }

  private static func localized(_ key: String) -> String {
    NSLocalizedString(key, bundle: .module, comment: "")
  }
}
