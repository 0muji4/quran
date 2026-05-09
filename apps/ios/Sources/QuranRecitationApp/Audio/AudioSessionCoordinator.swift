import AVFoundation

/// Single owner of `AVAudioSession` configuration. Centralising the
/// `setCategory(_:mode:options:)` and `setActive(_:)` calls prevents the
/// classic bug where switching between record and playback leaves the
/// session in an inconsistent state and audio routes to the wrong
/// output. Callers ask for the mode they need; transitions are no-ops
/// when the requested mode is already active.
@MainActor
final class AudioSessionCoordinator {
  static let shared = AudioSessionCoordinator()

  enum Mode {
    case idle
    case playback
    case record
  }

  private let session = AVAudioSession.sharedInstance()
  private var activeMode: Mode = .idle

  private init() {}

  /// Configure the audio session for the requested mode. Throws
  /// `AppError.audioRecordingFailed` or `.audioPlaybackFailed` so the
  /// View layer renders a localized message instead of an AVFoundation
  /// `NSError`.
  func ensureMode(_ mode: Mode) throws {
    guard mode != activeMode else { return }
    do {
      switch mode {
      case .idle:
        try session.setActive(false, options: .notifyOthersOnDeactivation)
      case .playback:
        try session.setCategory(.playback, mode: .default)
        try session.setActive(true)
      case .record:
        try session.setCategory(.playAndRecord, mode: .default, options: .defaultToSpeaker)
        try session.setActive(true)
      }
      activeMode = mode
    } catch {
      switch mode {
      case .record:
        throw AppError.audioRecordingFailed(underlying: error)
      case .playback, .idle:
        throw AppError.audioPlaybackFailed(underlying: error)
      }
    }
  }
}
