import SwiftUI

/// Header card on the Profile tab. Mirrors `apps/web/.../ProfileHeader.tsx`
/// — gradient avatar (initial), display name (fallback to email), email
/// row, and a row of pill badges (level + "Joined %@"). The "Edit" CTA
/// is a disabled placeholder in PR-H2; it gets wired up to the edit-
/// profile sheet in PR-H3.
struct ProfileHeader: View {
  let user: AuthenticatedUser
  /// Consecutive-day practice streak (from the local history store, the
  /// same source the History tab uses). `0` hides the streak pill —
  /// matching the web `StreakBadge`, which only renders once a streak
  /// exists rather than showing "0-day".
  let streakDays: Int
  /// `nil` keeps the Edit affordance disabled — the read-only default.
  /// A closure opens the Edit Profile sheet.
  let onEdit: (() -> Void)?

  init(user: AuthenticatedUser, streakDays: Int = 0, onEdit: (() -> Void)? = nil) {
    self.user = user
    self.streakDays = streakDays
    self.onEdit = onEdit
  }

  var body: some View {
    VStack(spacing: Spacing.md) {
      BrandAvatar(initial: Self.initial(displayName: user.displayName, email: user.email))

      Text(user.displayName ?? user.email)
        .font(Font.brand.sectionTitle)
        .foregroundColor(Color.brand.textPrimary)
        .multilineTextAlignment(.center)

      badgeRow

      editPill
        .padding(.top, Spacing.xs)
    }
    .frame(maxWidth: .infinity)
    .padding(Spacing.xl)
    .background(Color.brand.card)
    .clipShape(RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous))
  }

  // MARK: - Subviews

  /// Level + streak pills, centered. Falls back to the "Joined …" pill
  /// when there's no streak yet, so a brand-new account still has a
  /// second pill to balance the row.
  private var badgeRow: some View {
    HStack(spacing: Spacing.xs) {
      if let levelKey = Self.levelKey(user.level) {
        ProfileBadge(
          textKey: levelKey,
          background: Color.brand.primary.opacity(0.12),
          foreground: Color.brand.primary
        )
      }
      if streakDays > 0 {
        ProfileBadge(
          text: Self.streakText(streakDays),
          background: Color.brand.tile,
          foreground: Color.brand.decorative
        )
        .accessibilityLabel(Text(Self.streakText(streakDays)))
      } else if let joined = Self.joinedText(user.createdAt) {
        ProfileBadge(
          text: joined,
          background: Color.brand.tile,
          foreground: Color.brand.textSecondary
        )
      }
    }
  }

  /// Outline "Edit profile" pill. Subtle hairline border on the cream
  /// card rather than a filled CTA — the primary action on this screen
  /// is elsewhere, so the edit affordance stays quiet.
  private var editPill: some View {
    Button {
      onEdit?()
    } label: {
      Text("profile.header.editProfile", bundle: .module)
        .font(Font.brand.caption.weight(.semibold))
        .foregroundColor(Color.brand.textPrimary)
        .padding(.horizontal, Spacing.lg)
        .padding(.vertical, Spacing.sm)
        .overlay(
          Capsule().stroke(Color.brand.textSecondary.opacity(0.35), lineWidth: 1)
        )
    }
    .buttonStyle(.plain)
    .disabled(onEdit == nil)
    .opacity(onEdit == nil ? 0.4 : 1)
    .accessibilityLabel(
      Text(
        onEdit == nil
          ? LocalizedStringKey("profile.header.edit.a11yDisabled")
          : LocalizedStringKey("profile.header.editProfile"),
        bundle: .module
      )
    )
  }

  /// "✦ 5-day streak" — the ✦ matches the web streak badge and the
  /// page eyebrows. Localised count so plural-aware languages can adapt.
  static func streakText(_ days: Int) -> String {
    let template = Bundle.module.localizedString(
      forKey: "profile.header.streak", value: "✦ %lld-day streak", table: nil
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

/// Small pill badge used in the header row. Accepts either a
/// `LocalizedStringKey` (preferred — keeps Arabic translations under
/// the Localizable.strings umbrella) or a pre-formatted string (for
/// values like "Joined March 2026" that we format with `DateFormatter`).
struct ProfileBadge: View {
  let textKey: String?
  let text: String?
  let background: Color
  let foreground: Color

  init(textKey: String, background: Color, foreground: Color) {
    self.textKey = textKey
    self.text = nil
    self.background = background
    self.foreground = foreground
  }

  init(text: String, background: Color, foreground: Color) {
    self.textKey = nil
    self.text = text
    self.background = background
    self.foreground = foreground
  }

  var body: some View {
    Group {
      if let textKey {
        Text(LocalizedStringKey(textKey), bundle: .module)
      } else if let text {
        Text(text)
      }
    }
    .font(.system(size: 11, weight: .semibold))
    .textCase(.uppercase)
    .tracking(0.6)
    .padding(.horizontal, Spacing.md)
    .padding(.vertical, Spacing.xs)
    .background(background)
    .foregroundColor(foreground)
    .clipShape(Capsule())
  }
}
