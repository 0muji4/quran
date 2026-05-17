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

  /// Whether the teacher reference repeats on finish. Mirrors the
  /// web `TeacherPanel` loop control. Driven by the loop toggle in
  /// `TeacherReferencePanel`.
  @Published private(set) var isLoopEnabled: Bool = false

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
    self.currentAyahNumber = ayahNumber
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

  /// Currently shown ayah number. Mutates via `goToPreviousAyah()` /
  /// `goToNextAyah()`. Reset to `initialAyahNumber` on construction
  /// so deep-link entries (e.g. Library Continue) land where the
  /// caller expects.
  @Published private(set) var currentAyahNumber: Int

  /// True when there is a previous ayah to navigate to. The UI uses
  /// this to disable the prev button on ayah 1.
  var canGoToPreviousAyah: Bool { currentAyahNumber > 1 }

  /// True when there is a next ayah to navigate to. The UI uses
  /// this to disable the next button on the last ayah of the surah.
  /// Reads `surah?.ayahCount` — until the header has loaded, the
  /// next button is conservatively disabled.
  var canGoToNextAyah: Bool {
    guard let count = surah?.ayahCount else { return false }
    return currentAyahNumber < count
  }

  /// Step back one ayah and reload its text and reference audio.
  /// No-op if already on ayah 1. The teacher player is stopped first
  /// so a half-played previous-ayah reference can't bleed into the
  /// new one.
  func goToPreviousAyah() async {
    guard canGoToPreviousAyah else { return }
    await moveTo(ayahNumber: currentAyahNumber - 1, direction: "prev")
  }

  /// Step forward one ayah and reload its text and reference audio.
  /// No-op once past the surah's final ayah.
  func goToNextAyah() async {
    guard canGoToNextAyah else { return }
    await moveTo(ayahNumber: currentAyahNumber + 1, direction: "next")
  }

  private func moveTo(ayahNumber: Int, direction: String) async {
    player.stop()
    if case let .ready(_, _, _, rate) = teacherState {
      // Step out of `.ready` so the panel shows the loading state
      // until the new reference resolves.
      teacherState = .loading
      _ = rate
    } else {
      teacherState = .loading
    }
    currentAyahNumber = ayahNumber
    telemetry.event(
      TelemetryEvent.practiceAyahNavigated,
      attributes: [
        "surah_id": surahId,
        "ayah": String(ayahNumber),
        "direction": direction
      ]
    )
    do {
      let nextAyah = try await backend.ayah(surahId: surahId, ayahNumber: ayahNumber)
      self.ayah = nextAyah
    } catch let error as AppError {
      telemetry.error(error, context: ["screen": "practice", "scope": "ayah-nav"])
      state = .error(error)
    } catch {
      let appError = AppError.network(underlying: error)
      telemetry.error(appError, context: ["screen": "practice", "scope": "ayah-nav"])
      state = .error(appError)
    }
    await loadReference()
  }

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
      // load() builds a fresh AVAudioPlayer so the previous loop
      // flag is lost; re-apply it here so the loop toggle survives
      // ayah changes (and future reloads).
      player.setLoopEnabled(isLoopEnabled)
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

  /// Set the teacher-audio playback rate explicitly. Mirrors the web
  /// `TeacherPanel` 0.75× / 1× / 1.25× pill row. Values outside the
  /// supported set are clamped to the nearest neighbour so a future
  /// caller (e.g. accessibility settings) can't drift the rate into
  /// territory the player doesn't handle gracefully.
  func setReferenceRate(_ rate: Float) {
    let clamped = Self.snapToSupportedRate(rate)
    if clamped == playbackRate { return }
    playbackRate = clamped
    if case let .ready(duration, isPlaying, currentTime, _) = teacherState {
      teacherState = .ready(
        duration: duration,
        isPlaying: isPlaying,
        currentTime: currentTime,
        rate: clamped
      )
      if isPlaying {
        player.play(rate: clamped)
      }
    }
    telemetry.event(
      TelemetryEvent.practiceRateChanged,
      attributes: ["rate": String(format: "%.2f", clamped)]
    )
  }

  /// Supported teacher-audio playback rates. Centralised so the pill
  /// row, telemetry, and the snap-to-nearest helper all stay in sync.
  static let supportedReferenceRates: [Float] = [0.75, 1.0, 1.25]

  /// Toggle the loop-ayah behaviour. When on, the teacher reference
  /// repeats forever on finish; when off it stops and resets. The
  /// new state is pushed straight into `AudioPlayer.numberOfLoops`
  /// — the next reference load reuses the same flag because the
  /// player is shared.
  func toggleLoop() {
    isLoopEnabled.toggle()
    player.setLoopEnabled(isLoopEnabled)
    telemetry.event(
      TelemetryEvent.practiceLoopToggled,
      attributes: ["enabled": String(isLoopEnabled)]
    )
  }

  private static func snapToSupportedRate(_ rate: Float) -> Float {
    supportedReferenceRates.min(by: { abs($0 - rate) < abs($1 - rate) }) ?? 1.0
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
