import AVFoundation
import Combine

/// Lightweight wrapper around `AVAudioPlayer`. Used for the teacher
/// reference panel and the listen-back rows on the result screen. The
/// progress timer fires on the main run loop so SwiftUI can bind to
/// `currentTime` directly without bridging.
@MainActor
final class AudioPlayer: NSObject, ObservableObject {
  @Published private(set) var isPlaying = false
  @Published private(set) var currentTime: TimeInterval = 0
  @Published private(set) var duration: TimeInterval = 0

  private var player: AVAudioPlayer?
  private var progressTimer: Timer?

  /// Load a local file URL. Throws `AppError.audioPlaybackFailed` if the
  /// file is missing, unreadable, or in an unsupported format.
  func load(url: URL) throws {
    try AudioSessionCoordinator.shared.ensureMode(.playback)
    do {
      let player = try AVAudioPlayer(contentsOf: url)
      player.enableRate = true
      player.delegate = self
      player.prepareToPlay()
      self.player = player
      self.duration = player.duration
      self.currentTime = 0
      self.isPlaying = false
    } catch {
      throw AppError.audioPlaybackFailed(underlying: error)
    }
  }

  func play(rate: Float = 1.0) {
    guard let player else { return }
    player.rate = rate
    player.play()
    isPlaying = true
    startProgressTimer()
  }

  func pause() {
    player?.pause()
    isPlaying = false
    stopProgressTimer()
  }

  func stop() {
    player?.stop()
    player?.currentTime = 0
    isPlaying = false
    currentTime = 0
    stopProgressTimer()
  }

  private func startProgressTimer() {
    progressTimer?.invalidate()
    progressTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
      Task { @MainActor in
        guard let self, let player = self.player else { return }
        self.currentTime = player.currentTime
      }
    }
  }

  private func stopProgressTimer() {
    progressTimer?.invalidate()
    progressTimer = nil
  }
}

extension AudioPlayer: AVAudioPlayerDelegate {
  nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
    Task { @MainActor [weak self] in
      guard let self else { return }
      self.isPlaying = false
      self.currentTime = 0
      self.stopProgressTimer()
    }
  }

  nonisolated func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
    Task { @MainActor [weak self] in
      self?.stop()
    }
  }
}
