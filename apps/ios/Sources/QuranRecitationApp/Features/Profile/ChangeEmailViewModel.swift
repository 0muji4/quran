import Foundation

/// ViewModel for the Change Email sheet. Drives
/// `POST /auth/me/email` (Phase 2.C-lite — no confirmation mail is
/// sent; the BFF trusts the re-verified current password as proof of
/// intent, see ADR-0024 follow-ups).
///
/// On success the refreshed `AuthenticatedUser` lands back in
/// `SessionStore`, so the header / Account card repaint without
/// forcing a re-sign-in.
@MainActor
final class ChangeEmailViewModel: ObservableObject, Identifiable {
  /// Stable per-instance id so `.sheet(item:)` can drive the modal
  /// off "create a fresh ViewModel" rather than a bool. Same pattern
  /// as `EditProfileViewModel` / `UpdatePasswordViewModel`.
  let id = UUID()

  @Published var currentPassword: String = ""
  @Published var newEmail: String = ""
  @Published private(set) var status: Status = .idle

  enum Status: Equatable {
    case idle
    case submitting
    case error(String)
  }

  private let initialEmail: String
  private let profileService: ProfileService
  private let session: SessionStore

  init(currentEmail: String, profileService: ProfileService, session: SessionStore) {
    self.initialEmail = currentEmail
    self.profileService = profileService
    self.session = session
  }

  var isSubmitting: Bool {
    if case .submitting = status { return true }
    return false
  }

  /// True when every preflight rule passes. `submit()` still re-runs
  /// the preflight so a programmatic call can't bypass the rules.
  var canSubmit: Bool {
    !isSubmitting && preflightError() == nil
  }

  func submit() async -> Bool {
    if let validation = preflightError() {
      status = .error(validation)
      return false
    }
    status = .submitting
    let trimmedEmail = newEmail.trimmingCharacters(in: .whitespacesAndNewlines)
    do {
      let user = try await profileService.updateEmail(
        currentPassword: currentPassword,
        newEmail: trimmedEmail
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

  func clearError() {
    if case .error = status { status = .idle }
  }

  // MARK: - Preflight

  func preflightError() -> String? {
    if currentPassword.isEmpty {
      return "Enter your current password."
    }
    let trimmed = newEmail.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.isEmpty {
      return "Enter a new email address."
    }
    if !Self.isPlausibleEmail(trimmed) {
      return "Enter a valid email address."
    }
    if trimmed.caseInsensitiveCompare(initialEmail) == .orderedSame {
      return "New email must be different from your current one."
    }
    return nil
  }

  /// Minimal local-part@domain.tld check. The BFF zod schema does the
  /// authoritative validation; this only blocks obvious typos so the
  /// user gets feedback before spending a network round-trip.
  static func isPlausibleEmail(_ value: String) -> Bool {
    let pattern = #"^[^\s@]+@[^\s@]+\.[^\s@]+$"#
    return value.range(of: pattern, options: .regularExpression) != nil
  }

  // MARK: - Error copy

  static func message(for error: AppError) -> String {
    switch error {
    case .invalidCredentials:
      // ProfileService maps the BFF's 422 ("current password is
      // incorrect") to .invalidCredentials so this branch covers
      // the re-verification failure without conflating it with a
      // genuine expired-token sign-out (which AuthHTTPClient
      // handles before the response reaches us).
      return "Current password is incorrect."
    case .emailInUse:
      return "An account with this email already exists."
    case .validationFailed:
      return "Please check the form and try again."
    case .network:
      return "Network error. Check your connection and try again."
    default:
      return fallbackMessage
    }
  }

  static let fallbackMessage = "Couldn't update email. Try again."
}
