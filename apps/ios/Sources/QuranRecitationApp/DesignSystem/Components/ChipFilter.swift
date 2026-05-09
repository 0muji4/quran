import SwiftUI

/// Pill-shaped multi-state filter used in the Library bottom row
/// ("All / Mecca / Medina / Short"). Driven by an enum `Option`
/// supplied by the caller; the chip itself is presentation-only.
struct ChipFilter<Option: Hashable>: View {
  struct Item: Identifiable {
    let id: Option
    let title: LocalizedStringKey

    init(_ id: Option, _ title: LocalizedStringKey) {
      self.id = id
      self.title = title
    }
  }

  let items: [Item]
  @Binding var selection: Option

  var body: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: Spacing.sm) {
        ForEach(items) { item in
          Button {
            selection = item.id
          } label: {
            Text(item.title, bundle: .module)
              .font(Font.brand.caption.weight(.semibold))
              .foregroundColor(foreground(for: item.id))
              .padding(.horizontal, Spacing.lg)
              .padding(.vertical, Spacing.sm)
              .background(background(for: item.id))
              .clipShape(Capsule())
          }
          .buttonStyle(.plain)
        }
      }
      .padding(.horizontal, Spacing.screenHorizontal)
    }
  }

  private func background(for option: Option) -> Color {
    option == selection ? Color.brand.cardInverse : Color.brand.card
  }

  private func foreground(for option: Option) -> Color {
    option == selection ? Color.brand.textOnInverse : Color.brand.textPrimary
  }
}
