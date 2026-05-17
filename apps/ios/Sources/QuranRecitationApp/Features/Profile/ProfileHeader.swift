import SwiftUI

/// Header card on the Profile tab. Mirrors `apps/web/.../ProfileHeader.tsx`
/// — gradient avatar (initial), display name (fallback to email), email
/// row, and a row of pill badges (level + "Joined %@"). The "Edit" CTA
/// is a disabled placeholder in PR-H2; it gets wired up to the edit-
/// profile sheet in PR-H3.
struct ProfileHeader: View {
  let user: AuthenticatedUser

  var body: some View {
    HStack(alignment: .top, spacing: Spacing.lg) {
      avatar

      VStack(alignment: .leading, spacing: Spacing.xs) {
        Text(user.displayName ?? user.email)
          .font(Font.brand.sectionTitle)
          .foregroundColor(Color.brand.textPrimary)

        Text(user.email)
          .font(Font.brand.caption)
          .foregroundColor(Color.brand.textSecondary)

        badgeRow
          .padding(.top, Spacing.xs)
      }
      .frame(maxWidth: .infinity, alignment: .leading)

      // Disabled placeholder: actual edit sheet lands in PR-H3.
      Button {
        // intentionally empty — disabled in PR-H2
      } label: {
        Text("profile.header.edit", bundle: .module)
          .font(Font.brand.caption.weight(.semibold))
      }
      .disabled(true)
      .accessibilityLabel(Text("profile.header.edit.a11yDisabled", bundle: .module))
    }
    .padding(Spacing.lg)
    .background(Color.brand.card)
    .clipShape(RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous))
  }

  // MARK: - Subviews

  private var avatar: some View {
    Circle()
      .fill(
        RadialGradient(
          colors: [Color.brand.accent, Color.brand.primary],
          center: UnitPoint(x: 0.35, y: 0.3),
          startRadius: 4,
          endRadius: 80
        )
      )
      .frame(width: 72, height: 72)
      .overlay(
        Text(Self.initial(displayName: user.displayName, email: user.email))
          .font(.system(size: 28, design: .serif))
          .foregroundColor(Color.brand.textOnInverse)
      )
      .accessibilityHidden(true)
  }

  private var badgeRow: some View {
    HStack(spacing: Spacing.xs) {
      if let levelKey = Self.levelKey(user.level) {
        ProfileBadge(
          textKey: levelKey,
          background: Color.brand.primary.opacity(0.12),
          foreground: Color.brand.primary
        )
      }
      if let joined = Self.joinedText(user.createdAt) {
        ProfileBadge(
          text: joined,
          background: Color.brand.tile,
          foreground: Color.brand.textSecondary
        )
      }
    }
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
