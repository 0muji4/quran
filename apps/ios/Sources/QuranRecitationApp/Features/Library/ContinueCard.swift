import SwiftUI

/// Continue-your-practice card shown above the surah list when the
/// user has a recent session. Mirrors the dark surface in
/// `docs/design/iOS _ Surah library.png`. The "Resume" CTA dispatches
/// to the parent via `onResume(_:)`; cross-tab navigation handler
/// lands in PR 15 (end-to-end Practice wiring).
struct ContinueCard: View {
  let entry: LastPracticed
  let onResume: (LastPracticed) -> Void

  var body: some View {
    BrandCard(style: .inverse) {
      VStack(alignment: .leading, spacing: Spacing.md) {
        Text("library.continueEyebrow", bundle: .module)
          .font(Font.brand.eyebrow)
          .foregroundColor(Color.brand.accent)
          .textCase(.uppercase)

        HStack(alignment: .firstTextBaseline, spacing: Spacing.sm) {
          Text(entry.surahNameAr)
            .font(Font.brand.arabicAyah.weight(.regular))
            .foregroundColor(Color.brand.textOnInverse)
            .environment(\.layoutDirection, .rightToLeft)
          Text(entry.surahNameEn)
            .font(Font.brand.sectionTitle)
            .foregroundColor(Color.brand.textOnInverse)
        }

        Text(progressLabel)
          .font(Font.brand.caption)
          .foregroundColor(Color.brand.textOnInverse.opacity(0.75))

        Button {
          onResume(entry)
        } label: {
          HStack {
            Text(resumeLabel)
            Image(systemName: "arrow.right")
          }
        }
        .buttonStyle(.brandAccent)
      }
    }
  }

  private var progressLabel: LocalizedStringKey {
    "library.continueProgress \(entry.ayahNumber) \(entry.ayahCount)"
  }

  private var resumeLabel: LocalizedStringKey {
    "library.resumeAyah \(entry.ayahNumber)"
  }
}
