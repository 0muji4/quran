import Foundation

/// ViewModel for the Delete Account confirm sheet. Drives
/// `DELETE /auth/me` (soft delete per ADR-0024). On a successful
/// submit the local session is dropped via `SessionStore.signOut()`
/// so the UI flips back to the signed-out shell; the row stays in
/// the BFF database for 30 days, after which the purge job removes
/// it permanently.
@MainActor
final class DeleteAccountViewModel: ObservableObject, Identifiable {
  /// Stable per-instance id so `.sheet(item:)` can drive the modal
  /// off "create a fresh ViewModel" rather than a bool. Same pattern
  /// as the other Profile sheet ViewModels.
  let id = UUID()

  /// The phrase the user must type to enable the destructive button.
  /// Capitalisation is intentional — matches the web modal and makes
  /// the action feel deliberate instead of a single-tap mistake.
  static let confirmationPhrase = "DELETE"

  @Published var confirmText: String = ""
  @Published private(set) var status: Status = .idle

  enum Status: Equatable {
    case idle
    case submitting
    case error(String)
  }

  private let profileService: ProfileService
  private let session: SessionStore

  init(profileService: ProfileService, session: SessionStore) {
    self.profileService = profileService
    self.session = session
  }

  var isSubmitting: Bool {
    if case .submitting = status { return true }
    return false
  }

  /// True iff the user has typed the exact confirmation phrase. A
  /// strict equality (not contains, not case-insensitive) keeps the
  /// destructive button gated until intent is unambiguous.
  var canSubmit: Bool {
    !isSubmitting && confirmText == Self.confirmationPhrase
  }

  /// Returns `true` on a successful soft-delete; the caller signs
  /// out and dismisses the sheet. The local sign-out happens here
  /// rather than the caller so a successful BFF call can't be
  /// followed by a UI path that leaves the user signed in with a
  /// soft-deleted row (would surface as immediate 401s next request).
  func submit() async -> Bool {
    guard confirmText == Self.confirmationPhrase else {
      status = .error(Self.preflightMessage)
      return false
    }
    status = .submitting
    do {
      try await profileService.deleteAccount()
      session.signOut()
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

  func clearError() {
    if case .error = status { status = .idle }
  }

  // MARK: - Error copy

  static let preflightMessage = "Type DELETE to confirm."

  static func message(for error: AppError) -> String {
    switch error {
    case .network:
      return "Network error. Check your connection and try again."
    case .invalidCredentials:
      // The DELETE endpoint runs over the standard Bearer flow
      // (retryOn401: true), so a 401 means the rotated refresh
      // also failed and AuthHTTPClient has already signed us out.
      // The sheet will be torn down by the parent's session
      // observer; meanwhile show neutral copy rather than nothing.
      return "Your session has expired. Sign in again."
    default:
      return fallbackMessage
    }
  }

  static let fallbackMessage = "Couldn't delete your account. Try again."
}
