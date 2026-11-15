import SwiftUI

/// A pill-shaped outlined chip, 32pt tall, for a small setting beside other
/// content, such as the playback speed. Its tap area extends to 44pt.
struct AppChip: View {
  let title: String
  let action: () -> Void

  @Environment(\.isEnabled) private var isEnabled

  var body: some View {
    Button(action: action) {
      Text(verbatim: title)
        .font(AppTheme.Typography.footnote)
        .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
        .padding(.horizontal, AppTheme.Spacing.space3)
        .frame(minHeight: 32)
        .overlay(Capsule().strokeBorder(AppTheme.Colors.outlineVariant, lineWidth: 1))
        .padding(.vertical, 6)
        .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .opacity(isEnabled ? 1 : 0.38)
  }
}

/// Chips in both states, for `#Preview` and the snapshot tests.
struct AppChipSpecimen: View {
  var body: some View {
    HStack(spacing: AppTheme.Spacing.space2) {
      AppChip(title: "1×") {}
      AppChip(title: "0.75×") {}
      AppChip(title: "1×") {}.disabled(true)
    }
  }
}

#Preview("Light") {
  AppSpecimenSurface { AppChipSpecimen() }
}

#Preview("Dark") {
  AppSpecimenSurface { AppChipSpecimen() }
    .preferredColorScheme(.dark)
}
