import AVFoundation
import Combine

/// AVAudioRecorder wrapper that publishes meter samples and elapsed
/// duration so the Recording panel can drive a live waveform without
/// reaching into AVFoundation directly.
///
/// `startRecording()` retains its synchronous signature for backwards
/// compatibility with the legacy `RecordingViewModel`. Microphone
/// permission is requested asynchronously via
/// `requestMicrophonePermission()` from the new `PracticeViewModel`
/// (PR 12); existing callers continue to rely on iOS's implicit prompt
/// behavior.
@MainActor
final class AudioRecorder: ObservableObject {
  /// Recent meter samples normalised to 0…1. Length capped at
  /// `meterBufferSize` to bound memory.
  @Published private(set) var meters: [Float] = []

  /// Elapsed seconds of the active recording. 0 when idle.
  @Published private(set) var duration: TimeInterval = 0

  @Published private(set) var isRecording = false

  private var recorder: AVAudioRecorder?
  private var meterTimer: Timer?
  private let meterBufferSize = 64

  func startRecording() throws {
    try AudioSessionCoordinator.shared.ensureMode(.record)

    let settings: [String: Any] = [
      AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
      AVSampleRateKey: 44_100,
      AVNumberOfChannelsKey: 1,
      AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
    ]

    let fileURL = FileManager.default.temporaryDirectory
      .appendingPathComponent("recitation-\(UUID().uuidString).m4a")

    do {
      let recorder = try AVAudioRecorder(url: fileURL, settings: settings)
      recorder.isMeteringEnabled = true
      recorder.record()
      self.recorder = recorder
      self.isRecording = true
      self.meters = []
      self.duration = 0
      startMeterTimer()
    } catch {
      throw AppError.audioRecordingFailed(underlying: error)
    }
  }

  func stopRecording() throws -> URL {
    guard let recorder else {
      throw AppError.audioRecordingFailed(
        underlying: NSError(
          domain: "AudioRecorder",
          code: -1,
          userInfo: [NSLocalizedDescriptionKey: "No active recording"]
        )
      )
    }
    recorder.stop()
    let fileURL = recorder.url
    self.recorder = nil
    self.isRecording = false
    stopMeterTimer()
    return fileURL
  }

  /// Returns true if microphone access is granted (already or after
  /// prompting). Callers that need permission upfront (the new Practice
  /// flow) should await this before tapping record.
  static func requestMicrophonePermission() async -> Bool {
    let session = AVAudioSession.sharedInstance()
    switch session.recordPermission {
    case .granted:
      return true
    case .denied:
      return false
    case .undetermined:
      return await withCheckedContinuation { continuation in
        session.requestRecordPermission { granted in
          continuation.resume(returning: granted)
        }
      }
    @unknown default:
      return false
    }
  }

  // MARK: - Metering

  private func startMeterTimer() {
    meterTimer?.invalidate()
    meterTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
      Task { @MainActor in
        guard let self, let recorder = self.recorder else { return }
        recorder.updateMeters()
        let raw = recorder.averagePower(forChannel: 0)
        let normalized = self.normalize(dBFS: raw)
        var next = self.meters
        next.append(normalized)
        if next.count > self.meterBufferSize {
          next.removeFirst(next.count - self.meterBufferSize)
        }
        self.meters = next
        self.duration = recorder.currentTime
      }
    }
  }

  private func stopMeterTimer() {
    meterTimer?.invalidate()
    meterTimer = nil
  }

  /// Map AVAudioRecorder's dBFS reading (−160…0) to a 0…1 amplitude.
  /// `−60 dBFS` is treated as the noise floor; below that becomes 0.
  private func normalize(dBFS: Float) -> Float {
    let clamped = max(-60, min(0, dBFS))
    return (clamped + 60) / 60
  }
}
