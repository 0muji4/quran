import SwiftUI

/// The main card of a screen, such as the one that holds the ayah: the low
/// surface container with the large corner radius. It fills the width it is
/// given.
struct AppCard<Content: View>: View {
  private let alignment: HorizontalAlignment
  private let spacing: CGFloat
  private let content: Content

  init(
    alignment: HorizontalAlignment = .leading,
    spacing: CGFloat = AppTheme.Spacing.space2,
    @ViewBuilder content: () -> Content
  ) {
    self.alignment = alignment
    self.spacing = spacing
    self.content = content()
  }

  var body: some View {
    VStack(alignment: alignment, spacing: spacing) {
      content
    }
    .padding(AppTheme.Spacing.space5)
    .frame(maxWidth: .infinity, alignment: Alignment(horizontal: alignment, vertical: .center))
    .foregroundStyle(AppTheme.Colors.onSurface)
    .background(
      AppTheme.Colors.surfaceContainerLow,
      in: RoundedRectangle(cornerRadius: AppTheme.Shape.large, style: .continuous)
    )
  }
}

/// The colour of an `AppPanel`.
enum AppPanelTone {
  /// The surface container, for rows and status panels.
  case neutral
  /// The error container, for a failure and what to do about it.
  case error
}

/// A panel inside or below a card, such as the teacher recitation row or the
/// analysing, scored and error panels: the medium corner radius. It fills
/// the width it is given.
struct AppPanel<Content: View>: View {
  private let tone: AppPanelTone
  private let padding: CGFloat
  private let spacing: CGFloat
  private let content: Content

  init(
    tone: AppPanelTone = .neutral,
    padding: CGFloat = AppTheme.Spacing.space4,
    spacing: CGFloat = AppTheme.Spacing.space3,
    @ViewBuilder content: () -> Content
  ) {
    self.tone = tone
    self.padding = padding
    self.spacing = spacing
    self.content = content()
  }

  var body: some View {
    VStack(alignment: .leading, spacing: spacing) {
      content
    }
    .padding(padding)
    .frame(maxWidth: .infinity, alignment: .leading)
    .foregroundStyle(tone == .error ? AppTheme.Colors.onErrorContainer : AppTheme.Colors.onSurface)
    .background(
      tone == .error ? AppTheme.Colors.errorContainer : AppTheme.Colors.surfaceContainer,
      in: RoundedRectangle(cornerRadius: AppTheme.Shape.medium, style: .continuous)
    )
  }
}

/// A card and both panel tones, for `#Preview` and the snapshot tests.
struct AppSurfacesSpecimen: View {
  var body: some View {
    AppCard {
      Text(verbatim: "Card").font(AppTheme.Typography.headline)
      Text(verbatim: "The main card of a screen.").font(AppTheme.Typography.subheadline)
    }
    AppPanel {
      Text(verbatim: "Panel").font(AppTheme.Typography.headline)
      Text(verbatim: "A row or status panel.").font(AppTheme.Typography.subheadline)
    }
    AppPanel(tone: .error) {
      Text(verbatim: "Error panel").font(AppTheme.Typography.headline)
      Text(verbatim: "What went wrong and what to do next.").font(AppTheme.Typography.subheadline)
    }
  }
}

#Preview("Light") {
  AppSpecimenSurface { AppSurfacesSpecimen() }
}

#Preview("Dark") {
  AppSpecimenSurface { AppSurfacesSpecimen() }
    .preferredColorScheme(.dark)
}
