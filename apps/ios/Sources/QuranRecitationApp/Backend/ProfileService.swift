import Foundation

/// Client for the BFF `/auth/me*` REST surface — read + write of the
/// signed-in user's own profile.
///
/// Kept distinct from `AuthService` (which fronts the unauthenticated
/// `/auth/login`, `/auth/signup`, `/auth/refresh` calls) so the two
/// concerns don't share a single fat protocol: every method here
/// requires a Bearer token, while `AuthService` calls run cookie-less
/// against the public surface. Both are REST rather than GraphQL per
/// ADR-0010.
///
/// `@MainActor` matches `MeClient` and `AuthHTTPClient`: the consumer
/// ViewModels (`ProfileViewModel`, the edit / change / delete sheets)
/// are main-actor isolated and the underlying `TokenStore` access has
/// to stay on the main actor too.
@MainActor
protocol ProfileService {
  /// `GET /auth/me`. Returns the current snapshot so a long-lived
  /// SessionStore can refresh `createdAt` / `level` / `displayName`
  /// without forcing a sign-in round-trip.
  func fetchCurrentUser() async throws -> AuthenticatedUser

  /// `PATCH /auth/me`. `displayName: nil` and `level: nil` mean
  /// "don't touch that column" — distinct from `""` (cleared) which
  /// the BFF zod schema currently rejects with 400. At least one
  /// non-nil field is required; an all-nil call short-circuits before
  /// the network so we don't spend a round trip on a no-op.
  func updateProfile(displayName: String?, level: String?) async throws -> AuthenticatedUser

  /// `POST /auth/me/email`. The BFF re-verifies `currentPassword`
  /// before rotating. Throws `.invalidCredentials` on a wrong current
  /// password, `.emailInUse` if another live row already holds the
  /// new address. No confirmation email is sent (Phase 2.C-lite).
  func updateEmail(currentPassword: String, newEmail: String) async throws -> AuthenticatedUser

  /// `POST /auth/me/password`. Same `.invalidCredentials` mapping as
  /// `updateEmail` for the wrong-current-password path. The BFF does
  /// not revoke other devices' refresh tokens (deliberate — tracked
  /// separately), so the local session stays signed in across the
  /// rotation.
  func updatePassword(currentPassword: String, newPassword: String) async throws

  /// `DELETE /auth/me`. Soft-deletes per ADR-0024: the row enters the
  /// 30-day grace window and a subsequent sign-in within the window
  /// reactivates it. The caller is expected to clear local session
  /// state on success.
  func deleteAccount() async throws
}

@MainActor
final class HTTPProfileService: ProfileService {
  private let baseURL: URL
  private let http: AuthHTTPClient

  init(baseURL: URL = AppConfig.restBaseURL, http: AuthHTTPClient) {
    self.baseURL = baseURL
    self.http = http
  }

  // MARK: - Read

  func fetchCurrentUser() async throws -> AuthenticatedUser {
    var request = URLRequest(url: baseURL.appendingPathComponent("auth/me"))
    request.httpMethod = "GET"
    request.setValue("application/json", forHTTPHeaderField: "Accept")

    let (data, response) = try await http.send(request)
    return try Self.decodeUserResponse(
      data: data,
      response: response,
      operation: "profile.fetch"
    )
  }

  // MARK: - Profile

  func updateProfile(displayName: String?, level: String?) async throws -> AuthenticatedUser {
    if displayName == nil && level == nil {
      // No-op: fall back to the read endpoint so the caller still gets
      // a fresh snapshot to repaint with rather than an arbitrary
      // local copy.
      return try await fetchCurrentUser()
    }

    var request = URLRequest(url: baseURL.appendingPathComponent("auth/me"))
    request.httpMethod = "PATCH"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.httpBody = try Self.encodeBody(
      PatchProfileBody(displayName: displayName, level: level),
      operation: "profile.update"
    )

    let (data, response) = try await http.send(request)
    return try Self.decodeUserResponse(
      data: data,
      response: response,
      operation: "profile.update"
    )
  }

  // MARK: - Email

  func updateEmail(currentPassword: String, newEmail: String) async throws -> AuthenticatedUser {
    var request = URLRequest(url: baseURL.appendingPathComponent("auth/me/email"))
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.httpBody = try Self.encodeBody(
      ChangeEmailBody(currentPassword: currentPassword, newEmail: newEmail),
      operation: "profile.email"
    )

    // retryOn401: false — on this endpoint a 401 means "current
    // password is incorrect" (BFF reuses the auth-failure code for
    // re-verification). Letting AuthHTTPClient interpret it as an
    // expired access token would refresh, retry, get another 401, and
    // sign the user out for getting their password wrong.
    let (data, response) = try await http.send(request, retryOn401: false)
    switch response.statusCode {
    case 200..<300:
      return try Self.decodeUser(from: data, operation: "profile.email")
    case 400:
      throw AppError.validationFailed
    case 401:
      throw AppError.invalidCredentials
    case 409:
      throw AppError.emailInUse
    default:
      throw AppError.backendUnavailable(operation: "profile.email")
    }
  }

  // MARK: - Password

  func updatePassword(currentPassword: String, newPassword: String) async throws {
    var request = URLRequest(url: baseURL.appendingPathComponent("auth/me/password"))
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.httpBody = try Self.encodeBody(
      ChangePasswordBody(currentPassword: currentPassword, newPassword: newPassword),
      operation: "profile.password"
    )

    // retryOn401: false — same overloading as `updateEmail`: 401 here
    // is the current-password rejection, not an expired token.
    let (_, response) = try await http.send(request, retryOn401: false)
    switch response.statusCode {
    case 200..<300:
      return
    case 400:
      throw AppError.validationFailed
    case 401:
      throw AppError.invalidCredentials
    default:
      throw AppError.backendUnavailable(operation: "profile.password")
    }
  }

  // MARK: - Delete

  func deleteAccount() async throws {
    var request = URLRequest(url: baseURL.appendingPathComponent("auth/me"))
    request.httpMethod = "DELETE"
    request.setValue("application/json", forHTTPHeaderField: "Accept")

    let (_, response) = try await http.send(request)
    switch response.statusCode {
    case 200..<300:
      return
    default:
      throw AppError.backendUnavailable(operation: "profile.delete")
    }
  }

  // MARK: - Decode helpers

  private static func decodeUserResponse(
    data: Data,
    response: HTTPURLResponse,
    operation: String
  ) throws -> AuthenticatedUser {
    switch response.statusCode {
    case 200..<300:
      return try decodeUser(from: data, operation: operation)
    case 400:
      throw AppError.validationFailed
    default:
      throw AppError.backendUnavailable(operation: operation)
    }
  }

  private static func decodeUser(from data: Data, operation: String) throws -> AuthenticatedUser {
    guard let payload = try? JSONDecoder().decode(MeResponseBody.self, from: data) else {
      throw AppError.backendUnavailable(operation: "\(operation).parse")
    }
    return AuthenticatedUser(
      id: payload.user.id,
      email: payload.user.email,
      displayName: payload.user.displayName,
      createdAt: payload.user.createdAt,
      level: payload.user.level
    )
  }

  private static func encodeBody<Body: Encodable>(_ body: Body, operation: String) throws -> Data {
    do {
      return try JSONEncoder().encode(body)
    } catch {
      throw AppError.backendUnavailable(operation: "\(operation).encode")
    }
  }
}

// MARK: - Wire types

/// Response shape for `GET /auth/me`, `PATCH /auth/me`, and
/// `POST /auth/me/email`. The BFF envelopes the user under a `user`
/// key so future top-level fields (e.g. paginated event log) can land
/// without breaking the client.
private struct MeResponseBody: Decodable {
  let user: UserBody

  struct UserBody: Decodable {
    let id: String
    let email: String
    let displayName: String?
    let createdAt: String?
    let level: String?
  }
}

private struct PatchProfileBody: Encodable {
  let displayName: String?
  let level: String?
}

private struct ChangeEmailBody: Encodable {
  let currentPassword: String
  let newEmail: String
}

private struct ChangePasswordBody: Encodable {
  let currentPassword: String
  let newPassword: String
}
