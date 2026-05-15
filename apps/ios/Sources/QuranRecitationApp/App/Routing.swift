import Foundation

/// Bottom-tab identifiers. The `selectedTab` binding on `AppRoot` uses
/// this enum so cross-tab handoffs (e.g. Library Continue card → Practice)
/// stay type-checked.
enum AppTab: String, Hashable {
  case library
  case practice
  case history
  case profile
}

/// Library tab destinations. Empty until PR 9 introduces a list and
/// PR 11 wires the Continue card; the enum exists now so each tab's
/// `NavigationPath` is typed against a stable shape.
enum LibraryRoute: Hashable {}

/// Practice tab destinations. `.result` is appended to the
/// `NavigationPath` after a scoring job reaches a terminal status so
/// the result detail screen can pop back into Practice cleanly.
enum PracticeRoute: Hashable {
  case result(jobId: String, surahId: String, ayahNumber: Int, score: Double?)
}

/// History tab destinations.
enum HistoryRoute: Hashable {}

/// Profile-tab auth destinations. The Profile tab's `NavigationStack`
/// has the profile content as its root; `.signIn` / `.signUp` are
/// pushed when the user taps into the auth forms. The two cross-link
/// to each other and pop back to the profile content on success.
enum AuthRoute: Hashable {
  case signIn
  case signUp
}
