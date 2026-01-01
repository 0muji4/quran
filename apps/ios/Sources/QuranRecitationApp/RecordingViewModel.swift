import AVFoundation
import SwiftUI

@MainActor
final class RecordingViewModel: ObservableObject {
  @Published var surahId: String = "1"
  @Published var isRecording = false
  @Published var isBusy = false
  @Published var statusText = "Idle"
  @Published var scoringResult: ScoringResultViewData?
  @Published var showError = false
  @Published var errorMessage = ""

  private let recorder = AudioRecorder()
  private let apiClient = QuranAPIClient()

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
      let signedUpload = try await apiClient.getSignedUploadUrl(
        filename: recording.lastPathComponent,
        contentType: "audio/m4a"
      )
      try await apiClient.uploadAudio(fileURL: recording, to: signedUpload.url)

      statusText = "Scoring"
      let job = try await apiClient.createScoringJob(
        uploadKey: signedUpload.uploadKey,
        surahId: surahId
      )

      let finalResult = try await apiClient.pollScoringResult(jobId: job.jobId)
      scoringResult = ScoringResultViewData(result: finalResult)
      statusText = finalResult.status == .completed ? "Completed" : "Failed"
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
    segments = result.segments.map { ScoreSegmentViewData(segment: $0) }
  }

  var scoreText: String {
    guard let score else { return "--" }
    return String(format: "%.2f", score)
  }
}

struct ScoreSegmentViewData {
  let label: String
  let score: Double

  init(segment: ScoreSegmentPayload) {
    label = segment.label
    score = segment.score
  }
}
