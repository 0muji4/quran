import Foundation

/// Result of a successful sign-in / sign-up: the JWT pair plus the
/// user's public profile. Handed to `SessionStore` which persists it
/// via `TokenStore` and flips the app into its signed-in state.
struct AuthSuccess: Equatable {
  let tokens: AuthTokens
  let user: AuthenticatedUser
}

/// Email + password authentication against the BFF's REST `/auth`
/// endpoints (ADR 0010). Auth is REST, not GraphQL, so this is its own
/// protocol rather than a method on `QuranBackend` — the same split
/// `ReferenceAudioClient` makes for its REST concern. View / ViewModel
/// layers depend only on this protocol; production uses
/// `URLSessionAuthService`, tests inject a mock.
protocol AuthService {
  /// `POST /auth/login`. Throws `AppError.invalidCredentials` on 401,
  /// `.validationFailed` on 400, `.backendUnavailable` on 5xx,
  /// `.network` on transport failure.
  func signIn(email: String, password: String) async throws -> AuthSuccess

  /// `POST /auth/signup`. Throws `AppError.emailInUse` on 409,
  /// `.validationFailed` on 400, `.backendUnavailable` on 5xx,
  /// `.network` on transport failure. `displayName` is omitted from the
  /// request body when `nil`.
  func signUp(email: String, password: String, displayName: String?) async throws -> AuthSuccess

  /// `POST /auth/refresh`. Trades the current refresh token for a
  /// freshly rotated access + refresh pair. Throws
  /// `AppError.invalidCredentials` on 401 — the BFF returns 401 for an
  /// unknown, revoked, or already-redeemed (replay) refresh token, and
  /// each case means the caller must sign the user out. `.network` /
  /// `.backendUnavailable` on transport / 5xx so the caller can retry
  /// without nuking the session.
  func refresh(refreshToken: String) async throws -> AuthTokens
}

/// Production `AuthService` backed by `URLSession`. Every failure path
/// converts to an `AppError` so call sites only handle one error
/// vocabulary (see ADR 0006). Mirrors `HTTPReferenceAudioClient`.
final class URLSessionAuthService: AuthService {
  private let baseURL: URL
  private let session: URLSession

  init(baseURL: URL = AppConfig.restBaseURL, session: URLSession = .shared) {
    self.baseURL = baseURL
    self.session = session
  }

  // MARK: - AuthService

  func signIn(email: String, password: String) async throws -> AuthSuccess {
    try await perform(
      path: "auth/login",
      body: SignInRequestBody(email: email, password: password),
      operation: "auth.signin"
    )
  }

  func signUp(email: String, password: String, displayName: String?) async throws -> AuthSuccess {
    try await perform(
      path: "auth/signup",
      body: SignUpRequestBody(email: email, password: password, displayName: displayName),
      operation: "auth.signup"
    )
  }

  func refresh(refreshToken: String) async throws -> AuthTokens {
    var request = URLRequest(url: baseURL.appendingPathComponent("auth/refresh"))
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")

    do {
      request.httpBody = try JSONEncoder().encode(RefreshRequestBody(refreshToken: refreshToken))
      let (data, response) = try await session.data(for: request)
      guard let http = response as? HTTPURLResponse else {
        throw AppError.network(underlying: URLError(.badServerResponse))
      }
      switch http.statusCode {
      case 200..<300:
        guard let payload = try? JSONDecoder().decode(RefreshResponseBody.self, from: data) else {
          throw AppError.backendUnavailable(operation: "auth.refresh.parse")
        }
        return AuthTokens(accessToken: payload.accessToken, refreshToken: payload.refreshToken)
      case 400:
        throw AppError.validationFailed
      case 401:
        throw AppError.invalidCredentials
      default:
        throw AppError.backendUnavailable(operation: "auth.refresh")
      }
    } catch let error as AppError {
      throw error
    } catch {
      throw AppError.network(underlying: error)
    }
  }

  // MARK: - Request plumbing

  private func perform<Body: Encodable>(
    path: String,
    body: Body,
    operation: String
  ) async throws -> AuthSuccess {
    var request = URLRequest(url: baseURL.appendingPathComponent(path))
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")

    do {
      request.httpBody = try JSONEncoder().encode(body)
      let (data, response) = try await session.data(for: request)
      guard let http = response as? HTTPURLResponse else {
        throw AppError.network(underlying: URLError(.badServerResponse))
      }
      switch http.statusCode {
      case 200..<300:
        return try Self.decodeSuccess(data, operation: operation)
      case 400:
        // zod rejected the payload (email format, password length, …).
        throw AppError.validationFailed
      case 401:
        throw AppError.invalidCredentials
      case 409:
        throw AppError.emailInUse
      default:
        throw AppError.backendUnavailable(operation: operation)
      }
    } catch let error as AppError {
      throw error
    } catch {
      throw AppError.network(underlying: error)
    }
  }

  private static func decodeSuccess(_ data: Data, operation: String) throws -> AuthSuccess {
    guard let payload = try? JSONDecoder().decode(AuthSuccessResponse.self, from: data) else {
      throw AppError.backendUnavailable(operation: "\(operation).parse")
    }
    return AuthSuccess(
      tokens: AuthTokens(
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken
      ),
      user: AuthenticatedUser(
        id: payload.user.id,
        email: payload.user.email,
        displayName: payload.user.displayName,
        createdAt: payload.user.createdAt,
        level: payload.user.level
      )
    )
  }
}

// MARK: - Wire types

/// `POST /auth/signup` body. `displayName` is an optional property, so
/// the synthesised `Encodable` omits it from the JSON when `nil` — the
/// BFF zod schema treats it as optional.
private struct SignUpRequestBody: Encodable {
  let email: String
  let password: String
  let displayName: String?
}

/// `POST /auth/login` body.
private struct SignInRequestBody: Encodable {
  let email: String
  let password: String
}

/// 2xx response shape shared by `/auth/login` and `/auth/signup`.
/// `refreshToken` rides in the JSON body (verified against
/// `apps/bff/src/auth/routes.ts`).
private struct AuthSuccessResponse: Decodable {
  let accessToken: String
  let refreshToken: String
  let user: UserBody

  struct UserBody: Decodable {
    let id: String
    let email: String
    let displayName: String?
    // Optional so this client decodes successfully against a BFF that
    // pre-dates the profile work. The two fields were added together
    // — see `apps/bff/src/auth/routes.ts`.
    let createdAt: String?
    let level: String?
  }
}

/// `POST /auth/refresh` body.
private struct RefreshRequestBody: Encodable {
  let refreshToken: String
}

/// 2xx response shape for `/auth/refresh`. Verified against
/// `apps/bff/src/rest/rest.ts:257` — note the rotation endpoint
/// returns only the JWT pair (no `user` field, since the identity
/// has not changed).
private struct RefreshResponseBody: Decodable {
  let accessToken: String
  let refreshToken: String
}
