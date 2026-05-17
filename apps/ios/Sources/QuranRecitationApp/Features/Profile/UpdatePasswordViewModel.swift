import Foundation

/// ViewModel for the Update Password sheet. Owns the three input
/// fields, the client-side preflight rules, and the submit lifecycle.
/// Mirrors the web `UpdatePasswordButton` modal — every rule here
/// also runs server-side (BFF zod + `verifyPassword`), so the client
/// checks are UX guards, not security boundaries.
@MainActor
final class UpdatePasswordViewModel: ObservableObject, Identifiable {
  /// Stable per-instance id so `.sheet(item:)` can drive the modal off
  /// "create a fresh ViewModel" rather than a bool. Same pattern as
  /// `EditProfileViewModel`.
  let id = UUID()

  @Published var currentPassword: String = ""
  @Published var newPassword: String = ""
  @Published var confirmPassword: String = ""
  @Published private(set) var status: Status = .idle

  enum Status: Equatable {
    case idle
    case submitting
    case error(String)
  }

  /// Minimum length enforced both here and by the BFF zod schema on
  /// `/auth/signup`. Kept in lockstep — see `apps/bff/src/auth/routes.ts`.
  static let minNewPasswordLength = 8

  private let profileService: ProfileService

  init(profileService: ProfileService) {
    self.profileService = profileService
  }

  var isSubmitting: Bool {
    if case .submitting = status { return true }
    return false
  }

  /// True when every preflight rule passes. Drives the "Update" button
  /// enabled state — submit() still runs preflightError() so a
  /// programmatic call can't bypass the rules.
  var canSubmit: Bool {
    isSubmitting == false && preflightError() == nil
  }

  /// Try to update the password. Returns `true` on success so the
  /// caller can dismiss the sheet. `false` leaves the sheet open with
  /// the error banner.
  func submit() async -> Bool {
    if let validation = preflightError() {
      status = .error(validation)
      return false
    }
    status = .submitting
    do {
      try await profileService.updatePassword(
        currentPassword: currentPassword,
        newPassword: newPassword
      )
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
    if newPassword.count < Self.minNewPasswordLength {
      return "New password must be at least \(Self.minNewPasswordLength) characters."
    }
    if newPassword != confirmPassword {
      return "New password and confirmation don't match."
    }
    if newPassword == currentPassword {
      return "New password must be different from the current one."
    }
    return nil
  }

  // MARK: - Error copy

  static func message(for error: AppError) -> String {
    switch error {
    case .invalidCredentials:
      // ProfileService maps the BFF's 422 ("current password is
      // incorrect") to .invalidCredentials. A real expired-token
      // 401 is handled by AuthHTTPClient before reaching here, so
      // this branch is unambiguously the wrong-password case.
      return "Current password is incorrect."
    case .validationFailed:
      return "Please check the form and try again."
    case .network:
      return "Network error. Check your connection and try again."
    default:
      return fallbackMessage
    }
  }

  static let fallbackMessage = "Couldn't update password. Try again."
}
