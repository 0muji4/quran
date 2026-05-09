import Foundation
import SwiftUI

/// State container for the Result detail screen. Initialised with the
/// job metadata pushed from `PracticeViewModel.processRecording`; if a
/// future deep-link wants to land on Result without going through
/// Practice, the same ViewModel can refetch via `ScoringJobQuery`.
@MainActor
final class ResultDetailViewModel: ObservableObject {
  enum LoadState: Equatable {
    case idle
    case loading
    case loaded(ScoringResultPayload)
    case failed(AppError)

    static func == (lhs: LoadState, rhs: LoadState) -> Bool {
      switch (lhs, rhs) {
      case (.idle, .idle), (.loading, .loading): return true
      case let (.loaded(a), .loaded(b)): return a.jobId == b.jobId
      case let (.failed(a), .failed(b)): return a.telemetryCode == b.telemetryCode
      default: return false
      }
    }
  }

  @Published private(set) var state: LoadState

  let jobId: String
  let surahId: String
  let ayahNumber: Int

  private let backend: QuranBackend
  private let telemetry: Telemetry

  init(
    jobId: String,
    surahId: String,
    ayahNumber: Int,
    initialResult: ScoringResultPayload? = nil,
    backend: QuranBackend,
    telemetry: Telemetry
  ) {
    self.jobId = jobId
    self.surahId = surahId
    self.ayahNumber = ayahNumber
    self.backend = backend
    self.telemetry = telemetry
    self.state = initialResult.map(LoadState.loaded) ?? .idle
  }

  func loadIfNeeded() async {
    guard case .idle = state else { return }
    state = .loading
    do {
      let result = try await backend.pollScoringResult(jobId: jobId)
      state = .loaded(result)
    } catch let error as AppError {
      telemetry.error(error, context: ["screen": "result"])
      state = .failed(error)
    } catch {
      let appError = AppError.network(underlying: error)
      telemetry.error(appError, context: ["screen": "result"])
      state = .failed(appError)
    }
  }

  func tryAgainTapped() {
    telemetry.event(
      TelemetryEvent.resultTryAgainTapped,
      attributes: ["surah_id": surahId, "ayah": String(ayahNumber)]
    )
  }

  func continueTapped() {
    telemetry.event(
      TelemetryEvent.resultContinueTapped,
      attributes: [
        "surah_id": surahId,
        "next_ayah": String(ayahNumber + 1)
      ]
    )
  }
}
