import Foundation
@testable import QuranRecitationApp

/// Configurable `AuthService` test double. Each method returns the
/// corresponding `Result`, defaulting to a `.backendUnavailable`
/// failure when unset, and records what it was called with so tests
/// can assert on the request shape. Mirrors `MockBackend`.
final class MockAuthService: AuthService {
  var signInResult: Result<AuthSuccess, AppError>?
  var signUpResult: Result<AuthSuccess, AppError>?

  private(set) var signInCallCount = 0
  private(set) var signUpCallCount = 0
  private(set) var lastSignInEmail: String?
  private(set) var lastSignInPassword: String?
  private(set) var lastSignUpEmail: String?
  private(set) var lastSignUpPassword: String?
  /// Double optional so tests can tell "never called" (`nil`) apart
  /// from "called with no display name" (`.some(nil)`).
  private(set) var lastSignUpDisplayName: String??

  init(
    signInResult: Result<AuthSuccess, AppError>? = nil,
    signUpResult: Result<AuthSuccess, AppError>? = nil
  ) {
    self.signInResult = signInResult
    self.signUpResult = signUpResult
  }

  func signIn(email: String, password: String) async throws -> AuthSuccess {
    signInCallCount += 1
    lastSignInEmail = email
    lastSignInPassword = password
    return try Self.unwrap(signInResult)
  }

  func signUp(email: String, password: String, displayName: String?) async throws -> AuthSuccess {
    signUpCallCount += 1
    lastSignUpEmail = email
    lastSignUpPassword = password
    lastSignUpDisplayName = displayName
    return try Self.unwrap(signUpResult)
  }

  private static func unwrap(_ result: Result<AuthSuccess, AppError>?) throws -> AuthSuccess {
    guard let result else { throw AppError.backendUnavailable(operation: "mock.auth") }
    switch result {
    case .success(let value): return value
    case .failure(let error): throw error
    }
  }
}

extension AuthSuccess {
  /// Convenience fixture for tests.
  static func fixture(
    accessToken: String = "access-jwt",
    refreshToken: String = "refresh-jwt",
    id: String = "user-1",
    email: String = "noor@example.com",
    displayName: String? = "Noor"
  ) -> AuthSuccess {
    AuthSuccess(
      tokens: AuthTokens(accessToken: accessToken, refreshToken: refreshToken),
      user: AuthenticatedUser(id: id, email: email, displayName: displayName)
    )
  }
}
