import XCTest
@testable import QuranRecitationApp

@MainActor
final class LibraryViewModelTests: XCTestCase {
  func test_load_publishesLoadedStateOnSuccess() async {
    let backend = MockBackend(surahsResult: .success(Self.fixtures))
    let telemetry = TelemetrySpy()
    let viewModel = LibraryViewModel(backend: backend, telemetry: telemetry)

    await viewModel.load()

    if case let .loaded(items) = viewModel.state {
      XCTAssertEqual(items.map(\.id), ["1", "2"])
    } else {
      XCTFail("expected .loaded, got \(viewModel.state)")
    }
    XCTAssertTrue(telemetry.eventNames().contains("library.fetch.succeeded"))
  }

  func test_load_publishesFailedStateOnNetworkError() async {
    let backend = MockBackend(surahsResult: .failure(.network(underlying: NSError(domain: "x", code: 0))))
    let telemetry = TelemetrySpy()
    let viewModel = LibraryViewModel(backend: backend, telemetry: telemetry)

    await viewModel.load()

    if case .failed(let error) = viewModel.state {
      XCTAssertEqual(error.telemetryCode, "network")
    } else {
      XCTFail("expected .failed, got \(viewModel.state)")
    }
    XCTAssertTrue(telemetry.eventNames().contains("library.fetch.failed"))
  }

  func test_surahOpened_emitsTelemetry() {
    let telemetry = TelemetrySpy()
    let viewModel = LibraryViewModel(backend: MockBackend(), telemetry: telemetry)

    viewModel.surahOpened(Self.fixtures[0])

    let openEvents = telemetry.records.filter {
      if case let .event(name, _) = $0 { return name == "library.surah.opened" }
      return false
    }
    XCTAssertEqual(openEvents.count, 1)
  }

  func test_filteredSurahs_appliesQueryAndChip() async {
    let backend = MockBackend(surahsResult: .success(Self.filteringFixtures))
    let viewModel = LibraryViewModel(backend: backend, telemetry: NoOpTelemetry())
    await viewModel.load()

    XCTAssertEqual(viewModel.filteredSurahs.count, 4, "no filters → all surahs")

    viewModel.filter = .mecca
    XCTAssertEqual(viewModel.filteredSurahs.map(\.id), ["1", "112"], "Meccan filter")

    viewModel.filter = .medina
    XCTAssertEqual(viewModel.filteredSurahs.map(\.id), ["2", "3"], "Medinan filter")

    viewModel.filter = .short
    XCTAssertEqual(viewModel.filteredSurahs.map(\.id), ["1", "112"], "≤20 ayahs")

    viewModel.filter = .all
    viewModel.query = "fati"
    XCTAssertEqual(viewModel.filteredSurahs.map(\.id), ["1"], "case-insensitive English match")

    viewModel.query = "ال"
    XCTAssertGreaterThan(viewModel.filteredSurahs.count, 0, "Arabic substring match")

    viewModel.query = "no-such-surah"
    XCTAssertTrue(viewModel.filteredSurahs.isEmpty, "no match → empty")
  }

  // MARK: - Suggestion

  func test_refreshSuggestion_withMeClient_setsSuggestionAndEmitsSuccessTelemetry() async {
    let suggestion = SurahSuggestion.fixture(surahId: "112", reason: .shortUnpracticed)
    let me = MockMeClient(suggestionsResult: .success(suggestion))
    let telemetry = TelemetrySpy()
    let viewModel = LibraryViewModel(backend: MockBackend(), telemetry: telemetry, meClient: me)

    await viewModel.refreshSuggestion()

    XCTAssertEqual(viewModel.suggestion, suggestion)
    XCTAssertEqual(me.suggestionsCallCount, 1)
    XCTAssertTrue(telemetry.eventNames().contains("library.suggestion.succeeded"))
  }

  func test_refreshSuggestion_withoutMeClient_skipsCall_andLeavesSuggestionNil() async {
    let telemetry = TelemetrySpy()
    let viewModel = LibraryViewModel(backend: MockBackend(), telemetry: telemetry, meClient: nil)

    await viewModel.refreshSuggestion()

    XCTAssertNil(viewModel.suggestion)
    XCTAssertFalse(telemetry.eventNames().contains("library.suggestion.succeeded"))
  }

  func test_refreshSuggestion_onFailure_silentlyClearsSuggestion_andLogsError() async {
    let me = MockMeClient(suggestionsResult: .failure(.backendUnavailable(operation: "me.suggestions")))
    let telemetry = TelemetrySpy()
    let viewModel = LibraryViewModel(backend: MockBackend(), telemetry: telemetry, meClient: me)

    await viewModel.refreshSuggestion()

    XCTAssertNil(viewModel.suggestion, "failure must not strand a stale suggestion in the UI")
    XCTAssertTrue(telemetry.eventNames().contains("library.suggestion.failed"))
  }

  func test_clearSuggestion_resetsState() async {
    let me = MockMeClient(suggestionsResult: .success(SurahSuggestion.fixture()))
    let viewModel = LibraryViewModel(backend: MockBackend(), telemetry: NoOpTelemetry(), meClient: me)

    await viewModel.refreshSuggestion()
    XCTAssertNotNil(viewModel.suggestion, "precondition: a suggestion is loaded before clear")

    viewModel.clearSuggestion()

    XCTAssertNil(viewModel.suggestion)
  }

  func test_suggestedTapped_emitsTelemetryWithReason() async {
    let suggestion = SurahSuggestion.fixture(surahId: "112", reason: .shortLowScore)
    let me = MockMeClient(suggestionsResult: .success(suggestion))
    let telemetry = TelemetrySpy()
    let viewModel = LibraryViewModel(backend: MockBackend(), telemetry: telemetry, meClient: me)
    await viewModel.refreshSuggestion()

    viewModel.suggestedTapped(Self.fixtures[0])

    let tappedEvents = telemetry.records.filter {
      if case let .event(name, attributes) = $0 {
        return name == "library.suggested.tapped" && attributes["reason"] == "short_low_score"
      }
      return false
    }
    XCTAssertEqual(tappedEvents.count, 1)
  }

  private static let filteringFixtures: [SurahSummary] = [
    SurahSummary(id: "1", nameAr: "الفاتحة", nameEn: "Al-Fatihah", ayahCount: 7, revelationPlace: "Mecca"),
    SurahSummary(id: "2", nameAr: "البقرة", nameEn: "Al-Baqarah", ayahCount: 286, revelationPlace: "Medina"),
    SurahSummary(id: "112", nameAr: "الإخلاص", nameEn: "Al-Ikhlas", ayahCount: 4, revelationPlace: "Mecca"),
    SurahSummary(id: "3", nameAr: "آل عمران", nameEn: "Aal-Imran", ayahCount: 200, revelationPlace: "Medina")
  ]

  // MARK: - Fixtures

  private static let fixtures: [SurahSummary] = [
    SurahSummary(id: "1", nameAr: "الفاتحة", nameEn: "Al-Fatihah", ayahCount: 7, revelationPlace: "Mecca"),
    SurahSummary(id: "2", nameAr: "البقرة", nameEn: "Al-Baqarah", ayahCount: 286, revelationPlace: "Medina")
  ]
}
