import Apollo
import ApolloAPI
import Foundation

/// Production `QuranBackend` implementation. Wraps Apollo for GraphQL
/// operations and `URLSession` for the signed-URL upload. Every
/// failure path converts to an `AppError` so call sites only handle
/// one error vocabulary (see ADR 0006). Polling exhaustion surfaces as
/// `AppError.scoringTimeout` rather than silently returning the last
/// non-terminal status.
final class ApolloBackend: QuranBackend {
  private let client: ApolloClient
  private let pollAttempts: Int
  private let pollIntervalNanos: UInt64

  /// Production initialiser. Constructs an `ApolloClient` whose
  /// network transport runs through `AuthInterceptorProvider`, so
  /// every GraphQL request carries `Authorization: Bearer <token>`
  /// and a 401 transparently refreshes via `TokenRefresher`.
  ///
  /// Mirrors the wiring on Android (PR #435). Shares the same
  /// `TokenRefresher` instance with the REST `AuthHTTPClient` so
  /// concurrent 401s across both transports coalesce into a single
  /// `POST /auth/refresh` — see `TokenRefresher.refresh()` for why
  /// this matters for the BFF's replay-detection logic.
  init(
    endpoint: URL = AppConfig.graphqlURL,
    pollAttempts: Int = 20,
    pollIntervalNanos: UInt64 = 800_000_000,
    tokenStore: TokenStore,
    refresher: TokenRefresher,
    onSignOut: @escaping @MainActor () -> Void
  ) {
    let store = ApolloStore()
    let urlSessionClient = URLSessionClient()
    let provider = AuthInterceptorProvider(
      tokenStore: tokenStore,
      refresher: refresher,
      onSignOut: onSignOut,
      client: urlSessionClient,
      store: store
    )
    let transport = RequestChainNetworkTransport(
      interceptorProvider: provider,
      endpointURL: endpoint
    )
    self.client = ApolloClient(networkTransport: transport, store: store)
    self.pollAttempts = pollAttempts
    self.pollIntervalNanos = pollIntervalNanos
  }

  // MARK: - QuranBackend

  func requestSignedUploadUrl(filename: String, contentType: String) async throws -> SignedUploadPayload {
    let input = SignedUploadInput(filename: filename, contentType: contentType)
    let mutation = GetSignedUploadUrlMutation(input: input)
    let result = try await perform(mutation: mutation, operation: "getSignedUploadUrl")
    return SignedUploadPayload(from: result.getSignedUploadUrl)
  }

  func uploadAudio(fileURL: URL, to signedUrl: String) async throws {
    guard let url = URL(string: signedUrl) else {
      throw AppError.backendUnavailable(operation: "uploadAudio")
    }
    var request = URLRequest(url: url)
    request.httpMethod = "PUT"
    request.setValue("audio/wav", forHTTPHeaderField: "Content-Type")
    do {
      let data = try Data(contentsOf: fileURL)
      let (_, response) = try await URLSession.shared.upload(for: request, from: data)
      guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
        throw AppError.backendUnavailable(operation: "uploadAudio")
      }
    } catch let error as AppError {
      throw error
    } catch {
      throw AppError.network(underlying: error)
    }
  }

  func createScoringJob(uploadKey: String, surahId: String, ayahNumber: Int?) async throws -> ScoringResultPayload {
    let input = CreateScoringJobInput(
      surahId: surahId,
      ayahNumber: ayahNumber.map { .some($0) } ?? nil,
      uploadKey: uploadKey
    )
    let mutation = CreateScoringJobMutation(input: input)
    let result = try await perform(mutation: mutation, operation: "createScoringJob")
    return ScoringResultPayload(from: result.createScoringJob)
  }

  func pollScoringResult(jobId: String) async throws -> ScoringResultPayload {
    var attempts = 0
    while attempts < pollAttempts {
      let query = ScoringJobQuery(jobId: jobId)
      let result = try await fetch(query: query, operation: "scoringJob")
      guard let job = result.scoringJob else {
        throw AppError.backendUnavailable(operation: "scoringJob")
      }
      let payload = ScoringResultPayload(from: job)
      if payload.status == .completed || payload.status == .failed {
        return payload
      }
      attempts += 1
      try await Task.sleep(nanoseconds: pollIntervalNanos)
    }
    throw AppError.scoringTimeout
  }

  func surahs(limit: Int? = nil, offset: Int? = nil) async throws -> [SurahSummary] {
    let query = GetSurahsQuery(
      limit: limit.map { .some($0) } ?? nil,
      offset: offset.map { .some($0) } ?? nil
    )
    let result = try await fetch(query: query, operation: "surahs")
    return result.surahs.map { SurahSummary(from: $0) }
  }

  func surah(id: String) async throws -> SurahSummary? {
    let query = GetSurahQuery(id: id)
    let result = try await fetch(query: query, operation: "surah")
    return result.surah.map { SurahSummary(from: $0) }
  }

  func ayah(surahId: String, ayahNumber: Int) async throws -> AyahDetail? {
    let query = GetAyahQuery(surahId: surahId, ayahNumber: ayahNumber)
    let result = try await fetch(query: query, operation: "ayah")
    return result.ayah.map { AyahDetail(from: $0) }
  }

  // MARK: - Apollo bridges

  private func perform<Mutation: GraphQLMutation>(
    mutation: Mutation,
    operation: String
  ) async throws -> Mutation.Data {
    try await withCheckedThrowingContinuation { continuation in
      client.perform(mutation: mutation) { result in
        switch result {
        case .success(let graphQLResult):
          if let data = graphQLResult.data {
            continuation.resume(returning: data)
          } else {
            continuation.resume(throwing: AppError.backendUnavailable(operation: operation))
          }
        case .failure(let error):
          continuation.resume(throwing: AppError.network(underlying: error))
        }
      }
    }
  }

  private func fetch<Query: GraphQLQuery>(
    query: Query,
    operation: String
  ) async throws -> Query.Data {
    try await withCheckedThrowingContinuation { continuation in
      client.fetch(query: query, cachePolicy: .fetchIgnoringCacheData) { result in
        switch result {
        case .success(let graphQLResult):
          if let data = graphQLResult.data {
            continuation.resume(returning: data)
          } else {
            continuation.resume(throwing: AppError.backendUnavailable(operation: operation))
          }
        case .failure(let error):
          continuation.resume(throwing: AppError.network(underlying: error))
        }
      }
    }
  }
}
