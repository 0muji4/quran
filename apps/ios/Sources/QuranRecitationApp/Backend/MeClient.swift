import Foundation

/// Personalised practice suggestion returned by `GET /me/suggestions`
/// (ADR 0015). `reason` is informational telemetry only — the View
/// just displays `surahId`. `difficulties` is a sparse map keyed by
/// `surahId`; surahs without entries fall back to the ayah-count
/// heuristic in the View layer, matching the web client's behaviour.
struct SurahSuggestion: Equatable {
  let surahId: String
  let reason: SuggestionReason
  let difficulties: [String: Difficulty]

  enum SuggestionReason: String, Equatable {
    case shortUnpracticed = "short_unpracticed"
    case shortLowScore = "short_low_score"
    case fallback
    case unknown

    init(wire: String) {
      self = SuggestionReason(rawValue: wire) ?? .unknown
    }
  }

  enum Difficulty: String, Equatable {
    case easy
    case medium
    case hard
  }
}

/// Client for the BFF `/me/*` REST surface. Every endpoint here is
/// gated by `requireAuth` on the BFF (`apps/bff/src/me/routes.ts`),
/// so the underlying `AuthHTTPClient` attaches the Bearer header and
/// handles the rotate-and-retry path on 401.
///
/// `@MainActor` mirrors the SwiftUI / ViewModel call sites: the
/// Library / Profile view-models that consume this are themselves
/// main-actor isolated, and `AuthHTTPClient` (used as the transport)
/// is `@MainActor` for `TokenStore` / `TokenRefresher` access.
@MainActor
protocol MeClient {
  func suggestions() async throws -> SurahSuggestion
}

@MainActor
final class HTTPMeClient: MeClient {
  private let baseURL: URL
  private let http: AuthHTTPClient

  init(baseURL: URL = AppConfig.restBaseURL, http: AuthHTTPClient) {
    self.baseURL = baseURL
    self.http = http
  }

  func suggestions() async throws -> SurahSuggestion {
    var request = URLRequest(url: baseURL.appendingPathComponent("me/suggestions"))
    request.httpMethod = "GET"
    request.setValue("application/json", forHTTPHeaderField: "Accept")

    let (data, response) = try await http.send(request)
    switch response.statusCode {
    case 200..<300:
      guard let payload = try? JSONDecoder().decode(SuggestionResponseBody.self, from: data) else {
        throw AppError.backendUnavailable(operation: "me.suggestions.parse")
      }
      return SurahSuggestion(
        surahId: payload.suggested.surahId,
        reason: SurahSuggestion.SuggestionReason(wire: payload.suggested.reason),
        difficulties: payload.difficulties.compactMapValues(SurahSuggestion.Difficulty.init(rawValue:))
      )
    default:
      throw AppError.backendUnavailable(operation: "me.suggestions")
    }
  }
}

// MARK: - Wire types

/// 2xx response shape for `GET /me/suggestions`. Mirrors
/// `apps/bff/src/me/suggestions.ts:24` — `reason` and `difficulties`
/// stay raw strings here so a new variant added on the server (e.g.
/// "weakest_long_surah") deserialises cleanly via the `.unknown`
/// fallback in `SurahSuggestion.SuggestionReason`.
private struct SuggestionResponseBody: Decodable {
  let suggested: Suggested
  let difficulties: [String: String]

  struct Suggested: Decodable {
    let surahId: String
    let reason: String
  }
}
