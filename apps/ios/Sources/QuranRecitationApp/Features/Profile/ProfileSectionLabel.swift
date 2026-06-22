import SwiftUI

/// Muted, letter-spaced section label sitting above a Profile card
/// ("PRACTICE PREFERENCES", "ACCOUNT"). Distinct from `BrandEyebrow`:
/// the page-level eyebrow carries the gold ✦, while these in-page
/// section headers are quiet grey labels with no ornament.
struct ProfileSectionLabel: View {
  private let key: LocalizedStringKey

  init(_ key: LocalizedStringKey) {
    self.key = key
  }

  var body: some View {
    Text(key, bundle: .module)
      .font(.system(size: 11, weight: .semibold))
      .textCase(.uppercase)
      .tracking(0.6)
      .foregroundColor(Color.brand.textSecondary)
  }
}
