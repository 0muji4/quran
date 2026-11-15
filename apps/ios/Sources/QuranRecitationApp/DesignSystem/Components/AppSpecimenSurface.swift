import SwiftUI

/// The page a component specimen is drawn on, in `#Preview` and in the
/// component snapshot tests: the theme's surface colour and the primary tint,
/// with the specimen's rows stacked at a 16pt margin. Controls take the large
/// size and the capsule shape the screens use; the capsule is set rather than
/// left to `.automatic`, whose shape differs between OS versions.
///
/// It sets no foreground style. A foreground style on a container also
/// recolours the labels of the system buttons inside it, so text sets its own
/// colour.
struct AppSpecimenSurface<Content: View>: View {
  private let content: Content

  init(@ViewBuilder content: () -> Content) {
    self.content = content()
  }

  var body: some View {
    VStack(alignment: .leading, spacing: AppTheme.Spacing.space4) {
      content
    }
    .controlSize(.large)
    .buttonBorderShape(.capsule)
    .tint(AppTheme.Colors.primary)
    .padding(AppTheme.Spacing.space4)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .background(AppTheme.Colors.surface)
  }
}
