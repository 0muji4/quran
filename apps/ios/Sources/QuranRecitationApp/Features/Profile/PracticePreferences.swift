import Foundation

/// Practice preferences from the BFF `/me/preferences` surface. Field
/// names match the server JSON so this `Codable` struct round-trips
/// without an adapter.
struct PracticePreferences: Codable, Equatable {
  var referenceReciterId: String
  /// Stored as a decimal in the closed range [0.5, 2.0] (BFF validation
  /// + the `default_playback_speed` CHECK constraint).
  var defaultPlaybackSpeed: Double
  var dailyReminderEnabled: Bool
  /// 24-hour "HH:mm". Matches the BFF regex `^([01]\d|2[0-3]):[0-5]\d$`
  /// and the Postgres `TIME` column (truncated to minutes).
  var dailyReminderTime: String

  /// Server-side defaults; the optimistic baseline before the first GET
  /// resolves.
  static let `default` = PracticePreferences(
    referenceReciterId: ReciterOption.fallbackId,
    defaultPlaybackSpeed: 1,
    dailyReminderEnabled: false,
    dailyReminderTime: "08:00"
  )
}

/// Partial update for `PATCH /me/preferences`. Only the fields a single
/// edit touches are sent — `encodeIfPresent` drops the `nil`s so an
/// unsent field never clobbers its stored column (the BFF performs a
/// column-level upsert keyed on which fields arrive).
struct PracticePreferencesPatch: Encodable {
  var referenceReciterId: String?
  var defaultPlaybackSpeed: Double?
  var dailyReminderEnabled: Bool?
  var dailyReminderTime: String?

  func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    try container.encodeIfPresent(referenceReciterId, forKey: .referenceReciterId)
    try container.encodeIfPresent(defaultPlaybackSpeed, forKey: .defaultPlaybackSpeed)
    try container.encodeIfPresent(dailyReminderEnabled, forKey: .dailyReminderEnabled)
    try container.encodeIfPresent(dailyReminderTime, forKey: .dailyReminderTime)
  }

  enum CodingKeys: String, CodingKey {
    case referenceReciterId
    case defaultPlaybackSpeed
    case dailyReminderEnabled
    case dailyReminderTime
  }
}

/// Selectable reference reciter. Single entry today, kept as a table so
/// a future reciters API drops in without a UI rewrite.
struct ReciterOption: Identifiable, Equatable {
  let id: String
  let label: String
  let helper: String

  static let fallbackId = "husary-muallim"

  static let all: [ReciterOption] = [
    ReciterOption(id: "husary-muallim", label: "Husary Mu'allim", helper: "Slow teaching pace")
  ]

  /// The option matching `id`, or the first option as a safe fallback so
  /// an unknown stored id (e.g. from a future reciter) still renders.
  static func option(for id: String) -> ReciterOption {
    all.first { $0.id == id } ?? all[0]
  }
}

/// Allowed default-playback-speed steps. Bounds match the BFF
/// validation ([0.5, 2.0]).
enum PlaybackSpeedOption {
  static let all: [Double] = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

  /// "1×" / "0.75×" — trailing zero trimmed.
  static func label(_ speed: Double) -> String {
    let formatted = speed.truncatingRemainder(dividingBy: 1) == 0
      ? String(format: "%.0f", speed)
      : String(format: "%g", speed)
    return "\(formatted)×"
  }
}

/// Bridges the wire's "HH:mm" reminder string and the hour/minute the
/// `DatePicker` works in. Pure so the round-trip (and the malformed-
/// input fallback) is unit-testable without a view.
enum ReminderClock {
  /// Parses "HH:mm" into 24-hour components, falling back to 08:00 (the
  /// column default) for anything that doesn't match — the picker
  /// always needs a concrete time to show.
  static func parse(_ hhmm: String) -> (hour: Int, minute: Int) {
    let parts = hhmm.split(separator: ":")
    guard parts.count == 2,
      let hour = Int(parts[0]), let minute = Int(parts[1]),
      (0...23).contains(hour), (0...59).contains(minute)
    else { return (8, 0) }
    return (hour, minute)
  }

  /// Zero-padded "HH:mm" matching the BFF regex and the `TIME` column.
  static func format(hour: Int, minute: Int) -> String {
    String(format: "%02d:%02d", hour, minute)
  }
}
