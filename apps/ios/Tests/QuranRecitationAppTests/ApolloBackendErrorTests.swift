import XCTest
@testable import QuranRecitationApp

@MainActor
final class ApolloBackendErrorTests: XCTestCase {

  override func setUp() {
    super.setUp()
    FakeURLProtocol.reset()
  }

  override func tearDown() {
    FakeURLProtocol.reset()
    super.tearDown()
  }

  func test_createScoringJob_429_throwsScoringLimitReached() async {
    FakeURLProtocol.handler = { request in
      let body = #"{"errors":[{"message":"scoring job limit reached","extensions":{"code":"RATE_LIMITED"}}]}"#
      let response = HTTPURLResponse(
        url: request.url!,
        statusCode: 429,
        httpVersion: nil,
        headerFields: ["Content-Type": "application/json"]
      )!
      return (response, Data(body.utf8))
    }

    do {
      _ = try await makeBackend().createScoringJob(uploadKey: "uploads/a.webm", surahId: "1", ayahNumber: 1)
      XCTFail("expected an error")
    } catch AppError.scoringLimitReached {
    } catch {
      XCTFail("expected .scoringLimitReached, got \(error)")
    }
  }

  func test_scoringLimitReached_isNotRetriable_andHasItsOwnCopy() {
    let error = AppError.scoringLimitReached

    XCTAssertFalse(error.isRetriable)
    XCTAssertEqual(error.telemetryCode, "scoring_limit_reached")
    XCTAssertEqual(error.errorDescription, "Scoring limit reached")
    XCTAssertEqual(
      error.recoverySuggestion,
      "You have scored many recordings in the past hour. Try again later."
    )
  }

  private func makeBackend() -> ApolloBackend {
    let config = URLSessionConfiguration.ephemeral
    config.protocolClasses = [FakeURLProtocol.self]
    let tokenStore = InMemoryTokenStore(
      tokens: AuthTokens(accessToken: "at", refreshToken: "rt"),
      user: nil
    )
    return ApolloBackend(
      endpoint: URL(string: "https://test.example.com/graphql")!,
      tokenStore: tokenStore,
      refresher: TokenRefresher(authService: MockAuthService(), tokenStore: tokenStore),
      onSignOut: {},
      sessionConfiguration: config
    )
  }
}
