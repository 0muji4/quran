import SwiftUI

/// Self-reported recitation experience, chosen on the sign-up screen.
/// Mirrors the web `LEVEL_OPTIONS` (`apps/web/app/(auth)/copy.ts`).
///
/// UI-only this pass: the selection rides in the form but is **not**
/// sent to the BFF — persistence lands with a later DesignDoc, same as
/// the web client.
enum PracticeLevel: String, CaseIterable, Hashable {
  case beginner
  case intermediate
  case advanced

  var label: LocalizedStringKey {
    switch self {
    case .beginner:     return "auth.level.beginner.label"
    case .intermediate: return "auth.level.intermediate.label"
    case .advanced:     return "auth.level.advanced.label"
    }
  }

  var description: LocalizedStringKey {
    switch self {
    case .beginner:     return "auth.level.beginner.description"
    case .intermediate: return "auth.level.intermediate.description"
    case .advanced:     return "auth.level.advanced.description"
    }
  }
}
