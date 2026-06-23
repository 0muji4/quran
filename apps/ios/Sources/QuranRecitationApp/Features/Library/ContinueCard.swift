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
        HStack(spacing: Spacing.xs) {
          Image(systemName: "bookmark.fill")
            .font(.system(size: 11))
          Text("library.continueEyebrow", bundle: .module)
            .textCase(.uppercase)
        }
        .font(Font.brand.eyebrow)
        .foregroundColor(Color.brand.accent)

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

        progressBar

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

  /// Gold progress bar reading position-within-surah on the dark card —
  /// the accent fill over a faint track, matching the mock's amber rule.
  private var progressBar: some View {
    GeometryReader { geo in
      ZStack(alignment: .leading) {
        Capsule()
          .fill(Color.brand.textOnInverse.opacity(0.18))
          .frame(height: 4)
        Capsule()
          .fill(Color.brand.accent)
          .frame(width: geo.size.width * Self.fraction(entry), height: 4)
      }
      .frame(maxHeight: .infinity, alignment: .center)
    }
    .frame(height: 4)
    .accessibilityHidden(true)
  }

  /// Filled fraction of the progress bar, clamped to [0, 1]. Single-ayah
  /// surahs read as full; ayah 1 of N reads as 1/N so there's always a
  /// visible sliver of progress.
  static func fraction(_ entry: LastPracticed) -> CGFloat {
    guard entry.ayahCount > 0 else { return 0 }
    return min(1, max(0, CGFloat(entry.ayahNumber) / CGFloat(entry.ayahCount)))
  }

  private var progressLabel: LocalizedStringKey {
    "library.continueProgress \(entry.ayahNumber) \(entry.ayahCount)"
  }

  private var resumeLabel: LocalizedStringKey {
    "library.resumeAyah \(entry.ayahNumber)"
  }
}

/// Get-started variant of the Continue hero, shown when the user has no
/// recorded session yet. Reuses the dark inverse card and gold eyebrow so
/// the Library always leads with this hero (resume once there is history),
/// mirroring the web `ContinueCard` empty state. The CTA opens the first
/// surah at ayah 1 via `onStart`, matching web's `/practice/{first}/1`.
struct GetStartedCard: View {
  let onStart: () -> Void

  var body: some View {
    BrandCard(style: .inverse) {
      VStack(alignment: .leading, spacing: Spacing.md) {
        HStack(spacing: Spacing.xs) {
          Image(systemName: "bookmark.fill")
            .font(.system(size: 11))
          Text("library.getStartedEyebrow", bundle: .module)
            .textCase(.uppercase)
        }
        .font(Font.brand.eyebrow)
        .foregroundColor(Color.brand.accent)

        Text("library.getStartedTitle", bundle: .module)
          .font(Font.brand.sectionTitle)
          .foregroundColor(Color.brand.textOnInverse)

        Text("library.getStartedBody", bundle: .module)
          .font(Font.brand.caption)
          .foregroundColor(Color.brand.textOnInverse.opacity(0.75))

        Button {
          onStart()
        } label: {
          HStack {
            Text("library.getStartedCta", bundle: .module)
            Image(systemName: "arrow.right")
          }
        }
        .buttonStyle(.brandAccent)
      }
    }
  }
}
