import Foundation
@testable import QuranRecitationApp

/// Configurable `ProfileService` test double. Each method returns the
/// corresponding `Result`, defaulting to a `.backendUnavailable`
/// failure when unset, and records its arguments so tests can assert
/// on the request shape. Mirrors `MockAuthService`.
@MainActor
final class MockProfileService: ProfileService {
  var fetchCurrentUserResult: Result<AuthenticatedUser, AppError>?
  var updateProfileResult: Result<AuthenticatedUser, AppError>?
  var updateEmailResult: Result<AuthenticatedUser, AppError>?
  var updatePasswordResult: Result<Void, AppError>?
  var deleteAccountResult: Result<Void, AppError>?

  private(set) var fetchCurrentUserCallCount = 0
  private(set) var updateProfileCallCount = 0
  private(set) var updateEmailCallCount = 0
  private(set) var updatePasswordCallCount = 0
  private(set) var deleteAccountCallCount = 0

  // Double optionals so tests can tell "never called" (`nil`) apart
  // from "called with nil" (`.some(nil)`).
  private(set) var lastUpdateProfileDisplayName: String??
  private(set) var lastUpdateProfileLevel: String??
  private(set) var lastUpdateEmailCurrentPassword: String?
  private(set) var lastUpdateEmailNewEmail: String?
  private(set) var lastUpdatePasswordCurrentPassword: String?
  private(set) var lastUpdatePasswordNewPassword: String?

  func fetchCurrentUser() async throws -> AuthenticatedUser {
    fetchCurrentUserCallCount += 1
    return try Self.unwrap(fetchCurrentUserResult, operation: "mock.profile.fetch")
  }

  func updateProfile(displayName: String?, level: String?) async throws -> AuthenticatedUser {
    updateProfileCallCount += 1
    lastUpdateProfileDisplayName = displayName
    lastUpdateProfileLevel = level
    return try Self.unwrap(updateProfileResult, operation: "mock.profile.update")
  }

  func updateEmail(currentPassword: String, newEmail: String) async throws -> AuthenticatedUser {
    updateEmailCallCount += 1
    lastUpdateEmailCurrentPassword = currentPassword
    lastUpdateEmailNewEmail = newEmail
    return try Self.unwrap(updateEmailResult, operation: "mock.profile.email")
  }

  func updatePassword(currentPassword: String, newPassword: String) async throws {
    updatePasswordCallCount += 1
    lastUpdatePasswordCurrentPassword = currentPassword
    lastUpdatePasswordNewPassword = newPassword
    try Self.unwrapVoid(updatePasswordResult, operation: "mock.profile.password")
  }

  func deleteAccount() async throws {
    deleteAccountCallCount += 1
    try Self.unwrapVoid(deleteAccountResult, operation: "mock.profile.delete")
  }

  private static func unwrap<T>(_ result: Result<T, AppError>?, operation: String) throws -> T {
    guard let result else { throw AppError.backendUnavailable(operation: operation) }
    switch result {
    case .success(let value): return value
    case .failure(let error): throw error
    }
  }

  private static func unwrapVoid(_ result: Result<Void, AppError>?, operation: String) throws {
    guard let result else { throw AppError.backendUnavailable(operation: operation) }
    switch result {
    case .success: return
    case .failure(let error): throw error
    }
  }
}
