import GoogleSignIn
import UIKit

/// Wraps the GoogleSignIn SDK (DD: native Google sign-in, Q4). Given a
/// server-issued nonce, returns the Google ID token, or nil if the user
/// cancels. `serverClientID` is the web client ID, so the token's `aud`
/// is what the BFF verifies; `iosClientID` is the SDK's own client.
@MainActor
struct GoogleSignInClient {
  let iosClientID: String
  let serverClientID: String

  func idToken(nonce: String) async throws -> String? {
    guard let presenter = Self.topViewController() else {
      throw AppError.backendUnavailable(operation: "auth.google.presenter")
    }
    GIDSignIn.sharedInstance.configuration = GIDConfiguration(
      clientID: iosClientID,
      serverClientID: serverClientID
    )
    return try await withCheckedThrowingContinuation { continuation in
      GIDSignIn.sharedInstance.signIn(
        withPresenting: presenter,
        hint: nil,
        additionalScopes: nil,
        nonce: nonce
      ) { result, error in
        if let error {
          // A user-cancelled sheet is not a failure.
          if (error as NSError).code == GIDSignInError.canceled.rawValue {
            continuation.resume(returning: nil)
          } else {
            continuation.resume(throwing: AppError.backendUnavailable(operation: "auth.google"))
          }
          return
        }
        continuation.resume(returning: result?.user.idToken?.tokenString)
      }
    }
  }

  private static func topViewController() -> UIViewController? {
    let scene = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .first { $0.activationState == .foregroundActive }
      ?? UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
    guard var top = scene?.keyWindow?.rootViewController else { return nil }
    while let presented = top.presentedViewController { top = presented }
    return top
  }
}
