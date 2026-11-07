import Apollo
import ApolloAPI
import Foundation

/// Mirror of `apps/android/.../backend/BearerAuthInterceptor.kt`. Adds
/// `Authorization: Bearer <accessToken>` from `TokenStore` to every
/// GraphQL request, and on a 401 re-fires the chain once after asking
/// `TokenRefresher` for a rotated pair. On a confirmed auth failure
/// (refresh rejected / rotated token also rejected) the `onSignOut`
/// hook fires so the UI flips back to the signed-out shell.
///
/// Both are `GraphQLInterceptor`s rather than `HTTPInterceptor`s because
/// only a `GraphQLRequest` can be handed back to the chain as a
/// `RequestChain.Retry`. `ResponseCodeInterceptor`, in Apollo's default
/// HTTP interceptors, turns the 401 into a thrown `ResponseCodeError`,
/// which `RefreshOn401Interceptor` catches on the way back up. After a
/// successful refresh, throwing `Retry` restarts from the top of the
/// chain, so `BearerAuthInterceptor` re-reads `TokenStore` and picks up
/// the rotated access token automatically.
///
/// A custom header (`X-Tilawah-Auth-Retried`) marks the retried
/// request so a second 401 surfaces as sign-out instead of an infinite
/// refresh loop.

/// Pre-flight interceptor that stamps `Authorization` on every
/// outbound GraphQL request. Reads `TokenStore` on each invocation so
/// post-refresh retries pick up the rotated access token without any
/// extra wiring.
struct BearerAuthInterceptor: GraphQLInterceptor {
  let tokenStore: TokenStore

  func intercept<Request: GraphQLRequest>(
    request: Request,
    next: NextInterceptorFunction<Request>
  ) async throws -> InterceptorResultStream<Request> {
    var request = request
    if let tokens = tokenStore.loadTokens() {
      // Replace rather than append so the retried request after a
      // refresh ends up with exactly one Authorization header pointing
      // at the rotated access token.
      request.addHeader(name: "Authorization", value: "Bearer \(tokens.accessToken)")
    }
    return await next(request)
  }
}

/// Post-flight interceptor that detects a 401, asks `TokenRefresher`
/// to rotate, marks the request as retried via a custom header, and
/// re-fires the chain. A second 401 — or a refresh that itself
/// returns `AppError.invalidCredentials` — triggers `onSignOut`.
struct RefreshOn401Interceptor: GraphQLInterceptor {
  static let retryHeaderName = "X-Tilawah-Auth-Retried"

  let refresher: TokenRefresher
  let onSignOut: @MainActor () -> Void

  func intercept<Request: GraphQLRequest>(
    request: Request,
    next: NextInterceptorFunction<Request>
  ) async throws -> InterceptorResultStream<Request> {
    await next(request).mapErrors { [refresher, onSignOut] error in
      guard
        let responseCodeError = error as? ResponseCodeInterceptor.ResponseCodeError,
        responseCodeError.response.statusCode == 401
      else {
        throw error
      }

      if request.additionalHeaders[Self.retryHeaderName] != nil {
        // The rotated token was also rejected — refresh path is dead,
        // cut the session and surface the original 401.
        await onSignOut()
        throw error
      }

      do {
        _ = try await refresher.refresh()
      } catch AppError.invalidCredentials {
        // Refresh token revoked / replayed — fresh /auth/login
        // required. Any other error is transient (network / 5xx) and
        // surfaces as-is so the caller can retry without stranding the
        // user.
        await onSignOut()
        throw AppError.invalidCredentials
      }

      var retried = request
      retried.addHeader(name: Self.retryHeaderName, value: "1")
      throw RequestChain<Request>.Retry(request: retried)
    }
  }
}

/// `InterceptorProvider` that puts the two auth interceptors ahead of
/// Apollo's default GraphQL interceptors. `RefreshOn401Interceptor`'s
/// `Retry` then reaches the chain without passing through the defaults.
struct AuthInterceptorProvider: InterceptorProvider {
  let tokenStore: TokenStore
  let refresher: TokenRefresher
  let onSignOut: @MainActor () -> Void

  func graphQLInterceptors<Operation: GraphQLOperation>(
    for operation: Operation
  ) -> [any GraphQLInterceptor] {
    [
      BearerAuthInterceptor(tokenStore: tokenStore),
      RefreshOn401Interceptor(refresher: refresher, onSignOut: onSignOut)
    ] + DefaultInterceptorProvider.shared.graphQLInterceptors(for: operation)
  }
}
