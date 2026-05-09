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

  // MARK: - Fixtures

  private static let fixtures: [SurahSummary] = [
    SurahSummary(id: "1", nameAr: "الفاتحة", nameEn: "Al-Fatihah", ayahCount: 7, revelationPlace: "Mecca"),
    SurahSummary(id: "2", nameAr: "البقرة", nameEn: "Al-Baqarah", ayahCount: 286, revelationPlace: "Medina")
  ]
}
