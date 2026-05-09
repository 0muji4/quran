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
}
