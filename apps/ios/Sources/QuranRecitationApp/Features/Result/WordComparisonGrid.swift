import SwiftUI

/// Word-level alignment grid from `docs/design/iOS _ Result detail.png`.
/// Each tile shows one word from the reference recitation, tinted by
/// the diff operation: green for match, gold for substitution, dashed
/// for deletion, blue for insertion. The header carries the WER %.
struct WordComparisonGrid: View {
  let alignments: [WordAlignmentPayload]
  let werPercent: Int?

  var body: some View {
    BrandCard {
      VStack(alignment: .leading, spacing: Spacing.lg) {
        header
        if alignments.isEmpty {
          Text("result.words.empty", bundle: .module)
            .font(Font.brand.caption)
            .foregroundColor(Color.brand.textSecondary)
        } else {
          flow
        }
      }
    }
  }

  private var header: some View {
    HStack(alignment: .center) {
      Text("result.words.title", bundle: .module)
        .font(Font.brand.body.weight(.semibold))
        .foregroundColor(Color.brand.textPrimary)
      Spacer()
      if let werPercent {
        // Word error rate as an emphasised chip — the one number that
        // tells the user how far the transcript drifted from the
        // reference, so it earns a tinted pill rather than grey text.
        Text("WER \(werPercent)%")
          .font(Font.brand.caption.weight(.semibold))
          .foregroundColor(Color.brand.accent)
          .monospacedDigit()
          .padding(.horizontal, Spacing.sm)
          .padding(.vertical, Spacing.xs)
          .background(Color.brand.accent.opacity(0.14))
          .clipShape(Capsule())
      }
    }
  }

  private var flow: some View {
    // Right-aligned wrapping flow because Arabic reads RTL. Use a
    // simple HStack-of-rows layout that the iOS 16 toolkit provides
    // without bringing in `Layout` (iOS 16+ but more verbose).
    let rows = wrap(alignments: alignments)
    return VStack(alignment: .trailing, spacing: Spacing.sm) {
      ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
        HStack(spacing: Spacing.sm) {
          ForEach(Array(row.enumerated()), id: \.offset) { _, alignment in
            WordTile(alignment: alignment)
          }
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .trailing)
    .environment(\.layoutDirection, .rightToLeft)
  }

  /// Naive line-wrap: breaks every 4 alignments. Real word measurement
  /// would require `Layout` introspection — overkill for this stage.
  private func wrap(alignments: [WordAlignmentPayload]) -> [[WordAlignmentPayload]] {
    stride(from: 0, to: alignments.count, by: 4).map {
      Array(alignments[$0..<min($0 + 4, alignments.count)])
    }
  }
}

private struct WordTile: View {
  let alignment: WordAlignmentPayload

  var body: some View {
    Text(displayText)
      .font(Font.brand.arabicAyah.weight(.regular))
      .foregroundColor(foreground)
      .padding(.horizontal, Spacing.sm)
      .padding(.vertical, Spacing.xs)
      .background(background)
      .overlay(
        RoundedRectangle(cornerRadius: 8)
          .strokeBorder(border, style: StrokeStyle(lineWidth: 1, dash: dash))
      )
      .clipShape(RoundedRectangle(cornerRadius: 8))
      .accessibilityLabel(Text(accessibilityLabel))
  }

  private var displayText: String {
    alignment.refWord ?? alignment.hypWord ?? ""
  }

  private var background: Color {
    switch alignment.operation {
    case .match: return Color.brand.success.opacity(0.18)
    case .sub:   return Color.brand.accent.opacity(0.18)
    case .ins:   return Color.brand.primary.opacity(0.12)
    case .del:   return Color.brand.tile
    }
  }

  private var foreground: Color {
    switch alignment.operation {
    case .match: return Color.brand.success
    case .sub:   return Color.brand.accent
    case .ins:   return Color.brand.primary
    case .del:   return Color.brand.textSecondary
    }
  }

  private var border: Color {
    switch alignment.operation {
    case .del: return Color.brand.recording.opacity(0.5)
    default:   return .clear
    }
  }

  private var dash: [CGFloat] {
    alignment.operation == .del ? [3, 3] : []
  }

  private var accessibilityLabel: String {
    let word = displayText
    let descriptor: String
    switch alignment.operation {
    case .match: descriptor = NSLocalizedString("result.words.a11y.match", bundle: .module, comment: "")
    case .sub:   descriptor = NSLocalizedString("result.words.a11y.sub", bundle: .module, comment: "")
    case .ins:   descriptor = NSLocalizedString("result.words.a11y.ins", bundle: .module, comment: "")
    case .del:   descriptor = NSLocalizedString("result.words.a11y.del", bundle: .module, comment: "")
    }
    return "\(word), \(descriptor)"
  }
}
