import XCTest
@testable import QuranRecitationApp

@MainActor
final class PracticeViewModelTests: XCTestCase {
  func test_initialState_isIdle() {
    let viewModel = makeViewModel()
    XCTAssertEqual(viewModel.state, .idle)
    XCTAssertNil(viewModel.ayah)
    XCTAssertNil(viewModel.surah)
  }

  func test_load_populatesSurahAndAyah() async {
    let backend = MockBackend()
    backend.surahLookup = { id in
      XCTAssertEqual(id, "1")
      return SurahSummary(
        id: "1",
        nameAr: "الفاتحة",
        nameEn: "Al-Fatihah",
        ayahCount: 7,
        revelationPlace: "Mecca"
      )
    }
    backend.ayahLookup = { surahId, ayahNumber in
      XCTAssertEqual(surahId, "1")
      XCTAssertEqual(ayahNumber, 2)
      return AyahDetail(
        id: "1:2",
        surahId: "1",
        ayahNumber: 2,
        textAr: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ"
      )
    }
    let viewModel = makeViewModel(surahId: "1", ayahNumber: 2, backend: backend)

    await viewModel.load()

    XCTAssertEqual(viewModel.surah?.id, "1")
    XCTAssertEqual(viewModel.ayah?.ayahNumber, 2)
    XCTAssertEqual(viewModel.state, .idle)
  }

  func test_load_setsErrorStateOnNetworkFailure() async {
    let backend = MockBackend()
    backend.surahLookup = { _ in throw AppError.network(underlying: NSError(domain: "x", code: 0)) }
    let telemetry = TelemetrySpy()
    let viewModel = makeViewModel(backend: backend, telemetry: telemetry)

    await viewModel.load()

    if case .error(let error) = viewModel.state {
      XCTAssertEqual(error.telemetryCode, "network")
    } else {
      XCTFail("expected .error, got \(viewModel.state)")
    }
    XCTAssertFalse(telemetry.records.isEmpty)
  }

  // MARK: - Helpers

  private func makeViewModel(
    surahId: String = "1",
    ayahNumber: Int = 1,
    backend: MockBackend = MockBackend(),
    telemetry: Telemetry = NoOpTelemetry()
  ) -> PracticeViewModel {
    PracticeViewModel(
      surahId: surahId,
      ayahNumber: ayahNumber,
      backend: backend,
      recorder: AudioRecorder(),
      player: AudioPlayer(),
      historyStore: InMemoryHistoryStore(),
      telemetry: telemetry
    )
  }
}
