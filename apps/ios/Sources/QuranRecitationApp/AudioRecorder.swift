import AVFoundation

final class AudioRecorder: NSObject, AVAudioRecorderDelegate {
  private var recorder: AVAudioRecorder?

  func startRecording() throws {
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(.playAndRecord, mode: .default)
    try session.setActive(true, options: .notifyOthersOnDeactivation)

    let settings: [String: Any] = [
      AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
      AVSampleRateKey: 44_100,
      AVNumberOfChannelsKey: 1,
      AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
    ]

    let fileURL = FileManager.default.temporaryDirectory
      .appendingPathComponent("recitation-\(UUID().uuidString).m4a")

    let recorder = try AVAudioRecorder(url: fileURL, settings: settings)
    recorder.delegate = self
    recorder.record()
    self.recorder = recorder
  }

  func stopRecording() throws -> URL {
    guard let recorder else {
      throw RecorderError.noActiveRecording
    }

    recorder.stop()
    let fileURL = recorder.url
    self.recorder = nil
    return fileURL
  }
}

enum RecorderError: LocalizedError {
  case noActiveRecording

  var errorDescription: String? {
    switch self {
    case .noActiveRecording:
      return "No active recording found."
    }
  }
}
