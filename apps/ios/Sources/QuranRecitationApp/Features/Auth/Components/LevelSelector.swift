import SwiftUI

/// "YOUR LEVEL" picker on the sign-up screen: a stack of selectable
/// cards, one per `PracticeLevel`. The selected card gets a teal
/// border, a faint teal tint, and a filled radio dot — matching
/// `docs/design/iOS _ Sign up`.
///
/// Presentation-only, driven by a `@Binding` selection — the same
/// shape as `ChipFilter`. UI-only this pass: the value is collected
/// but not sent to the BFF (see `PracticeLevel`).
struct LevelSelector: View {
  @Binding var selection: PracticeLevel

  var body: some View {
    VStack(alignment: .leading, spacing: Spacing.sm) {
      Text("auth.level.title", bundle: .module)
        .font(Font.brand.eyebrow)
        .foregroundColor(Color.brand.textSecondary)
        .textCase(.uppercase)

      ForEach(PracticeLevel.allCases, id: \.self) { level in
        card(for: level)
      }
    }
  }

  private func card(for level: PracticeLevel) -> some View {
    let isSelected = selection == level
    return Button {
      selection = level
    } label: {
      HStack(spacing: Spacing.md) {
        Image(systemName: isSelected ? "circle.inset.filled" : "circle")
          .font(.system(size: 20))
          .foregroundColor(isSelected ? Color.brand.primary : Color.brand.textSecondary)

        VStack(alignment: .leading, spacing: Spacing.xs) {
          Text(level.label, bundle: .module)
            .font(Font.brand.body.weight(.semibold))
            .foregroundColor(Color.brand.textPrimary)
          Text(level.description, bundle: .module)
            .font(Font.brand.caption)
            .foregroundColor(Color.brand.textSecondary)
        }
        Spacer(minLength: 0)
      }
      .padding(Spacing.lg)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(isSelected ? Color.brand.primary.opacity(0.08) : Color.white)
      .clipShape(RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous))
      .overlay(
        RoundedRectangle(cornerRadius: Spacing.cardCornerRadius, style: .continuous)
          .stroke(
            isSelected ? Color.brand.primary : Color.brand.textSecondary.opacity(0.18),
            lineWidth: isSelected ? 2 : 1
          )
      )
    }
    .buttonStyle(.plain)
    .accessibilityAddTraits(isSelected ? .isSelected : [])
  }
}
