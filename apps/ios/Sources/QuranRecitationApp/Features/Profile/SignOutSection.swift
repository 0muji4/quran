import SwiftUI

/// "Sign out" section on the Profile tab. Extracted from `ProfileView`
/// so the signed-in scroll layout can compose it alongside the header,
/// account-data, and danger-zone cards without growing the parent
/// view's body.
struct SignOutSection: View {
  let onSignOut: () -> Void

  var body: some View {
    Button(action: onSignOut) {
      Text("profile.action.signOut", bundle: .module)
    }
    .buttonStyle(.brandAccent)
    .frame(maxWidth: .infinity)
  }
}
