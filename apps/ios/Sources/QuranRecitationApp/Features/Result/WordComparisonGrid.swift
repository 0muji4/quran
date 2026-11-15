import SwiftUI

/// The ayah's words as the recognizer aligned them, right to left and
/// wrapping: green for a match, amber for a substitution with what was heard
/// under it, a dashed struck-through word for one that is missing, and blue
/// for an extra word. A legend and a note that a difference may come from the
/// recognizer follow. The header carries the word error rate.
struct WordComparisonGrid: View {
  let alignments: [WordAlignmentPayload]
  let werPercent: Int?

  @Environment(\.layoutDirection) private var layoutDirection

  var body: some View {
    AppPanel {
      HStack(alignment: .firstTextBaseline) {
        Text("result.words.title", bundle: .module)
          .font(AppTheme.Typography.headline)
          .foregroundStyle(AppTheme.Colors.onSurface)
        Spacer(minLength: AppTheme.Spacing.space2)
        if let werPercent {
          Text("result.words.wer \(werPercent)", bundle: .module)
            .font(AppTheme.Typography.footnote.monospacedDigit())
            .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
        }
      }
      if alignments.isEmpty {
        Text("result.words.empty", bundle: .module)
          .font(AppTheme.Typography.footnote)
          .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
      } else {
        WrappingFlow(fromRight: true, spacing: AppTheme.Spacing.space2, lineSpacing: AppTheme.Spacing.space2) {
          ForEach(Array(alignments.enumerated()), id: \.offset) { _, alignment in
            WordTile(alignment: alignment)
          }
        }
        // The ayah reads right to left whatever the interface direction.
        .environment(\.layoutDirection, .leftToRight)
        WrappingFlow(
          fromRight: layoutDirection == .rightToLeft,
          spacing: AppTheme.Spacing.space3,
          lineSpacing: AppTheme.Spacing.space1
        ) {
          ForEach(WordOp.allCases, id: \.self) {
            LegendItem(op: $0).environment(\.layoutDirection, layoutDirection)
          }
        }
        .environment(\.layoutDirection, .leftToRight)
        .accessibilityHidden(true)
        Text("result.words.note", bundle: .module)
          .font(AppTheme.Typography.footnote)
          .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
          .fixedSize(horizontal: false, vertical: true)
      }
    }
  }
}

/// How the recognizer aligned a word with the ayah.
private enum WordOp: CaseIterable {
  case match, substituted, missing, extra

  init(_ operation: WordAlignmentPayload.Operation) {
    switch operation {
    case .match: self = .match
    case .sub: self = .substituted
    case .del: self = .missing
    case .ins: self = .extra
    }
  }

  var label: LocalizedStringKey {
    switch self {
    case .match: "result.words.match"
    case .substituted: "result.words.substituted"
    case .missing: "result.words.missing"
    case .extra: "result.words.extra"
    }
  }

  /// The fill; a missing word has none and a dashed outline instead.
  var container: Color {
    switch self {
    case .match: AppTheme.Colors.passContainer
    case .substituted: AppTheme.Colors.warnContainer
    case .missing: .clear
    case .extra: AppTheme.Colors.secondaryContainer
    }
  }

  var content: Color {
    switch self {
    case .match: AppTheme.Colors.onPassContainer
    case .substituted: AppTheme.Colors.onWarnContainer
    case .missing: AppTheme.Colors.onSurfaceVariant
    case .extra: AppTheme.Colors.onSecondaryContainer
    }
  }
}

/// A word's container: a filled rounded rectangle, or a dashed outline for a
/// missing word.
private struct WordContainer: ViewModifier {
  let op: WordOp
  let cornerRadius: CGFloat

  func body(content: Content) -> some View {
    let shape = RoundedRectangle(cornerRadius: cornerRadius)
    if op == .missing {
      content.overlay(
        shape.strokeBorder(AppTheme.Colors.outline, style: StrokeStyle(lineWidth: 1.5, dash: [4, 3])))
    } else {
      content.background(op.container, in: shape)
    }
  }
}

private struct WordTile: View {
  let alignment: WordAlignmentPayload

  var body: some View {
    let op = WordOp(alignment.operation)
    VStack(spacing: 0) {
      Text(verbatim: word)
        .font(Self.wordFont)
        .strikethrough(op == .missing)
      note(op)
        .font(AppTheme.Typography.caption2)
    }
    .foregroundStyle(op.content)
    .padding(.horizontal, AppTheme.Spacing.space3)
    .padding(.vertical, AppTheme.Spacing.space1)
    .frame(minWidth: 48)
    .modifier(WordContainer(op: op, cornerRadius: AppTheme.Shape.small))
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(Text(verbatim: word))
    .accessibilityValue(accessibilityValue(op))
  }

  private var word: String {
    alignment.refWord ?? alignment.hypWord ?? "—"
  }

  @ViewBuilder
  private func note(_ op: WordOp) -> some View {
    switch op {
    case .match:
      EmptyView()
    case .substituted:
      if let heard = alignment.hypWord {
        Text("result.words.heard \(heard)", bundle: .module)
      }
    case .missing, .extra:
      Text(op.label, bundle: .module)
    }
  }

  private func accessibilityValue(_ op: WordOp) -> Text {
    if op == .substituted, let heard = alignment.hypWord {
      return Text("result.words.heard \(heard)", bundle: .module)
    }
    return Text(op.label, bundle: .module)
  }

  /// Large enough for Amiri's marks to read inside a word tile.
  private static let wordFont = Font.custom(AppTheme.Typography.quranFontName, size: 22, relativeTo: .body)
}

private struct LegendItem: View {
  let op: WordOp

  var body: some View {
    HStack(spacing: AppTheme.Spacing.space1) {
      Color.clear
        .frame(width: 10, height: 10)
        .modifier(WordContainer(op: op, cornerRadius: 3))
      Text(op.label, bundle: .module)
        .font(AppTheme.Typography.caption)
        .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
    }
  }
}

/// Lays its subviews out in rows, wrapping to a new row when one is full.
/// Rows start at the left edge, or at the right edge when `fromRight`. The
/// layout places the subviews itself, so callers set a left-to-right
/// environment around it and pass the direction they want.
private struct WrappingFlow: Layout {
  let fromRight: Bool
  let spacing: CGFloat
  let lineSpacing: CGFloat

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let rows = rows(for: subviews, width: proposal.width ?? .infinity)
    let height = rows.map(\.height).reduce(0, +) + lineSpacing * CGFloat(max(rows.count - 1, 0))
    let widest = rows.map(\.width).max() ?? 0
    return CGSize(width: proposal.width ?? widest, height: height)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    var y = bounds.minY
    for row in rows(for: subviews, width: bounds.width) {
      var x = fromRight ? bounds.maxX : bounds.minX
      for index in row.indices {
        let size = subviews[index].sizeThatFits(.unspecified)
        let origin = fromRight ? x - size.width : x
        subviews[index].place(
          at: CGPoint(x: origin, y: y + (row.height - size.height) / 2),
          proposal: ProposedViewSize(size))
        x = fromRight ? origin - spacing : origin + size.width + spacing
      }
      y += row.height + lineSpacing
    }
  }

  private struct Row {
    var indices: [Int] = []
    var width: CGFloat = 0
    var height: CGFloat = 0
  }

  private func rows(for subviews: Subviews, width: CGFloat) -> [Row] {
    var rows: [Row] = []
    var current = Row()
    for index in subviews.indices {
      let size = subviews[index].sizeThatFits(.unspecified)
      let added = current.indices.isEmpty ? size.width : current.width + spacing + size.width
      if added > width, !current.indices.isEmpty {
        rows.append(current)
        current = Row(indices: [index], width: size.width, height: size.height)
      } else {
        current.indices.append(index)
        current.width = added
        current.height = max(current.height, size.height)
      }
    }
    if !current.indices.isEmpty { rows.append(current) }
    return rows
  }
}
