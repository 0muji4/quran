import SnapshotTesting
import SwiftUI
import XCTest

/// One of the 8 renderings every snapshot is taken in (ADR 0027).
struct RenderVariant: CustomStringConvertible {
  let dark: Bool
  let largeText: Bool
  let rightToLeft: Bool

  /// File-name suffix, for example `dark_large_rtl`.
  var description: String {
    [dark ? "dark" : "light", largeText ? "large" : "default", rightToLeft ? "rtl" : "ltr"]
      .joined(separator: "_")
  }

  /// Rendered at display scale 1 to keep the committed images small.
  var traits: UITraitCollection {
    UITraitCollection { traits in
      traits.displayScale = 1
      traits.userInterfaceStyle = dark ? .dark : .light
      // About 135% of the default body size, the category closest to Android's 1.3 font scale.
      traits.preferredContentSizeCategory = largeText ? .extraExtraExtraLarge : .large
      traits.layoutDirection = rightToLeft ? .rightToLeft : .leftToRight
    }
  }

  static let all: [RenderVariant] = [false, true].flatMap { dark in
    [false, true].flatMap { largeText in
      [false, true].map { rtl in RenderVariant(dark: dark, largeText: largeText, rightToLeft: rtl) }
    }
  }
}

/// The width of the pinned simulator's screen (iPhone 17 Pro), and a height that fits the
/// longest screen state without scrolling.
let snapshotLayout = SwiftUISnapshotLayout.fixed(width: 402, height: 1800)

/// Compares `view`, rendered in `variant`, with `__Snapshots__/<test class>/<test>.<variant>.png`.
@MainActor
func assertSnapshot<V: View>(
  of view: V,
  in variant: RenderVariant,
  file: StaticString = #filePath,
  testName: String = #function,
  line: UInt = #line
) {
  let localized = view
    .environment(\.locale, Locale(identifier: variant.rightToLeft ? "ar" : "en"))
    .environment(\.layoutDirection, variant.rightToLeft ? .rightToLeft : .leftToRight)
  SnapshotTesting.assertSnapshot(
    of: localized,
    as: .image(layout: snapshotLayout, traits: variant.traits),
    named: variant.description,
    file: file,
    testName: testName,
    line: line
  )
}
