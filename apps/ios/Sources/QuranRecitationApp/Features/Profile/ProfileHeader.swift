import SwiftUI

/// The profile at the top of the Profile tab: the initial on the primary
/// container, the display name (the email when there is none), the email,
/// the level and streak badges, and Edit profile. The streak badge shows only
/// with a streak; without one, a "Joined" badge balances the row.
struct ProfileHeader: View {
  let user: AuthenticatedUser
  /// Consecutive-day practice streak, from the same history store as the
  /// History tab. `0` hides the streak badge.
  let streakDays: Int
  /// `nil` disables Edit profile, the read-only default.
  let onEdit: (() -> Void)?

  init(user: AuthenticatedUser, streakDays: Int = 0, onEdit: (() -> Void)? = nil) {
    self.user = user
    self.streakDays = streakDays
    self.onEdit = onEdit
  }

  var body: some View {
    VStack(spacing: AppTheme.Spacing.space2) {
      Text(verbatim: Self.initial(displayName: user.displayName, email: user.email))
        .font(.system(size: 30, weight: .medium))
        .foregroundStyle(AppTheme.Colors.onPrimaryContainer)
        .frame(width: 72, height: 72)
        .background(AppTheme.Colors.primaryContainer, in: Circle())
        .accessibilityHidden(true)
      Text(verbatim: displayName)
        .font(AppTheme.Typography.title2.weight(.semibold))
        .foregroundStyle(AppTheme.Colors.onSurface)
        .multilineTextAlignment(.center)
      Text(verbatim: user.email)
        .font(AppTheme.Typography.subheadline)
        .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
      badgeRow
        .padding(.top, AppTheme.Spacing.space1)
      Button {
        onEdit?()
      } label: {
        Text("profile.header.editProfile", bundle: .module)
      }
      .buttonStyle(.bordered)
      .buttonBorderShape(.capsule)
      .disabled(onEdit == nil)
      .padding(.top, AppTheme.Spacing.space2)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, AppTheme.Spacing.space3)
  }

  private var displayName: String {
    let trimmed = user.displayName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    return trimmed.isEmpty ? user.email : trimmed
  }

  private var badgeRow: some View {
    HStack(spacing: AppTheme.Spacing.space2) {
      if let levelKey = Self.levelKey(user.level) {
        ProfileBadge(Text(LocalizedStringKey(levelKey), bundle: .module))
      }
      if streakDays > 0 {
        ProfileBadge(Text(verbatim: Self.streakText(streakDays)), symbol: "flame")
      } else if let joined = Self.joinedText(user.createdAt) {
        ProfileBadge(Text(verbatim: joined))
      }
    }
  }

  /// "5-day streak". Localised count so plural-aware languages can adapt.
  static func streakText(_ days: Int) -> String {
    let template = Bundle.module.localizedString(
      forKey: "profile.header.streak", value: "%lld-day streak", table: nil
    )
    return String(format: template, days)
  }

  // MARK: - Helpers

  static func initial(displayName: String?, email: String) -> String {
    // displayName "   " is a degenerate but valid persisted value
    // (the BFF zod schema for sign-up only requires "non-empty before
    // trim"). Treat it as no-name and fall back to email rather than
    // rendering an empty avatar.
    let trimmedName = displayName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let source = trimmedName.isEmpty
      ? email.trimmingCharacters(in: .whitespacesAndNewlines)
      : trimmedName
    guard let first = source.first else { return "·" }
    return String(first).uppercased()
  }

  static func levelKey(_ level: String?) -> String? {
    switch level {
    case "beginner": return "profile.badge.level.beginner"
    case "intermediate": return "profile.badge.level.intermediate"
    case "advanced": return "profile.badge.level.advanced"
    default: return nil
    }
  }

  /// "Joined March 2026". Parses the BFF's ISO-8601 string and formats
  /// month + year in the user's locale. Day is dropped intentionally
  /// (the design matches web — no UX value in surfacing it here).
  static func joinedText(_ iso: String?, now: Date = Date()) -> String? {
    guard let iso, let date = Self.parseISO(iso) else { return nil }
    let formatter = DateFormatter()
    formatter.locale = Locale.current
    formatter.setLocalizedDateFormatFromTemplate("MMMM y")
    let formatted = formatter.string(from: date)
    let template = Bundle.module.localizedString(forKey: "profile.badge.joined", value: "Joined %@", table: nil)
    return String(format: template, formatted)
  }

  private static func parseISO(_ value: String) -> Date? {
    let fractional = ISO8601DateFormatter()
    fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = fractional.date(from: value) { return date }
    let plain = ISO8601DateFormatter()
    plain.formatOptions = [.withInternetDateTime]
    return plain.date(from: value)
  }
}

/// A level, streak or "Joined" badge: information, not a control, in the
/// secondary container colour.
struct ProfileBadge: View {
  let text: Text
  var symbol: String?

  init(_ text: Text, symbol: String? = nil) {
    self.text = text
    self.symbol = symbol
  }

  var body: some View {
    HStack(spacing: 6) {
      if let symbol {
        Image(systemName: symbol)
          .font(AppTheme.Typography.footnote)
          .accessibilityHidden(true)
      }
      text
        .font(AppTheme.Typography.footnote.weight(.medium))
    }
    .foregroundStyle(AppTheme.Colors.onSecondaryContainer)
    .padding(.horizontal, AppTheme.Spacing.space3)
    .frame(minHeight: 32)
    .background(AppTheme.Colors.secondaryContainer, in: Capsule())
    .accessibilityElement(children: .combine)
  }
}
