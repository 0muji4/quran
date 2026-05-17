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

  func test_loadReference_setsUnavailableOnError() async {
    let referenceClient = MockReferenceAudioClient(
      result: .failure(.referenceUnavailable(surahId: "1", ayah: 1))
    )
    let viewModel = makeViewModel(referenceClient: referenceClient)

    await viewModel.loadReference()

    XCTAssertEqual(viewModel.teacherState, .unavailable)
  }

  func test_processRecording_setsErrorOnUploadFailure() async {
    let backend = MockBackend()
    backend.signedUploadResult = .failure(.network(underlying: NSError(domain: "x", code: 0)))
    let telemetry = TelemetrySpy()
    let viewModel = makeViewModel(backend: backend, telemetry: telemetry)

    // Drive the upload pipeline directly via the protected entry; the
    // public toggle requires a real recording session which the test
    // recorder cannot stand in for.
    await viewModel.testProcessRecording(
      at: URL(fileURLWithPath: "/tmp/x.m4a"),
      durationMs: 1000
    )

    if case .error(let error) = viewModel.state {
      XCTAssertEqual(error.telemetryCode, "network")
    } else {
      XCTFail("expected .error, got \(viewModel.state)")
    }
    XCTAssertTrue(telemetry.eventNames().contains("practice.scoring.failed"))
  }

  // MARK: - Playback-speed pill

  func test_setReferenceRate_emitsTelemetryAndUpdatesState() async {
    let telemetry = TelemetrySpy()
    let viewModel = makeViewModel(telemetry: telemetry)
    await viewModel.load()

    viewModel.setReferenceRate(0.75)

    XCTAssertTrue(
      telemetry.records.contains { record in
        if case let .event(name, attributes) = record {
          return name == "practice.rate.changed" && attributes["rate"] == "0.75"
        }
        return false
      },
      "expected practice.rate.changed event with the new rate"
    )
  }

  func test_setReferenceRate_sameValue_doesNotEmitTelemetry() async {
    // No-op rate change shouldn't generate noise on the events
    // dashboard. The default rate is 1.0, so set it to 1.0 again.
    let telemetry = TelemetrySpy()
    let viewModel = makeViewModel(telemetry: telemetry)
    await viewModel.load()

    viewModel.setReferenceRate(1.0)

    XCTAssertFalse(
      telemetry.eventNames().contains("practice.rate.changed"),
      "no-op rate set must not emit a change event"
    )
  }

  func test_setReferenceRate_unsupportedValueSnapsToNearest() async {
    // Off-pill values (e.g. 0.6) must clamp to the nearest supported
    // rate rather than reaching the player and producing undefined
    // behaviour. 0.6 is closest to 0.75.
    let telemetry = TelemetrySpy()
    let viewModel = makeViewModel(telemetry: telemetry)
    await viewModel.load()

    viewModel.setReferenceRate(0.6)

    let attributes = telemetry.records.compactMap { record -> [String: String]? in
      if case let .event(name, attrs) = record, name == "practice.rate.changed" { return attrs }
      return nil
    }
    XCTAssertEqual(attributes.first?["rate"], "0.75", "0.6 should snap to the nearest supported rate (0.75)")
  }

  // MARK: - Helpers

  private func makeViewModel(
    surahId: String = "1",
    ayahNumber: Int = 1,
    backend: MockBackend = MockBackend(),
    referenceClient: ReferenceAudioClient = MockReferenceAudioClient(result: .success(
      ReferenceAudio(url: URL(string: "https://example.invalid/ref.mp3")!, expiresAt: nil)
    )),
    telemetry: Telemetry = NoOpTelemetry()
  ) -> PracticeViewModel {
    PracticeViewModel(
      surahId: surahId,
      ayahNumber: ayahNumber,
      backend: backend,
      referenceClient: referenceClient,
      recorder: AudioRecorder(),
      player: AudioPlayer(),
      historyStore: InMemoryHistoryStore(),
      telemetry: telemetry
    )
  }
}

final class MockReferenceAudioClient: ReferenceAudioClient {
  var result: Result<ReferenceAudio, AppError>

  init(result: Result<ReferenceAudio, AppError>) {
    self.result = result
  }

  func referenceAudio(surahId: String, ayahNumber: Int) async throws -> ReferenceAudio {
    switch result {
    case .success(let value): return value
    case .failure(let error): throw error
    }
  }
}
