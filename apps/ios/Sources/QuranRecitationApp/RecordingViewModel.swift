import AVFoundation
import SwiftUI

@MainActor
final class RecordingViewModel: ObservableObject {
  @Published var surahId: String = "1"
  @Published var isRecording = false
  @Published var isBusy = false
  @Published var statusText = "Idle"
  @Published var scoringResult: ScoringResultViewData?
  @Published var surahSummary: SurahSummary?
  @Published var showError = false
  @Published var errorMessage = ""
  @Published var uploadDestinationDescription: String?

  private let recorder: AudioRecorder
  private let backend: QuranBackend
  private let telemetry: Telemetry

  init(
    recorder: AudioRecorder? = nil,
    backend: QuranBackend = ApolloBackend(),
    telemetry: Telemetry = NoOpTelemetry()
  ) {
    // `recorder` is optional + lazily defaulted because `AudioRecorder()` is
    // `@MainActor`-isolated and a parameter default expression runs in the
    // caller's actor context, which may be non-isolated (e.g. inside a
    // `@StateObject` initializer expression).
    self.recorder = recorder ?? AudioRecorder()
    self.backend = backend
    self.telemetry = telemetry
  }

  var statusColor: Color {
    switch statusText {
    case "Recording":
      return .red
    case "Uploading", "Scoring":
      return .orange
    case "Completed":
      return .green
    case "Failed":
      return .pink
    default:
      return .gray
    }
  }

  func toggleRecording() {
    if isRecording {
      Task { await stopAndScore() }
    } else {
      startRecording()
    }
  }

  private func startRecording() {
    do {
      try recorder.startRecording()
      isRecording = true
      statusText = "Recording"
    } catch {
      presentError(error)
    }
  }

  private func stopAndScore() async {
    isRecording = false
    isBusy = true
    statusText = "Uploading"

    do {
      let recording = try recorder.stopRecording()
      let signedUpload = try await backend.requestSignedUploadUrl(
        filename: recording.lastPathComponent,
        contentType: "audio/m4a"
      )
      uploadDestinationDescription = "PUT \(signedUpload.url) (expires \(signedUpload.expiresAt))"
      try await backend.uploadAudio(fileURL: recording, to: signedUpload.url)

      statusText = "Scoring"
      let job = try await backend.createScoringJob(
        uploadKey: signedUpload.uploadKey,
        surahId: surahId,
        ayahNumber: nil
      )

      let finalResult = try await backend.pollScoringResult(jobId: job.jobId)
      scoringResult = ScoringResultViewData(result: finalResult)
      statusText = finalResult.status == .completed ? "Completed" : "Failed"
    } catch let error as AppError {
      statusText = "Failed"
      telemetry.error(error, context: ["screen": "legacy_recorder"])
      presentError(error)
    } catch {
      statusText = "Failed"
      presentError(error)
    }

    isBusy = false
  }

  private func presentError(_ error: Error) {
    errorMessage = error.localizedDescription
    showError = true
  }
}

struct ScoringResultViewData {
  let score: Double?
  let verdict: String?
  let segments: [ScoreSegmentViewData]

  init(result: ScoringResultPayload) {
    score = result.score
    verdict = result.verdict
    segments = result.segmentLabelScores().map { ScoreSegmentViewData(data: $0) }
  }

  var scoreText: String {
    guard let score else { return "--" }
    return String(format: "%.2f", score)
  }
}

/// UI-friendly presentation of a scoring segment.
struct ScoreSegmentViewData {
  let label: String
  let score: Double

  init(data: ScoreSegmentData) {
    label = data.label
    score = data.score
  }
}
