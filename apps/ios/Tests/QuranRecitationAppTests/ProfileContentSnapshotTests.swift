import SwiftUI
import XCTest
@testable import QuranRecitationApp

/// Renders the Profile tab in each state, in every `RenderVariant` (ADR 0027).
@MainActor
final class ProfileContentSnapshotTests: XCTestCase {
  func test_signedIn() { snapshot(user: Self.amina, preferences: .default) }

  func test_reminderOn() {
    var preferences = PracticePreferences.default
    preferences.dailyReminderEnabled = true
    preferences.dailyReminderTime = "08:00"
    snapshot(user: Self.amina, preferences: preferences)
  }

  func test_welcomeBack() { snapshot(user: Self.amina, preferences: .default, banner: true) }

  func test_signedOut() { snapshot(user: nil, preferences: nil) }

  private func snapshot(
    user: AuthenticatedUser?,
    preferences: PracticePreferences?,
    banner: Bool = false,
    testName: String = #function,
    line: UInt = #line
  ) {
    let content = ProfileContent(
      user: user,
      preferences: preferences,
      preferencesError: nil,
      streakDays: 5,
      showReactivationBanner: banner,
      // Enabled sheet actions, as when the profile service is available.
      actions: ProfileActions(
        onEditProfile: {}, onChangeEmail: {}, onUpdatePassword: {}, onDeleteAccount: {})
    )
    // In a navigation stack, as in the Profile tab, so the large title is drawn.
    // Signed in, the whole page is captured (it scrolls on a phone); signed out
    // fits the height of the pinned simulator's screen (iPhone 17 Pro).
    let screen = NavigationStack { content }
      .frame(height: user == nil ? 874 : 1600)
      .frame(maxHeight: .infinity, alignment: .top)
    for variant in RenderVariant.all {
      assertSnapshot(of: screen, in: variant, testName: testName, line: line)
    }
  }

  private static let amina = AuthenticatedUser(
    id: "user-1",
    email: "amina@example.com",
    displayName: "Amina",
    createdAt: "2026-03-01T09:00:00Z",
    level: "intermediate",
    passwordChangedAt: "2026-11-02T10:00:00Z"
  )
}
