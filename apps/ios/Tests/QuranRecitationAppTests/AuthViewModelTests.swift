import XCTest
@testable import QuranRecitationApp

@MainActor
final class AuthViewModelTests: XCTestCase {
  func test_canSubmit_requiresEmailAndPassword() {
    let viewModel = makeViewModel()
    XCTAssertFalse(viewModel.canSubmit, "empty form")

    viewModel.email = "noor@example.com"
    XCTAssertFalse(viewModel.canSubmit, "password still empty")

    viewModel.password = "secret"
    XCTAssertTrue(viewModel.canSubmit, "email + password present")

    viewModel.email = "   "
    XCTAssertFalse(viewModel.canSubmit, "whitespace-only email")
  }

  func test_canSubmitSignUp_requires8CharacterPassword() {
    let viewModel = makeViewModel()
    viewModel.email = "noor@example.com"

    viewModel.password = "short"
    XCTAssertFalse(viewModel.canSubmitSignUp, "<8-char password is rejected for sign-up")
    XCTAssertTrue(viewModel.canSubmit, "but the same password is fine for sign-in (legacy accounts)")

    viewModel.password = "exactly8"
    XCTAssertTrue(viewModel.canSubmitSignUp, "exactly 8 characters meets the sign-up minimum")
  }

  func test_signIn_success_persistsSessionAndInvokesOnSuccess() async {
    let expected = AuthSuccess.fixture()
    let service = MockAuthService(signInResult: .success(expected))
    let session = SessionStore(tokenStore: InMemoryTokenStore())
    let telemetry = TelemetrySpy()
    let viewModel = AuthViewModel(authService: service, session: session, telemetry: telemetry)
    viewModel.email = "  noor@example.com "
    viewModel.password = "correct-horse"

    var succeeded = false
    await viewModel.signIn { succeeded = true }

    XCTAssertTrue(succeeded)
    XCTAssertFalse(viewModel.isSubmitting)
    XCTAssertNil(viewModel.error)
    XCTAssertEqual(service.lastSignInEmail, "noor@example.com", "email is trimmed before the call")
    XCTAssertEqual(session.currentUser, expected.user, "session store is updated")
    XCTAssertTrue(telemetry.eventNames().contains("auth.signin.succeeded"))
  }

  func test_signIn_invalidCredentials_setsErrorAndSkipsSessionSave() async {
    let service = MockAuthService(signInResult: .failure(.invalidCredentials))
    let session = SessionStore(tokenStore: InMemoryTokenStore())
    let viewModel = AuthViewModel(authService: service, session: session, telemetry: TelemetrySpy())
    viewModel.email = "noor@example.com"
    viewModel.password = "wrong-password"

    var succeeded = false
    await viewModel.signIn { succeeded = true }

    XCTAssertFalse(succeeded)
    XCTAssertFalse(viewModel.isSubmitting)
    XCTAssertEqual(viewModel.error?.telemetryCode, "invalid_credentials")
    XCTAssertNil(session.currentUser, "session is left untouched on failure")
  }

  func test_signIn_networkError_mapsToNetworkAppError() async {
    let underlying = NSError(domain: "test", code: -1)
    let service = MockAuthService(signInResult: .failure(.network(underlying: underlying)))
    let viewModel = makeViewModel(service: service)
    viewModel.email = "noor@example.com"
    viewModel.password = "secret"

    await viewModel.signIn { }

    XCTAssertEqual(viewModel.error?.telemetryCode, "network")
  }

  func test_editingEmail_clearsPriorError() async {
    let service = MockAuthService(signInResult: .failure(.invalidCredentials))
    let viewModel = makeViewModel(service: service)
    viewModel.email = "noor@example.com"
    viewModel.password = "wrong-password"
    await viewModel.signIn { }
    XCTAssertNotNil(viewModel.error)

    viewModel.email = "retry@example.com"

    XCTAssertNil(viewModel.error, "editing a field clears the stale error banner")
  }

  func test_signUp_withoutAcceptingTerms_surfacesTermsErrorAndSkipsApi() async {
    let service = MockAuthService()
    let viewModel = makeViewModel(service: service)
    viewModel.email = "noor@example.com"
    viewModel.password = "long-enough-pw"
    // agreedToTerms stays false

    var succeeded = false
    await viewModel.signUp { succeeded = true }

    XCTAssertFalse(succeeded)
    XCTAssertTrue(viewModel.termsError)
    XCTAssertEqual(service.signUpCallCount, 0)
  }

  func test_checkingTerms_clearsTermsError() async {
    let viewModel = makeViewModel()
    viewModel.email = "noor@example.com"
    viewModel.password = "long-enough-pw"
    await viewModel.signUp { }
    XCTAssertTrue(viewModel.termsError)

    viewModel.agreedToTerms = true

    XCTAssertFalse(viewModel.termsError)
  }

  func test_signUp_emailInUse_setsErrorAndClearsTermsError() async {
    let service = MockAuthService(signUpResult: .failure(.emailInUse))
    let viewModel = makeViewModel(service: service)
    viewModel.email = "taken@example.com"
    viewModel.password = "long-enough-pw"
    viewModel.agreedToTerms = true

    await viewModel.signUp { }

    XCTAssertEqual(viewModel.error?.telemetryCode, "email_in_use")
    XCTAssertFalse(viewModel.termsError)
  }

  func test_signUp_success_trimsDisplayNameAndNeverSendsLevel() async {
    let service = MockAuthService(signUpResult: .success(.fixture()))
    let session = SessionStore(tokenStore: InMemoryTokenStore())
    let viewModel = AuthViewModel(authService: service, session: session, telemetry: TelemetrySpy())
    viewModel.email = "noor@example.com"
    viewModel.password = "long-enough-pw"
    viewModel.displayName = "  Noor  "
    viewModel.selectedLevel = .advanced
    viewModel.agreedToTerms = true

    await viewModel.signUp { }

    XCTAssertEqual(service.signUpCallCount, 1)
    XCTAssertEqual(service.lastSignUpEmail, "noor@example.com")
    XCTAssertEqual(service.lastSignUpDisplayName, .some("Noor"), "display name is trimmed")
    // `AuthService.signUp` has no level parameter — the selection is
    // structurally unable to reach the BFF this pass.
    XCTAssertEqual(session.currentUser?.id, "user-1")
  }

  func test_signUp_blankDisplayName_sendsNil() async {
    let service = MockAuthService(signUpResult: .success(.fixture()))
    let viewModel = makeViewModel(service: service)
    viewModel.email = "noor@example.com"
    viewModel.password = "long-enough-pw"
    viewModel.displayName = "   "
    viewModel.agreedToTerms = true

    await viewModel.signUp { }

    XCTAssertEqual(service.lastSignUpDisplayName, .some(nil), "blank name is sent as nil")
  }

  // MARK: - Helpers

  func test_signInWithGoogle_success_persistsSessionAndInvokesOnSuccess() async {
    let expected = AuthSuccess.fixture()
    let service = MockAuthService()
    service.requestGoogleNonceResult = .success("nonce-1")
    service.signInWithGoogleResult = .success(expected)
    let session = SessionStore(tokenStore: InMemoryTokenStore())
    let viewModel = AuthViewModel(authService: service, session: session, telemetry: TelemetrySpy())

    var capturedNonce: String?
    var succeeded = false
    await viewModel.signInWithGoogle(
      getIdToken: { nonce in
        capturedNonce = nonce
        return "id-token"
      },
      onSuccess: { succeeded = true }
    )

    XCTAssertTrue(succeeded)
    XCTAssertFalse(viewModel.isSubmitting)
    XCTAssertNil(viewModel.error)
    XCTAssertEqual(capturedNonce, "nonce-1")
    XCTAssertEqual(service.lastGoogleIDToken, "id-token")
    XCTAssertEqual(session.currentUser, expected.user)
  }

  func test_signInWithGoogle_cancellation_isNotAnErrorAndSkipsTheCall() async {
    let service = MockAuthService()
    service.requestGoogleNonceResult = .success("nonce-1")
    let session = SessionStore(tokenStore: InMemoryTokenStore())
    let viewModel = AuthViewModel(authService: service, session: session, telemetry: TelemetrySpy())

    var succeeded = false
    await viewModel.signInWithGoogle(getIdToken: { _ in nil }, onSuccess: { succeeded = true })

    XCTAssertFalse(succeeded)
    XCTAssertFalse(viewModel.isSubmitting)
    XCTAssertNil(viewModel.error)
    XCTAssertEqual(service.signInWithGoogleCallCount, 0)
    XCTAssertNil(session.currentUser)
  }

  func test_signInWithGoogle_linkRequired_setsErrorAndSkipsSessionSave() async {
    let service = MockAuthService()
    service.requestGoogleNonceResult = .success("nonce-1")
    service.signInWithGoogleResult = .failure(.googleLinkRequired)
    let session = SessionStore(tokenStore: InMemoryTokenStore())
    let viewModel = AuthViewModel(authService: service, session: session, telemetry: TelemetrySpy())

    var succeeded = false
    await viewModel.signInWithGoogle(getIdToken: { _ in "id-token" }, onSuccess: { succeeded = true })

    XCTAssertFalse(succeeded)
    XCTAssertEqual(viewModel.error?.telemetryCode, "google_link_required")
    XCTAssertNil(session.currentUser)
  }

  private func makeViewModel(service: AuthService = MockAuthService()) -> AuthViewModel {
    AuthViewModel(
      authService: service,
      session: SessionStore(tokenStore: InMemoryTokenStore()),
      telemetry: NoOpTelemetry()
    )
  }
}
