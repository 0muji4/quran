import SwiftUI

/// Score dial + verdict badge from
/// `docs/design/iOS _ Result detail.png`. Renders an animated arc
/// ring around the central numeral. `score` is 0…100; the arc fills
/// proportionally and the verdict badge sits above the dial.
struct ScoreHero: View {
  let score: Double?
  let verdict: String?
  let detail: String?

  var body: some View {
    BrandCard {
      VStack(spacing: Spacing.lg) {
        if let verdict {
          VerdictBadge(text: verdict)
        }
        ScoreDial(score: clampedScore)
        if let detail {
          Text(detail)
            .font(Font.brand.caption)
            .foregroundColor(Color.brand.textSecondary)
            .multilineTextAlignment(.center)
            .padding(.horizontal, Spacing.md)
        }
      }
      .frame(maxWidth: .infinity)
    }
  }

  private var clampedScore: Double {
    guard let score else { return 0 }
    return max(0, min(100, score))
  }
}

private struct VerdictBadge: View {
  let text: String

  var body: some View {
    HStack(spacing: Spacing.xs) {
      Image(systemName: "checkmark.circle.fill")
        .foregroundColor(Color.brand.success)
      Text(text.uppercased())
        .font(Font.brand.eyebrow)
        .foregroundColor(Color.brand.success)
    }
    .padding(.horizontal, Spacing.md)
    .padding(.vertical, Spacing.xs)
    .background(Color.brand.success.opacity(0.12))
    .clipShape(Capsule())
  }
}

struct ScoreDial: View {
  let score: Double

  private let lineWidth: CGFloat = 10
  private let size: CGFloat = 180

  var body: some View {
    ZStack {
      Circle()
        .stroke(Color.brand.tile, lineWidth: lineWidth)
      Circle()
        .trim(from: 0, to: progress)
        .stroke(
          Color.brand.success,
          style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
        )
        .rotationEffect(.degrees(-90))
        .animation(.easeOut(duration: 0.6), value: score)
      VStack(spacing: 0) {
        Text("\(Int(score))")
          .font(Font.brand.scoreDisplay)
          .foregroundColor(Color.brand.textPrimary)
          .monospacedDigit()
        Text("OF 100")
          .font(Font.brand.eyebrow)
          .foregroundColor(Color.brand.textSecondary)
      }
    }
    .frame(width: size, height: size)
    .accessibilityElement(children: .combine)
    .accessibilityLabel(Text("Score \(Int(score)) of 100"))
  }

  private var progress: CGFloat {
    CGFloat(max(0, min(100, score)) / 100)
  }
}
