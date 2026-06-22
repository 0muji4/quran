import Foundation

/// ViewModel for the Edit Profile sheet. Backs `displayName` and `level`
/// inputs, owns the submit lifecycle, and propagates the BFF's
/// refreshed user shape back into `SessionStore` so the header repaints
/// without a re-sign-in.
@MainActor
final class EditProfileViewModel: ObservableObject, Identifiable {
  /// Stable per-instance id so `.sheet(item:)` can drive the modal off
  /// "create a fresh ViewModel" rather than a bool — that pattern owns
  /// ViewModel lifetime in the parent View and avoids the @StateObject
  /// re-init pitfall.
  let id = UUID()

  /// Skill bucket options offered by the form. Mirrors the BFF zod
  /// schema (`apps/bff/src/auth/users.ts:VALID_LEVELS`). Kept here as
  /// raw strings so the wire mapping is one place and the SwiftUI
  /// Picker can iterate them directly.
  static let levelOptions: [String] = ["beginner", "intermediate", "advanced"]

  @Published var displayName: String
  /// `nil` means "no skill bucket selected" — distinct from any string
  /// value. Persisting `nil` is valid and clears the column server-
  /// side.
  @Published var level: String?
  @Published private(set) var status: Status = .idle

  enum Status: Equatable {
    case idle
    case submitting
    case error(String)
  }

  /// The persisted initial for the sheet's avatar, captured at open
  /// time so it doesn't flicker as the user edits the name field.
  let avatarInitial: String

  private let initialDisplayName: String
  private let initialLevel: String?
  private let profileService: ProfileService
  private let session: SessionStore

  init(user: AuthenticatedUser, profileService: ProfileService, session: SessionStore) {
    let trimmed = (user.displayName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    self.displayName = trimmed
    self.level = user.level
    self.avatarInitial = ProfileHeader.initial(displayName: user.displayName, email: user.email)
    self.initialDisplayName = trimmed
    self.initialLevel = user.level
    self.profileService = profileService
    self.session = session
  }

  /// True when the form has at least one delta vs. the initial user
  /// snapshot. Drives the "Save" button's enabled state — the form
  /// won't fire a no-op PATCH against the BFF.
  var hasChanges: Bool {
    let trimmed = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed != initialDisplayName || level != initialLevel
  }

  var isSubmitting: Bool {
    if case .submitting = status { return true }
    return false
  }

  /// `Save` is enabled when the form has a real delta vs. the initial
  /// snapshot AND clearing a non-empty displayName isn't being
  /// attempted (the BFF zod schema rejects an empty string; the
  /// "remove your name" flow has no UX yet and would lock the form on
  /// a 400). Initial-nil display names stay nullable until the user
  /// types something.
  var canSubmit: Bool {
    if isSubmitting { return false }
    guard hasChanges else { return false }
    let trimmed = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
    if !initialDisplayName.isEmpty && trimmed.isEmpty {
      return false
    }
    return true
  }

  /// Submit the diff to the BFF. Returns `true` on success so the
  /// caller can dismiss the sheet. `false` leaves the sheet open with
  /// the error banner.
  func submit() async -> Bool {
    status = .submitting
    let trimmed = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
    // `displayName` and `level` are PATCHed only when changed —
    // ProfileService treats nil here as "leave the column alone" so a
    // user editing just their level doesn't bounce displayName through
    // the form.
    let displayDelta = trimmed != initialDisplayName ? trimmed : nil
    let levelDelta = level != initialLevel ? level : nil
    do {
      let user = try await profileService.updateProfile(
        displayName: displayDelta,
        level: levelDelta
      )
      session.updateUser(user)
      status = .idle
      return true
    } catch let error as AppError {
      status = .error(Self.message(for: error))
      return false
    } catch {
      status = .error(Self.fallbackMessage)
      return false
    }
  }

  /// Public so the sheet can reset its banner when the user edits a
  /// field. Mirrors the Web pattern of clearing the error on input.
  func clearError() {
    if case .error = status {
      status = .idle
    }
  }

  // MARK: - Error copy

  static func message(for error: AppError) -> String {
    switch error {
    case .validationFailed:
      return "Please check the form and try again."
    case .network:
      return "Network error. Check your connection and try again."
    case .invalidCredentials:
      // Shouldn't reach here on the profile-update path (no current-
      // password verification), but if AuthHTTPClient evicts the
      // session mid-flight the sheet still shows a sensible string.
      return "Your session has expired. Sign in again."
    default:
      return fallbackMessage
    }
  }

  static let fallbackMessage = "Couldn't save changes. Try again."
}
