import XCTest
@testable import QuranRecitationApp

@MainActor
final class PreferencesViewModelTests: XCTestCase {
  private func fixture(
    reciter: String = "husary-muallim",
    speed: Double = 1,
    reminder: Bool = false,
    time: String = "08:00"
  ) -> PracticePreferences {
    PracticePreferences(
      referenceReciterId: reciter,
      defaultPlaybackSpeed: speed,
      dailyReminderEnabled: reminder,
      dailyReminderTime: time
    )
  }

  func test_loadIfNeeded_populatesFromServer_once() async {
    let mock = MockMeClient()
    mock.preferencesResult = .success(fixture(speed: 1.75, reminder: true, time: "06:15"))
    let sut = PreferencesViewModel(meClient: mock)

    await sut.loadIfNeeded()
    await sut.loadIfNeeded()  // second call is a no-op

    XCTAssertTrue(sut.isLoaded)
    XCTAssertEqual(sut.preferences.defaultPlaybackSpeed, 1.75)
    XCTAssertEqual(sut.preferences.dailyReminderTime, "06:15")
    XCTAssertEqual(mock.preferencesCallCount, 1)
  }

  func test_loadIfNeeded_failure_keepsDefaults() async {
    let mock = MockMeClient()
    mock.preferencesResult = .failure(.backendUnavailable(operation: "test"))
    let sut = PreferencesViewModel(meClient: mock)

    await sut.loadIfNeeded()

    XCTAssertTrue(sut.isLoaded)
    XCTAssertEqual(sut.preferences, .default)
    XCTAssertNil(sut.errorMessage)
  }

  func test_setPlaybackSpeed_appliesServerEcho_andSendsPatch() async {
    let mock = MockMeClient()
    mock.updatePreferencesResult = .success(fixture(speed: 1.5))
    let sut = PreferencesViewModel(meClient: mock)

    await sut.setPlaybackSpeed(1.5)

    XCTAssertEqual(sut.preferences.defaultPlaybackSpeed, 1.5)
    XCTAssertEqual(mock.lastPreferencesPatch?.defaultPlaybackSpeed, 1.5)
    XCTAssertNil(mock.lastPreferencesPatch?.referenceReciterId)
    XCTAssertNil(sut.errorMessage)
  }

  func test_setReminderEnabled_failure_rollsBackAndSurfacesError() async {
    let mock = MockMeClient()
    mock.updatePreferencesResult = .failure(.backendUnavailable(operation: "test"))
    let sut = PreferencesViewModel(meClient: mock, preferences: fixture(reminder: false))

    await sut.setReminderEnabled(true)

    // Optimistic flip reverted to the pre-edit value.
    XCTAssertFalse(sut.preferences.dailyReminderEnabled)
    XCTAssertEqual(sut.errorMessage, PreferencesViewModel.saveFailedMessage)
  }
}

final class PracticePreferencesHelperTests: XCTestCase {
  func test_reminderClock_roundTrips() {
    let parsed = ReminderClock.parse("07:05")
    XCTAssertEqual(parsed.hour, 7)
    XCTAssertEqual(parsed.minute, 5)
    XCTAssertEqual(ReminderClock.format(hour: 7, minute: 5), "07:05")
  }

  func test_reminderClock_malformed_fallsBackToEight() {
    XCTAssertEqual(ReminderClock.parse("not-a-time").hour, 8)
    XCTAssertEqual(ReminderClock.parse("25:99").hour, 8)
    XCTAssertEqual(ReminderClock.parse("9").minute, 0)
  }

  func test_playbackSpeedLabel_trimsTrailingZero() {
    XCTAssertEqual(PlaybackSpeedOption.label(1), "1×")
    XCTAssertEqual(PlaybackSpeedOption.label(0.75), "0.75×")
    XCTAssertEqual(PlaybackSpeedOption.label(1.5), "1.5×")
  }

  func test_reciterOption_unknownId_fallsBackToFirst() {
    XCTAssertEqual(ReciterOption.option(for: "does-not-exist").id, ReciterOption.all[0].id)
  }
}
