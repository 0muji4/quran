import Apollo
import ApolloAPI
import Foundation

final class QuranAPIClient {
  private let client: ApolloClient

  init(endpoint: URL = URL(string: "http://localhost:4000/graphql")!) {
    client = ApolloClient(url: endpoint)
  }

  func getSignedUploadUrl(filename: String, contentType: String) async throws -> SignedUploadPayload {
    let input = SignedUploadInput(filename: filename, contentType: contentType)
    let mutation = GetSignedUploadUrlMutation(input: input)
    let result = try await perform(mutation: mutation)
    return SignedUploadPayload(from: result.getSignedUploadUrl)
  }

  func createScoringJob(uploadKey: String, surahId: String) async throws -> ScoringResultPayload {
    let input = CreateScoringJobInput(
      surahId: surahId,
      ayahNumber: nil,
      uploadKey: uploadKey
    )
    let mutation = CreateScoringJobMutation(input: input)
    let result = try await perform(mutation: mutation)
    return ScoringResultPayload(from: result.createScoringJob)
  }

  func pollScoringResult(jobId: String) async throws -> ScoringResultPayload {
    var attempts = 0
    var currentResult: ScoringResultPayload

    repeat {
      let query = ScoringJobQuery(jobId: jobId)
      let result = try await fetch(query: query)
      guard let scoringJob = result.scoringJob else {
        throw QuranAPIError.graphQLError
      }
      currentResult = ScoringResultPayload(from: scoringJob)

      if currentResult.status == .completed || currentResult.status == .failed {
        return currentResult
      }

      attempts += 1
      try await Task.sleep(nanoseconds: 800_000_000)
    } while attempts < 20

    return currentResult
  }

  func uploadAudio(fileURL: URL, to signedUrl: String) async throws {
    let data = try Data(contentsOf: fileURL)
    var request = URLRequest(url: URL(string: signedUrl)!)
    request.httpMethod = "PUT"
    request.setValue("audio/m4a", forHTTPHeaderField: "Content-Type")
    let (_, response) = try await URLSession.shared.upload(for: request, from: data)

    guard let httpResponse = response as? HTTPURLResponse, (200..<300).contains(httpResponse.statusCode) else {
      throw QuranAPIError.uploadFailed
    }
  }

  private func perform<Mutation: GraphQLMutation>(mutation: Mutation) async throws -> Mutation.Data {
    try await withCheckedThrowingContinuation { continuation in
      client.perform(mutation: mutation) { result in
        switch result {
        case .success(let graphQLResult):
          if let data = graphQLResult.data {
            continuation.resume(returning: data)
          } else {
            continuation.resume(throwing: graphQLResult.errors?.first ?? QuranAPIError.graphQLError)
          }
        case .failure(let error):
          continuation.resume(throwing: error)
        }
      }
    }
  }

  private func fetch<Query: GraphQLQuery>(query: Query) async throws -> Query.Data {
    try await withCheckedThrowingContinuation { continuation in
      client.fetch(query: query, cachePolicy: .fetchIgnoringCacheData) { result in
        switch result {
        case .success(let graphQLResult):
          if let data = graphQLResult.data {
            continuation.resume(returning: data)
          } else {
            continuation.resume(throwing: graphQLResult.errors?.first ?? QuranAPIError.graphQLError)
          }
        case .failure(let error):
          continuation.resume(throwing: error)
        }
      }
    }
  }
}

enum QuranAPIError: LocalizedError {
  case graphQLError
  case uploadFailed

  var errorDescription: String? {
    switch self {
    case .graphQLError:
      return "GraphQL request failed."
    case .uploadFailed:
      return "Upload failed."
    }
  }
}
