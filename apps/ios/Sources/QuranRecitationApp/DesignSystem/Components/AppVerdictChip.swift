import SwiftUI

/// How well part of a recitation went.
enum AppVerdict {
  case pass
  case warn
  case fail
}

/// How prominent an `AppVerdictChip` is.
enum AppVerdictEmphasis {
  /// The verdict on the whole recitation: a capsule.
  case overall
  /// The verdict on one tajweed rule: a smaller rounded chip.
  case rule
}

/// A verdict in its container colour with an icon (a check, an exclamation
/// mark or a cross), so the verdict does not rely on colour alone. `label`
/// says the verdict in words.
struct AppVerdictChip: View {
  let verdict: AppVerdict
  let label: String
  var emphasis: AppVerdictEmphasis = .rule

  var body: some View {
    let overall = emphasis == .overall
    HStack(spacing: 6) {
      Image(systemName: symbol)
        .font(.system(size: overall ? 13 : 11, weight: .bold))
      Text(verbatim: label)
        .font((overall ? AppTheme.Typography.subheadline : AppTheme.Typography.footnote).weight(.medium))
    }
    .foregroundStyle(content)
    .padding(.horizontal, overall ? AppTheme.Spacing.space3 : 10)
    .frame(minHeight: 32)
    .background(
      container,
      in: overall
        ? AnyShape(Capsule())
        : AnyShape(RoundedRectangle(cornerRadius: AppTheme.Shape.small, style: .continuous))
    )
    .accessibilityElement(children: .combine)
  }

  private var symbol: String {
    switch verdict {
    case .pass: "checkmark"
    case .warn: "exclamationmark"
    case .fail: "xmark"
    }
  }

  private var container: Color {
    switch verdict {
    case .pass: AppTheme.Colors.passContainer
    case .warn: AppTheme.Colors.warnContainer
    case .fail: AppTheme.Colors.failContainer
    }
  }

  private var content: Color {
    switch verdict {
    case .pass: AppTheme.Colors.onPassContainer
    case .warn: AppTheme.Colors.onWarnContainer
    case .fail: AppTheme.Colors.onFailContainer
    }
  }
}

/// Every verdict at both emphases, for `#Preview` and the snapshot tests.
struct AppVerdictChipSpecimen: View {
  var body: some View {
    AppVerdictChip(verdict: .pass, label: "Well recited", emphasis: .overall)
    AppVerdictChip(verdict: .warn, label: "Nearly there", emphasis: .overall)
    AppVerdictChip(verdict: .fail, label: "Try again", emphasis: .overall)
    HStack(spacing: AppTheme.Spacing.space2) {
      AppVerdictChip(verdict: .pass, label: "Madd · Good")
      AppVerdictChip(verdict: .warn, label: "Ghunnah · Check")
    }
    AppVerdictChip(verdict: .fail, label: "Qalqalah · Missed")
  }
}

#Preview("Light") {
  AppSpecimenSurface { AppVerdictChipSpecimen() }
}

#Preview("Dark") {
  AppSpecimenSurface { AppVerdictChipSpecimen() }
    .preferredColorScheme(.dark)
}
