import Foundation
import SwiftUI

/// State container for the Practice screen. PR 12 lays the foundation
/// (idle scaffold, ayah loading, dependency wiring); PR 13 adds teacher
/// reference playback, PR 14 records, and PR 15 wires the
/// stop → upload → analyse → result transition end-to-end.
@MainActor
final class PracticeViewModel: ObservableObject {
  @Published private(set) var state: PracticeRecordingState = .idle
  @Published private(set) var ayah: AyahDetail?
  @Published private(set) var surah: SurahSummary?
  @Published private(set) var teacherState: TeacherReferencePanel.State = .idle

  /// Reciter name surfaced on the teacher panel. Hard-coded today —
  /// when the BFF starts returning reciter metadata, this becomes a
  /// `@Published` populated by `loadReference()`.
  let reciterName: String = "Husary Mu'allim"

  let surahId: String
  let initialAyahNumber: Int

  private let backend: QuranBackend
  private let referenceClient: ReferenceAudioClient
  let recorder: AudioRecorder
  let player: AudioPlayer
  private let historyStore: HistoryStore
  private let telemetry: Telemetry
  private var playbackRate: Float = 1.0

  init(
    surahId: String,
    ayahNumber: Int,
    backend: QuranBackend,
    referenceClient: ReferenceAudioClient,
    recorder: AudioRecorder,
    player: AudioPlayer,
    historyStore: HistoryStore,
    telemetry: Telemetry
  ) {
    self.surahId = surahId
    self.initialAyahNumber = ayahNumber
    self.backend = backend
    self.referenceClient = referenceClient
    self.recorder = recorder
    self.player = player
    self.historyStore = historyStore
    self.telemetry = telemetry
  }

  /// Load the surah header + the active ayah. Called by `PracticeView`
  /// in `.task`. Failures populate `state = .error(...)` so the View
  /// renders a recoverable empty surface.
  func load() async {
    do {
      async let surah = backend.surah(id: surahId)
      async let ayah = backend.ayah(surahId: surahId, ayahNumber: currentAyahNumber)
      self.surah = try await surah
      self.ayah = try await ayah
      if self.ayah == nil {
        let error = AppError.backendUnavailable(operation: "ayah")
        telemetry.error(error, context: ["screen": "practice"])
        state = .error(error)
      }
    } catch let error as AppError {
      telemetry.error(error, context: ["screen": "practice"])
      state = .error(error)
    } catch {
      let appError = AppError.network(underlying: error)
      telemetry.error(appError, context: ["screen": "practice"])
      state = .error(appError)
    }
  }

  /// Currently shown ayah number. Identical to `initialAyahNumber`
  /// today; PR 21's "Continue to ayah N+1" action will advance it.
  var currentAyahNumber: Int { initialAyahNumber }

  // MARK: - Teacher reference (PR 13)

  /// Fetch the teacher reference URL and load it into `AudioPlayer`.
  /// Failures route to the panel's `.unavailable` state and log to
  /// telemetry — the user can still record their attempt.
  func loadReference() async {
    teacherState = .loading
    do {
      let reference = try await referenceClient.referenceAudio(
        surahId: surahId,
        ayahNumber: currentAyahNumber
      )
      try player.load(url: reference.url)
      teacherState = .ready(
        duration: player.duration,
        isPlaying: false,
        currentTime: 0,
        rate: playbackRate
      )
    } catch let error as AppError {
      telemetry.error(error, context: ["screen": "practice", "scope": "reference"])
      teacherState = .unavailable
    } catch {
      let appError = AppError.network(underlying: error)
      telemetry.error(appError, context: ["screen": "practice", "scope": "reference"])
      teacherState = .unavailable
    }
  }

  func toggleReferencePlayback() {
    guard case let .ready(duration, isPlaying, currentTime, rate) = teacherState else { return }
    if isPlaying {
      player.pause()
    } else {
      player.play(rate: rate)
      telemetry.event(
        TelemetryEvent.practiceReferencePlayed,
        attributes: ["surah_id": surahId, "ayah": String(currentAyahNumber)]
      )
    }
    teacherState = .ready(
      duration: duration,
      isPlaying: !isPlaying,
      currentTime: currentTime,
      rate: rate
    )
  }

  /// Cycle 1.00× → 0.75× → 1.25× → 1.00×.
  func cycleReferenceRate() {
    let next: Float = {
      switch playbackRate {
      case 1.0: return 0.75
      case 0.75: return 1.25
      default: return 1.0
      }
    }()
    playbackRate = next
    if case let .ready(duration, isPlaying, currentTime, _) = teacherState {
      teacherState = .ready(
        duration: duration,
        isPlaying: isPlaying,
        currentTime: currentTime,
        rate: next
      )
      if isPlaying {
        player.play(rate: next)
      }
    }
  }

  // MARK: - Recording (PR 14)

  /// Tap handler for the circular record button. Toggles between idle
  /// and recording. The actual stop → upload → score flow lands in PR 15.
  func toggleRecording() {
    switch state {
    case .idle, .error, .done:
      startRecording()
    case .recording:
      stopRecording()
    case .uploading, .analysing:
      // Ignore taps while a job is in flight; the View should also
      // disable the button via PracticeRecordingState.isBusy.
      return
    }
  }

  private func startRecording() {
    do {
      try recorder.startRecording()
      state = .recording(meters: [], duration: 0)
      observeRecorder()
      telemetry.event(
        TelemetryEvent.practiceRecordingStarted,
        attributes: ["surah_id": surahId, "ayah": String(currentAyahNumber)]
      )
    } catch let error as AppError {
      telemetry.error(error, context: ["screen": "practice"])
      state = .error(error)
    } catch {
      let appError = AppError.audioRecordingFailed(underlying: error)
      telemetry.error(appError, context: ["screen": "practice"])
      state = .error(appError)
    }
  }

  private func stopRecording() {
    let durationMs = Int(recorder.duration * 1000)
    do {
      let recordingURL = try recorder.stopRecording()
      telemetry.event(
        TelemetryEvent.practiceRecordingStopped,
        attributes: ["duration_ms": String(durationMs)]
      )
      Task { await processRecording(at: recordingURL, durationMs: durationMs) }
    } catch let error as AppError {
      telemetry.error(error, context: ["screen": "practice"])
      state = .error(error)
    } catch {
      let appError = AppError.audioRecordingFailed(underlying: error)
      telemetry.error(appError, context: ["screen": "practice"])
      state = .error(appError)
    }
  }

  /// Stop → upload → create job → poll. State transitions to `.uploading`,
  /// then `.analysing(step:)`, then `.done` (or `.error`). On success the
  /// final result is appended to `route` for the View to consume, and
  /// the attempt is persisted via `HistoryStore`.
  @Published var route: [PracticeRoute] = []

  /// Test-only entry point so unit tests can exercise the upload →
  /// score → telemetry pipeline without holding a real recording.
  /// Production code goes through `toggleRecording()`.
  func testProcessRecording(at fileURL: URL, durationMs: Int) async {
    await processRecording(at: fileURL, durationMs: durationMs)
  }

  private func processRecording(at fileURL: URL, durationMs: Int) async {
    state = .uploading
    do {
      let signedUpload = try await telemetry.measure(TelemetryEvent.practiceUploadCompleted) {
        try await backend.requestSignedUploadUrl(
          filename: fileURL.lastPathComponent,
          contentType: "audio/m4a"
        )
      }
      try await backend.uploadAudio(fileURL: fileURL, to: signedUpload.url)

      state = .analysing(step: .transcribing)
      let job = try await backend.createScoringJob(
        uploadKey: signedUpload.uploadKey,
        surahId: surahId,
        ayahNumber: currentAyahNumber
      )
      state = .analysing(step: .comparing)

      let result = try await telemetry.measure(TelemetryEvent.practiceScoringCompleted) {
        try await backend.pollScoringResult(jobId: job.jobId)
      }
      state = .analysing(step: .calculating)

      let appError: AppError? = result.status == .failed
        ? .backendUnavailable(operation: "scoring")
        : nil
      if let appError {
        telemetry.error(appError, context: ["screen": "practice"])
        state = .error(appError)
        return
      }

      recordAttempt(jobId: job.jobId, score: result.score, durationMs: durationMs, status: .completed)
      state = .done(score: result.score, jobId: job.jobId)
      route.append(.result(
        jobId: job.jobId,
        surahId: surahId,
        ayahNumber: currentAyahNumber,
        score: result.score
      ))
    } catch let error as AppError {
      telemetry.error(error, context: ["screen": "practice"])
      recordAttempt(jobId: "", score: nil, durationMs: durationMs, status: .failed)
      state = .error(error)
      telemetry.event(
        TelemetryEvent.practiceScoringFailed,
        attributes: ["error_code": error.telemetryCode]
      )
    } catch {
      let appError = AppError.network(underlying: error)
      telemetry.error(appError, context: ["screen": "practice"])
      state = .error(appError)
    }
  }

  /// Reset back to idle so the user can retry. Drives the
  /// "Record again" CTA on the error panel.
  func resetForRetry() {
    state = .idle
  }

  /// Re-trigger the last reference playback as the "Replay" CTA shortcut.
  func replayLastRecording() {
    if case .ready = teacherState {
      toggleReferencePlayback()
    }
  }

  private func recordAttempt(
    jobId: String,
    score: Double?,
    durationMs: Int,
    status: AttemptStatus
  ) {
    let now = Date()
    historyStore.recordAttempt(Attempt(
      id: UUID().uuidString,
      surahId: surahId,
      surahNameEn: surah?.nameEn ?? surahId,
      ayahNumber: currentAyahNumber,
      score: score,
      jobId: jobId,
      createdAt: now,
      status: status,
      durationMs: durationMs
    ))
    if status == .completed, let score {
      historyStore.recordBestScore(
        surahId: surahId,
        ayahNumber: currentAyahNumber,
        score: score,
        achievedAt: now
      )
    }
    historyStore.setLastPracticed(LastPracticed(
      surahId: surahId,
      ayahNumber: currentAyahNumber,
      surahNameEn: surah?.nameEn ?? surahId,
      surahNameAr: surah?.nameAr ?? "",
      ayahCount: surah?.ayahCount ?? 0,
      practicedAt: now
    ))
  }

  private func observeRecorder() {
    // Mirror AudioRecorder's @Published meters/duration into the
    // PracticeRecordingState.recording associated values so the View
    // binds against the state machine directly.
    Task { @MainActor [weak self] in
      guard let self else { return }
      while case .recording = self.state {
        if self.recorder.isRecording {
          self.state = .recording(
            meters: self.recorder.meters,
            duration: self.recorder.duration
          )
        }
        try? await Task.sleep(nanoseconds: 50_000_000)
      }
    }
  }
}
