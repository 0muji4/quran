import Foundation

/// Client for the BFF's `GET /reference-audio?surah=N&ayah=M` endpoint.
/// Returns a presigned URL the iOS app can stream / download. Network
/// failures convert to `AppError`; missing reference audio (404)
/// converts to `AppError.referenceUnavailable` so the View can swap to
/// the empty-state described in the design.
struct ReferenceAudio: Equatable {
  let url: URL
  let expiresAt: Date?
}

protocol ReferenceAudioClient {
  func referenceAudio(surahId: String, ayahNumber: Int) async throws -> ReferenceAudio
}

final class HTTPReferenceAudioClient: ReferenceAudioClient {
  private let baseURL: URL
  private let session: URLSession

  init(baseURL: URL = AppConfig.restBaseURL, session: URLSession = .shared) {
    self.baseURL = baseURL
    self.session = session
  }

  func referenceAudio(surahId: String, ayahNumber: Int) async throws -> ReferenceAudio {
    var components = URLComponents(url: baseURL.appendingPathComponent("reference-audio"), resolvingAgainstBaseURL: false)
    components?.queryItems = [
      URLQueryItem(name: "surah", value: surahId),
      URLQueryItem(name: "ayah", value: String(ayahNumber))
    ]
    guard let url = components?.url else {
      throw AppError.backendUnavailable(operation: "referenceAudio")
    }

    do {
      let (data, response) = try await session.data(from: url)
      guard let http = response as? HTTPURLResponse else {
        throw AppError.network(underlying: URLError(.badServerResponse))
      }
      switch http.statusCode {
      case 200..<300:
        return try Self.decode(data)
      case 404:
        throw AppError.referenceUnavailable(surahId: surahId, ayah: ayahNumber)
      default:
        throw AppError.backendUnavailable(operation: "referenceAudio")
      }
    } catch let error as AppError {
      throw error
    } catch {
      throw AppError.network(underlying: error)
    }
  }

  private static func decode(_ data: Data) throws -> ReferenceAudio {
    struct Payload: Decodable {
      let url: String
      let expiresAt: String?
    }
    let payload = try JSONDecoder().decode(Payload.self, from: data)
    guard let url = URL(string: payload.url) else {
      throw AppError.backendUnavailable(operation: "referenceAudio.parse")
    }
    let formatter = ISO8601DateFormatter()
    return ReferenceAudio(
      url: url,
      expiresAt: payload.expiresAt.flatMap { formatter.date(from: $0) }
    )
  }
}
