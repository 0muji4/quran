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

  // Practice history surface. The wire types match
  // `apps/web/app/lib/storage-types.ts` exactly, so the Codable
  // structs in `HistoryStore.swift` round-trip without an adapter.

  func lastPracticed() async throws -> LastPracticed?
  func putLastPracticed(_ entry: LastPracticed) async throws -> LastPracticed

  func bestScores() async throws -> [String: BestScoreEntry]
  func putBestScore(surahId: String, ayahNumber: Int, entry: BestScoreEntry) async throws -> BestScoreEntry

  func attempts(limit: Int) async throws -> [Attempt]
  func recordAttempt(_ attempt: Attempt) async throws -> Attempt
}

@MainActor
final class HTTPMeClient: MeClient {
  private let baseURL: URL
  private let http: AuthHTTPClient

  init(baseURL: URL = AppConfig.restBaseURL, http: AuthHTTPClient) {
    self.baseURL = baseURL
    self.http = http
  }

  // MARK: - Suggestions

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

  // MARK: - Last practiced

  func lastPracticed() async throws -> LastPracticed? {
    var request = URLRequest(url: baseURL.appendingPathComponent("me/last-practiced"))
    request.httpMethod = "GET"
    request.setValue("application/json", forHTTPHeaderField: "Accept")

    let (data, response) = try await http.send(request)
    switch response.statusCode {
    case 200..<300:
      // BFF emits literal `null` when the user has no last-practiced
      // row yet. `JSONDecoder` rejects `null` as a top-level value
      // for non-Optional targets, so probe the bytes first.
      if Self.isJSONNull(data) { return nil }
      return try Self.decode(LastPracticed.self, from: data, operation: "me.last-practiced")
    default:
      throw AppError.backendUnavailable(operation: "me.last-practiced")
    }
  }

  func putLastPracticed(_ entry: LastPracticed) async throws -> LastPracticed {
    var request = URLRequest(url: baseURL.appendingPathComponent("me/last-practiced"))
    request.httpMethod = "PUT"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.httpBody = try Self.encode(entry, operation: "me.last-practiced.put")

    let (data, response) = try await http.send(request)
    switch response.statusCode {
    case 200..<300:
      return try Self.decode(LastPracticed.self, from: data, operation: "me.last-practiced.put")
    default:
      throw AppError.backendUnavailable(operation: "me.last-practiced.put")
    }
  }

  // MARK: - Best scores

  func bestScores() async throws -> [String: BestScoreEntry] {
    var request = URLRequest(url: baseURL.appendingPathComponent("me/best-scores"))
    request.httpMethod = "GET"
    request.setValue("application/json", forHTTPHeaderField: "Accept")

    let (data, response) = try await http.send(request)
    switch response.statusCode {
    case 200..<300:
      return try Self.decode([String: BestScoreEntry].self, from: data, operation: "me.best-scores")
    default:
      throw AppError.backendUnavailable(operation: "me.best-scores")
    }
  }

  func putBestScore(
    surahId: String,
    ayahNumber: Int,
    entry: BestScoreEntry
  ) async throws -> BestScoreEntry {
    let key = "\(surahId):\(ayahNumber)"
    var request = URLRequest(url: baseURL.appendingPathComponent("me/best-scores/\(key)"))
    request.httpMethod = "PUT"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.httpBody = try Self.encode(entry, operation: "me.best-scores.put")

    let (data, response) = try await http.send(request)
    switch response.statusCode {
    case 200..<300:
      // Server applies MAX semantics and returns the stored row,
      // which may differ from `entry` if a higher score was already
      // on file — callers reconcile their local cache against the
      // returned value rather than the input.
      return try Self.decode(BestScoreEntry.self, from: data, operation: "me.best-scores.put")
    default:
      throw AppError.backendUnavailable(operation: "me.best-scores.put")
    }
  }

  // MARK: - Attempts

  func attempts(limit: Int) async throws -> [Attempt] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("me/attempts"),
      resolvingAgainstBaseURL: false
    )
    components?.queryItems = [URLQueryItem(name: "limit", value: String(limit))]
    guard let url = components?.url else {
      throw AppError.backendUnavailable(operation: "me.attempts")
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("application/json", forHTTPHeaderField: "Accept")

    let (data, response) = try await http.send(request)
    switch response.statusCode {
    case 200..<300:
      let payload = try Self.decode(AttemptsResponseBody.self, from: data, operation: "me.attempts")
      return payload.attempts
    default:
      throw AppError.backendUnavailable(operation: "me.attempts")
    }
  }

  func recordAttempt(_ attempt: Attempt) async throws -> Attempt {
    var request = URLRequest(url: baseURL.appendingPathComponent("me/attempts"))
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.httpBody = try Self.encode(attempt, operation: "me.attempts.post")

    let (data, response) = try await http.send(request)
    switch response.statusCode {
    case 200..<300:
      return try Self.decode(Attempt.self, from: data, operation: "me.attempts.post")
    default:
      throw AppError.backendUnavailable(operation: "me.attempts.post")
    }
  }

  // MARK: - Codable helpers

  private static func encoder() -> JSONEncoder {
    let encoder = JSONEncoder()
    // Encode with fractional seconds — that's what Node's
    // `Date.toISOString()` emits, and what the BFF (which the wire
    // shape mirrors) accepts on the round-trip.
    encoder.dateEncodingStrategy = .custom { date, encoder in
      var container = encoder.singleValueContainer()
      try container.encode(MeClientISO8601.fractional.string(from: date))
    }
    return encoder
  }

  private static func decoder() -> JSONDecoder {
    let decoder = JSONDecoder()
    // Accept both `2024-01-01T00:00:00.000Z` (Node default, what the
    // BFF emits) and `2024-01-01T00:00:00Z` (UserDefaultsHistoryStore's
    // `.iso8601` output, in case it ever lands here).
    decoder.dateDecodingStrategy = .custom { decoder in
      let container = try decoder.singleValueContainer()
      let raw = try container.decode(String.self)
      if let date =
        MeClientISO8601.fractional.date(from: raw)
        ?? MeClientISO8601.plain.date(from: raw)
      {
        return date
      }
      throw DecodingError.dataCorruptedError(
        in: container,
        debugDescription: "invalid ISO 8601 timestamp: \(raw)"
      )
    }
    return decoder
  }

  private static func encode<T: Encodable>(_ value: T, operation: String) throws -> Data {
    do {
      return try encoder().encode(value)
    } catch {
      throw AppError.backendUnavailable(operation: "\(operation).encode")
    }
  }

  private static func decode<T: Decodable>(
    _ type: T.Type,
    from data: Data,
    operation: String
  ) throws -> T {
    do {
      return try decoder().decode(type, from: data)
    } catch {
      throw AppError.backendUnavailable(operation: "\(operation).parse")
    }
  }

  private static func isJSONNull(_ data: Data) -> Bool {
    let trimmed = data
      .drop(while: { $0 == 0x20 || $0 == 0x09 || $0 == 0x0A || $0 == 0x0D })
    return trimmed.starts(with: "null".utf8)
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

/// 2xx response shape for `GET /me/attempts`. BFF wraps the list in
/// an `attempts` envelope so future fields (pagination cursors, total
/// counts) can land without breaking clients.
private struct AttemptsResponseBody: Decodable {
  let attempts: [Attempt]
}

/// File-scoped formatters so the encoder / decoder closures (Sendable,
/// nonisolated) can reach them without crossing the @MainActor
/// boundary of `HTTPMeClient`. `ISO8601DateFormatter`'s instance
/// methods are documented thread-safe.
private enum MeClientISO8601 {
  static let fractional: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
  }()

  static let plain: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime]
    return f
  }()
}
