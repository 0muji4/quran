import Apollo
import ApolloAPI
import Foundation

/// Mirror of `apps/android/.../backend/BearerAuthInterceptor.kt`. Adds
/// `Authorization: Bearer <accessToken>` from `TokenStore` to every
/// GraphQL request, and on a 401 re-fires the chain once after asking
/// `TokenRefresher` for a rotated pair. On a confirmed auth failure
/// (no token / refresh rejected / rotated token also rejected) the
/// `onSignOut` hook fires so the UI flips back to the signed-out shell.
///
/// Why two interceptors plus a provider rather than one combined type:
/// Apollo iOS v1 walks the interceptor chain forward only, so the same
/// instance can't reliably observe both pre-network (to add the header)
/// and post-network (to inspect the response code). Splitting into a
/// pre-flight `BearerAuthInterceptor` and a post-flight
/// `RefreshOn401Interceptor` keeps each one focused on a single
/// concern, and the provider stitches them into the default chain at
/// well-defined positions.
///
/// The `RefreshOn401Interceptor` is inserted **before**
/// `ResponseCodeInterceptor` so the chain can observe a 401 response
/// before `ResponseCodeInterceptor` turns it into a thrown
/// `ResponseCodeError.invalidResponseCode`. After a successful refresh
/// the request is re-fired through `chain.retry`, which restarts from
/// the top of the chain — `BearerAuthInterceptor` re-reads `TokenStore`
/// and picks up the rotated access token automatically.
///
/// A custom header (`X-Tilawah-Auth-Retried`) marks the retried
/// request so a second 401 surfaces as sign-out instead of an infinite
/// refresh loop.

/// Pre-flight interceptor that stamps `Authorization` on every
/// outbound GraphQL request. Reads `TokenStore` on each invocation so
/// post-refresh retries pick up the rotated access token without any
/// extra wiring.
final class BearerAuthInterceptor: ApolloInterceptor {
  var id: String { "BearerAuthInterceptor" }

  private let tokenStore: TokenStore

  init(tokenStore: TokenStore) {
    self.tokenStore = tokenStore
  }

  func interceptAsync<Operation: GraphQLOperation>(
    chain: any RequestChain,
    request: HTTPRequest<Operation>,
    response: HTTPResponse<Operation>?,
    completion: @escaping (Result<GraphQLResult<Operation.Data>, Error>) -> Void
  ) {
    if let tokens = tokenStore.loadTokens() {
      // Replace rather than append so the retried request after a
      // refresh ends up with exactly one Authorization header pointing
      // at the rotated access token.
      request.addHeader(name: "Authorization", value: "Bearer \(tokens.accessToken)")
    }
    chain.proceedAsync(
      request: request,
      response: response,
      interceptor: self,
      completion: completion
    )
  }
}

/// Post-network interceptor (placed just before
/// `ResponseCodeInterceptor`) that detects 401, asks `TokenRefresher`
/// to rotate, marks the request as retried via a custom header, and
/// re-fires the chain. A second 401 — or a refresh that itself
/// returns `AppError.invalidCredentials` — triggers `onSignOut`.
final class RefreshOn401Interceptor: ApolloInterceptor {
  var id: String { "RefreshOn401Interceptor" }

  static let retryHeaderName = "X-Tilawah-Auth-Retried"

  private let refresher: TokenRefresher
  private let onSignOut: @MainActor () -> Void

  init(refresher: TokenRefresher, onSignOut: @escaping @MainActor () -> Void) {
    self.refresher = refresher
    self.onSignOut = onSignOut
  }

  func interceptAsync<Operation: GraphQLOperation>(
    chain: any RequestChain,
    request: HTTPRequest<Operation>,
    response: HTTPResponse<Operation>?,
    completion: @escaping (Result<GraphQLResult<Operation.Data>, Error>) -> Void
  ) {
    guard
      let httpResponse = response?.httpResponse,
      httpResponse.statusCode == 401
    else {
      chain.proceedAsync(
        request: request,
        response: response,
        interceptor: self,
        completion: completion
      )
      return
    }

    let alreadyRetried = request.additionalHeaders[Self.retryHeaderName] != nil
    if alreadyRetried {
      // The rotated token was also rejected — refresh path is dead,
      // cut the session and let the chain surface the original 401 as
      // a `ResponseCodeError`.
      Task { @MainActor in
        onSignOut()
      }
      chain.proceedAsync(
        request: request,
        response: response,
        interceptor: self,
        completion: completion
      )
      return
    }

    Task { @MainActor [refresher, onSignOut] in
      do {
        _ = try await refresher.refresh()
        // BearerAuthInterceptor will re-read the rotated token from
        // TokenStore when chain.retry restarts from the top.
        request.addHeader(name: Self.retryHeaderName, value: "1")
        chain.retry(request: request, completion: completion)
      } catch AppError.invalidCredentials {
        // Refresh token revoked / replayed — fresh /auth/login
        // required.
        onSignOut()
        completion(.failure(AppError.invalidCredentials))
      } catch {
        // Transient (network / 5xx). Surface as-is so the caller can
        // retry without stranding the user.
        completion(.failure(error))
      }
    }
  }
}

/// `DefaultInterceptorProvider` subclass that wires the two auth
/// interceptors into the default chain at well-defined positions.
final class AuthInterceptorProvider: DefaultInterceptorProvider {
  private let tokenStore: TokenStore
  private let refresher: TokenRefresher
  private let onSignOut: @MainActor () -> Void

  init(
    tokenStore: TokenStore,
    refresher: TokenRefresher,
    onSignOut: @escaping @MainActor () -> Void,
    client: URLSessionClient = URLSessionClient(),
    store: ApolloStore = ApolloStore()
  ) {
    self.tokenStore = tokenStore
    self.refresher = refresher
    self.onSignOut = onSignOut
    super.init(client: client, store: store)
  }

  override func interceptors<Operation: GraphQLOperation>(
    for operation: Operation
  ) -> [any ApolloInterceptor] {
    var defaults = super.interceptors(for: operation)
    defaults.insert(BearerAuthInterceptor(tokenStore: tokenStore), at: 0)
    if let responseCodeIndex = defaults.firstIndex(where: { $0 is ResponseCodeInterceptor }) {
      defaults.insert(
        RefreshOn401Interceptor(refresher: refresher, onSignOut: onSignOut),
        at: responseCodeIndex
      )
    } else {
      defaults.append(
        RefreshOn401Interceptor(refresher: refresher, onSignOut: onSignOut)
      )
    }
    return defaults
  }
}
