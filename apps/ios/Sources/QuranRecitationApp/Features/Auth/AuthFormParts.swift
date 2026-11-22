import AuthenticationServices
import SwiftUI

// The pieces the sign-in and create-account screens share, on `AppTheme` and
// system controls (ADR 0030).

/// The frame of an auth screen: an inset grouped form under a large title,
/// pushed onto the Profile tab's navigation stack, so the system back button
/// and swipe leave it.
struct AuthForm<Content: View>: View {
  let title: LocalizedStringKey
  @ViewBuilder let content: () -> Content

  var body: some View {
    Form {
      content()
    }
    .scrollContentBackground(.hidden)
    .background(AppTheme.Colors.surface.ignoresSafeArea())
    .scrollDismissesKeyboard(.interactively)
    .tint(AppTheme.Colors.primary)
    .navigationTitle(Text(title, bundle: .module))
    .navigationBarTitleDisplayMode(.large)
  }
}

extension View {
  /// The row background every auth field sits on.
  func authRow() -> some View {
    listRowBackground(AppTheme.Colors.surfaceContainer)
  }

  /// A section drawn straight on the screen background, without a row
  /// background or insets: the buttons and lines between the field groups.
  func authBareSection() -> some View {
    listRowBackground(Color.clear)
      .listRowInsets(EdgeInsets())
      .listRowSeparator(.hidden)
  }
}

/// What the screen is for, as the header of its first section. A header
/// sizes to its text; as a form row of its own, the lede's last line lost the
/// bottom of its descenders.
struct AuthLede: View {
  let text: LocalizedStringKey

  var body: some View {
    Text(text, bundle: .module)
      .font(AppTheme.Typography.body)
      .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
      .textCase(nil)
      .listRowInsets(
        EdgeInsets(
          top: 0,
          leading: AppTheme.Spacing.space1,
          bottom: AppTheme.Spacing.space4,
          trailing: AppTheme.Spacing.space1
        )
      )
  }
}

/// The email field, its label as the placeholder.
struct AuthEmailField: View {
  @Binding var text: String

  var body: some View {
    TextField(text: $text, prompt: Text("auth.field.email", bundle: .module)) {
      Text("auth.field.email", bundle: .module)
    }
    .keyboardType(.emailAddress)
    .textContentType(.username)
    .textInputAutocapitalization(.never)
    .autocorrectionDisabled()
  }
}

/// The password field, its label as the placeholder, with a button that
/// shows or hides the text.
struct AuthPasswordField: View {
  @Binding var text: String
  @Binding var isVisible: Bool
  var textContentType: UITextContentType = .password

  var body: some View {
    HStack(spacing: AppTheme.Spacing.space3) {
      Group {
        if isVisible {
          TextField(text: $text, prompt: Text("auth.field.password", bundle: .module)) {
            Text("auth.field.password", bundle: .module)
          }
        } else {
          SecureField(text: $text, prompt: Text("auth.field.password", bundle: .module)) {
            Text("auth.field.password", bundle: .module)
          }
        }
      }
      .textContentType(textContentType)
      .textInputAutocapitalization(.never)
      .autocorrectionDisabled()

      Button {
        isVisible.toggle()
      } label: {
        Image(systemName: isVisible ? "eye.slash" : "eye")
          .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
      }
      .buttonStyle(.borderless)
      .accessibilityLabel(Text(isVisible ? "auth.password.hide" : "auth.password.show", bundle: .module))
    }
  }
}

/// A failed sign-in or sign-up and what to do next, in the error colour.
struct AuthErrorSection: View {
  let error: AppError

  var body: some View {
    Section {
      Label {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.space1) {
          Text(verbatim: error.errorDescription ?? "")
            .fontWeight(.semibold)
          if let recovery = error.recoverySuggestion {
            Text(verbatim: recovery)
          }
        }
      } icon: {
        Image(systemName: "exclamationmark.circle")
      }
      .font(AppTheme.Typography.subheadline)
      .foregroundStyle(AppTheme.Colors.error)
      .accessibilityElement(children: .combine)
      .accessibilityAddTraits(.updatesFrequently)
    }
    .listRowBackground(Color.clear)
  }
}

/// The full-width prominent submit button. While submitting it shows a
/// spinner and the pending label, and stays disabled. Sign in also shows
/// Forgot password?, which is not built yet (ADR 0010) and stays disabled.
struct AuthSubmitSection: View {
  let label: LocalizedStringKey
  let pendingLabel: LocalizedStringKey
  let canSubmit: Bool
  let isSubmitting: Bool
  var showsForgotPassword = false
  let onSubmit: () -> Void

  var body: some View {
    Section {
      VStack(spacing: AppTheme.Spacing.space1) {
        Button(action: onSubmit) {
          HStack(spacing: AppTheme.Spacing.space2) {
            if isSubmitting {
              ProgressView()
            }
            Text(isSubmitting ? pendingLabel : label, bundle: .module)
          }
          .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .disabled(!canSubmit || isSubmitting)

        if showsForgotPassword {
          Button {} label: {
            Text("auth.forgotPassword", bundle: .module)
              .frame(maxWidth: .infinity, minHeight: 44)
          }
          .buttonStyle(.borderless)
          .disabled(true)
        }
      }
    }
    .authBareSection()
  }
}

/// "or", then Continue with Apple and Continue with Google. Sign in with
/// Apple is not built yet: Apple's own button, disabled, placed first as
/// Apple's guidelines ask. Google is enabled when the app is configured for
/// it and nothing is in flight.
struct AuthProvidersSection: View {
  let googleEnabled: Bool
  let onGoogle: () -> Void
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    Section {
      VStack(spacing: AppTheme.Spacing.space3) {
        AuthOrDivider()
          .padding(.vertical, AppTheme.Spacing.space1)

        SignInWithAppleButton(.continue, onRequest: { _ in }, onCompletion: { _ in })
          .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
          .frame(height: 50)
          .clipShape(Capsule())
          .disabled(true)
          .opacity(0.4)

        Button(action: onGoogle) {
          Label {
            Text("auth.social.google", bundle: .module)
          } icon: {
            GoogleGlyph()
              .frame(width: 18, height: 18)
              .opacity(googleEnabled ? 1 : 0.4)
          }
          .frame(maxWidth: .infinity)
        }
        .buttonStyle(.bordered)
        .controlSize(.large)
        .tint(AppTheme.Colors.onSurface)
        .disabled(!googleEnabled)
      }
    }
    .authBareSection()
  }
}

/// "or" between two hairlines.
struct AuthOrDivider: View {
  var body: some View {
    HStack(spacing: AppTheme.Spacing.space3) {
      line
      Text("auth.divider.or", bundle: .module)
        .font(AppTheme.Typography.subheadline)
        .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
      line
    }
  }

  private var line: some View {
    Rectangle()
      .fill(AppTheme.Colors.outlineVariant)
      .frame(height: 1)
  }
}

/// The way across to the other auth screen: a prompt and a borderless button.
struct AuthFooterSection: View {
  let prompt: LocalizedStringKey
  let action: LocalizedStringKey
  let onAction: () -> Void

  var body: some View {
    Section {
      HStack(spacing: AppTheme.Spacing.space1) {
        Text(prompt, bundle: .module)
          .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
        Button(action: onAction) {
          Text(action, bundle: .module)
            .fontWeight(.semibold)
        }
        .buttonStyle(.borderless)
      }
      .font(AppTheme.Typography.subheadline)
      .frame(maxWidth: .infinity, minHeight: 44)
    }
    .authBareSection()
  }
}

/// Google's "G", drawn in its four colours.
struct GoogleGlyph: View {
  private static let blue = Color(red: 0.259, green: 0.522, blue: 0.957)
  private static let red = Color(red: 0.918, green: 0.263, blue: 0.208)
  private static let yellow = Color(red: 0.984, green: 0.737, blue: 0.020)
  private static let green = Color(red: 0.204, green: 0.659, blue: 0.325)

  var body: some View {
    Canvas { context, size in
      let lineWidth = size.width * 0.26
      let center = CGPoint(x: size.width / 2, y: size.height / 2)
      let radius = (size.width - lineWidth) / 2

      func arc(from start: Double, to end: Double, _ color: Color) {
        var path = Path()
        path.addArc(
          center: center,
          radius: radius,
          startAngle: .degrees(start),
          endAngle: .degrees(end),
          clockwise: false
        )
        context.stroke(
          path,
          with: .color(color),
          style: StrokeStyle(lineWidth: lineWidth, lineCap: .butt)
        )
      }

      // SwiftUI angles: 0° = 3 o'clock, increasing clockwise. The gap
      // around 0° is where the inner bar meets the ring.
      arc(from: 22, to: 95, Self.green)    // bottom-right
      arc(from: 95, to: 168, Self.yellow)  // bottom-left
      arc(from: 168, to: 256, Self.red)    // top-left → top
      arc(from: 256, to: 338, Self.blue)   // top-right → right

      // Inner blue bar, from the centre to the right edge.
      let barHeight = lineWidth
      let bar = CGRect(
        x: center.x,
        y: center.y - barHeight / 2,
        width: radius + lineWidth / 2,
        height: barHeight
      )
      context.fill(Path(bar), with: .color(Self.blue))
    }
    .accessibilityHidden(true)
  }
}
