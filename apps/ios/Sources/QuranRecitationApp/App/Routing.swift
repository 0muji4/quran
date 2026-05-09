import Foundation

/// Bottom-tab identifiers. The `selectedTab` binding on `AppRoot` uses
/// this enum so cross-tab handoffs (e.g. Library Continue card → Practice)
/// stay type-checked.
enum AppTab: String, Hashable {
  case library
  case practice
  case history
}

/// Library tab destinations. Empty until PR 9 introduces a list and
/// PR 11 wires the Continue card; the enum exists now so each tab's
/// `NavigationPath` is typed against a stable shape.
enum LibraryRoute: Hashable {}

/// Practice tab destinations. PR 12 fills this with `.ayah(...)` and
/// PR 15 with `.result(jobId:)` so navigation past the recording flow
/// is programmatic.
enum PracticeRoute: Hashable {}

/// History tab destinations.
enum HistoryRoute: Hashable {}
