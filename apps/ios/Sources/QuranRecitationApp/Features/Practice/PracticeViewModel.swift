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

  let surahId: String
  let initialAyahNumber: Int

  private let backend: QuranBackend
  private let recorder: AudioRecorder
  private let player: AudioPlayer
  private let historyStore: HistoryStore
  private let telemetry: Telemetry

  init(
    surahId: String,
    ayahNumber: Int,
    backend: QuranBackend,
    recorder: AudioRecorder,
    player: AudioPlayer,
    historyStore: HistoryStore,
    telemetry: Telemetry
  ) {
    self.surahId = surahId
    self.initialAyahNumber = ayahNumber
    self.backend = backend
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
}
