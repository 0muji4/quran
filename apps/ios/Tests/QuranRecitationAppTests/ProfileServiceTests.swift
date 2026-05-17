import XCTest
@testable import QuranRecitationApp

@MainActor
final class ProfileServiceTests: XCTestCase {
  private let tokens = AuthTokens(accessToken: "access", refreshToken: "refresh")

  // MARK: - fetchCurrentUser

  func test_fetchCurrentUser_decodesEnvelope() async throws {
    let body = Data("""
      {
        "user": {
          "id": "user-1",
          "email": "noor@example.com",
          "displayName": "Noor",
          "createdAt": "2026-01-04T12:00:00.000Z",
          "level": "intermediate"
        }
      }
      """.utf8)
    let spy = TransportSpy(responses: [
      { (body, httpResponse(status: 200)) }
    ])
    let service = makeService(transport: spy.transport())

    let user = try await service.fetchCurrentUser()

    XCTAssertEqual(user.id, "user-1")
    XCTAssertEqual(user.email, "noor@example.com")
    XCTAssertEqual(user.displayName, "Noor")
    XCTAssertEqual(user.createdAt, "2026-01-04T12:00:00.000Z")
    XCTAssertEqual(user.level, "intermediate")
    XCTAssertEqual(spy.requests.first?.httpMethod, "GET")
    XCTAssertEqual(spy.requests.first?.url?.path, "/auth/me")
    XCTAssertEqual(spy.authorizationHeaders, ["Bearer access"])
  }

  func test_fetchCurrentUser_502_throwsBackendUnavailable() async {
    let spy = TransportSpy(responses: [
      { (Data(), httpResponse(status: 502)) }
    ])
    let service = makeService(transport: spy.transport())

    await XCTAssertThrowsErrorAsync(try await service.fetchCurrentUser()) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "backend_unavailable")
    }
  }

  func test_fetchCurrentUser_malformedBody_throwsBackendUnavailable() async {
    let spy = TransportSpy(responses: [
      { (Data("not-json".utf8), httpResponse(status: 200)) }
    ])
    let service = makeService(transport: spy.transport())

    await XCTAssertThrowsErrorAsync(try await service.fetchCurrentUser()) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "backend_unavailable")
    }
  }

  // MARK: - updateProfile

  func test_updateProfile_sendsPatchAndDecodesUpdatedUser() async throws {
    let body = Data("""
      {
        "user": {
          "id": "user-1",
          "email": "noor@example.com",
          "displayName": "Noor Updated",
          "createdAt": "2026-01-04T12:00:00.000Z",
          "level": "advanced"
        }
      }
      """.utf8)
    let spy = TransportSpy(responses: [
      { (body, httpResponse(status: 200)) }
    ])
    let service = makeService(transport: spy.transport())

    let user = try await service.updateProfile(displayName: "Noor Updated", level: "advanced")

    XCTAssertEqual(user.displayName, "Noor Updated")
    XCTAssertEqual(user.level, "advanced")
    let request = try XCTUnwrap(spy.requests.first)
    XCTAssertEqual(request.httpMethod, "PATCH")
    XCTAssertEqual(request.url?.path, "/auth/me")
    let payload = try Self.decodeUTF8(request.httpBody)
    XCTAssertTrue(payload.contains(#""displayName":"Noor Updated""#))
    XCTAssertTrue(payload.contains(#""level":"advanced""#))
  }

  func test_updateProfile_allNilFields_fallsBackToFetch() async throws {
    // No-op update should not waste a PATCH; the service routes
    // through GET /auth/me instead so the caller still gets a fresh
    // snapshot to repaint with.
    let body = Data("""
      {
        "user": {
          "id": "user-1",
          "email": "noor@example.com",
          "displayName": "Noor",
          "createdAt": "2026-01-04T12:00:00.000Z",
          "level": "intermediate"
        }
      }
      """.utf8)
    let spy = TransportSpy(responses: [
      { (body, httpResponse(status: 200)) }
    ])
    let service = makeService(transport: spy.transport())

    _ = try await service.updateProfile(displayName: nil, level: nil)

    XCTAssertEqual(spy.requests.count, 1)
    XCTAssertEqual(spy.requests.first?.httpMethod, "GET")
  }

  func test_updateProfile_400_throwsValidationFailed() async {
    let spy = TransportSpy(responses: [
      { (Data(), httpResponse(status: 400)) }
    ])
    let service = makeService(transport: spy.transport())

    await XCTAssertThrowsErrorAsync(
      try await service.updateProfile(displayName: "", level: nil)
    ) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "validation_failed")
    }
  }

  // MARK: - updateEmail

  func test_updateEmail_200_returnsUpdatedUser() async throws {
    let body = Data("""
      {
        "user": {
          "id": "user-1",
          "email": "new@example.com",
          "displayName": "Noor",
          "createdAt": "2026-01-04T12:00:00.000Z",
          "level": "intermediate"
        }
      }
      """.utf8)
    let spy = TransportSpy(responses: [
      { (body, httpResponse(status: 200)) }
    ])
    let service = makeService(transport: spy.transport())

    let user = try await service.updateEmail(
      currentPassword: "correct-horse",
      newEmail: "new@example.com"
    )

    XCTAssertEqual(user.email, "new@example.com")
    let request = try XCTUnwrap(spy.requests.first)
    XCTAssertEqual(request.url?.path, "/auth/me/email")
    let payload = try Self.decodeUTF8(request.httpBody)
    XCTAssertTrue(payload.contains(#""currentPassword":"correct-horse""#))
    XCTAssertTrue(payload.contains(#""newEmail":"new@example.com""#))
  }

  func test_updateEmail_401_throwsInvalidCredentialsWithoutSigningOut() async {
    // 401 on /auth/me/email means "current password is incorrect".
    // The service must reject without going through the refresh-retry
    // dance — otherwise a wrong-password guess would force-sign-out the
    // user. The TransportSpy is primed with a single response: if
    // AuthHTTPClient tried to refresh, the spy would XCTFail on
    // exhaustion.
    var signOutFired = false
    let spy = TransportSpy(responses: [
      { (Data(), httpResponse(status: 401)) }
    ])
    let service = makeService(transport: spy.transport(), onSignOut: { signOutFired = true })

    await XCTAssertThrowsErrorAsync(
      try await service.updateEmail(currentPassword: "wrong", newEmail: "new@example.com")
    ) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "invalid_credentials")
    }
    XCTAssertEqual(spy.requests.count, 1, "expected no refresh round-trip on overloaded 401")
    XCTAssertFalse(signOutFired, "401 from /auth/me/email must not evict the session")
  }

  func test_updateEmail_409_throwsEmailInUse() async {
    let spy = TransportSpy(responses: [
      { (Data(), httpResponse(status: 409)) }
    ])
    let service = makeService(transport: spy.transport())

    await XCTAssertThrowsErrorAsync(
      try await service.updateEmail(currentPassword: "ok", newEmail: "taken@example.com")
    ) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "email_in_use")
    }
  }

  func test_updateEmail_400_throwsValidationFailed() async {
    let spy = TransportSpy(responses: [
      { (Data(), httpResponse(status: 400)) }
    ])
    let service = makeService(transport: spy.transport())

    await XCTAssertThrowsErrorAsync(
      try await service.updateEmail(currentPassword: "ok", newEmail: "not-an-email")
    ) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "validation_failed")
    }
  }

  // MARK: - updatePassword

  func test_updatePassword_204_returns() async throws {
    let spy = TransportSpy(responses: [
      { (Data(), httpResponse(status: 204)) }
    ])
    let service = makeService(transport: spy.transport())

    try await service.updatePassword(currentPassword: "old", newPassword: "new-strong-pw")

    let request = try XCTUnwrap(spy.requests.first)
    XCTAssertEqual(request.httpMethod, "POST")
    XCTAssertEqual(request.url?.path, "/auth/me/password")
    let payload = try Self.decodeUTF8(request.httpBody)
    XCTAssertTrue(payload.contains(#""currentPassword":"old""#))
    XCTAssertTrue(payload.contains(#""newPassword":"new-strong-pw""#))
  }

  func test_updatePassword_401_throwsInvalidCredentialsWithoutSigningOut() async {
    var signOutFired = false
    let spy = TransportSpy(responses: [
      { (Data(), httpResponse(status: 401)) }
    ])
    let service = makeService(transport: spy.transport(), onSignOut: { signOutFired = true })

    await XCTAssertThrowsErrorAsync(
      try await service.updatePassword(currentPassword: "wrong", newPassword: "new-pw")
    ) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "invalid_credentials")
    }
    XCTAssertEqual(spy.requests.count, 1)
    XCTAssertFalse(signOutFired)
  }

  func test_updatePassword_400_throwsValidationFailed() async {
    let spy = TransportSpy(responses: [
      { (Data(), httpResponse(status: 400)) }
    ])
    let service = makeService(transport: spy.transport())

    await XCTAssertThrowsErrorAsync(
      try await service.updatePassword(currentPassword: "old", newPassword: "short")
    ) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "validation_failed")
    }
  }

  // MARK: - deleteAccount

  func test_deleteAccount_204_returns() async throws {
    let spy = TransportSpy(responses: [
      { (Data(), httpResponse(status: 204)) }
    ])
    let service = makeService(transport: spy.transport())

    try await service.deleteAccount()

    let request = try XCTUnwrap(spy.requests.first)
    XCTAssertEqual(request.httpMethod, "DELETE")
    XCTAssertEqual(request.url?.path, "/auth/me")
    XCTAssertEqual(spy.authorizationHeaders, ["Bearer access"])
  }

  func test_deleteAccount_502_throwsBackendUnavailable() async {
    let spy = TransportSpy(responses: [
      { (Data(), httpResponse(status: 502)) }
    ])
    let service = makeService(transport: spy.transport())

    await XCTAssertThrowsErrorAsync(try await service.deleteAccount()) { error in
      XCTAssertEqual((error as? AppError)?.telemetryCode, "backend_unavailable")
    }
  }

  // MARK: - Helpers

  private func makeService(
    transport: @escaping AuthHTTPClient.Transport,
    onSignOut: @escaping @MainActor () -> Void = {}
  ) -> HTTPProfileService {
    let tokenStore = InMemoryTokenStore(tokens: tokens, user: nil)
    let authService = MockAuthService(refreshResult: .success(tokens))
    let refresher = TokenRefresher(authService: authService, tokenStore: tokenStore)
    let http = AuthHTTPClient(
      transport: transport,
      tokenStore: tokenStore,
      refresher: refresher,
      onSignOut: onSignOut
    )
    return HTTPProfileService(baseURL: URL(string: "https://api.example.com")!, http: http)
  }

  private static func decodeUTF8(_ data: Data?) throws -> String {
    let unwrapped = try XCTUnwrap(data, "request body was nil")
    return try XCTUnwrap(String(data: unwrapped, encoding: .utf8), "request body was not UTF-8")
  }
}

// MARK: - Async assertion helper

private func XCTAssertThrowsErrorAsync<T>(
  _ expression: @autoclosure () async throws -> T,
  file: StaticString = #filePath,
  line: UInt = #line,
  _ assert: (Error) -> Void = { _ in }
) async {
  do {
    _ = try await expression()
    XCTFail("expected expression to throw", file: file, line: line)
  } catch {
    assert(error)
  }
}

