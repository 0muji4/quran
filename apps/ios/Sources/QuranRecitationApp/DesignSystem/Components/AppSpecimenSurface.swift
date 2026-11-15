import SwiftUI

/// The page a component specimen is drawn on, in `#Preview` and in the
/// component snapshot tests: the theme's surface colour, with the specimen's
/// rows stacked at a 16pt margin.
struct AppSpecimenSurface<Content: View>: View {
  private let content: Content

  init(@ViewBuilder content: () -> Content) {
    self.content = content()
  }

  var body: some View {
    VStack(alignment: .leading, spacing: AppTheme.Spacing.space4) {
      content
    }
    .foregroundStyle(AppTheme.Colors.onSurface)
    .padding(AppTheme.Spacing.space4)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .background(AppTheme.Colors.surface)
  }
}
