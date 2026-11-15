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
let snapshotSize = CGSize(width: 402, height: 1800)

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
    of: SnapshotHostingController(rootView: localized),
    as: .image(size: snapshotSize, traits: variant.traits),
    named: variant.description,
    file: file,
    testName: testName,
    line: line
  )
}

/// Hosts a SwiftUI view for a snapshot in a view whose layer redraws borders before the
/// snapshot is captured (`BorderRedrawingLayer`). Otherwise the same as the SwiftUI view
/// strategy: both hand the controller's view to swift-snapshot-testing's view snapshot.
final class SnapshotHostingController<Content: View>: UIViewController {
  private let hosting: UIHostingController<Content>

  init(rootView: Content) {
    hosting = UIHostingController(rootView: rootView)
    super.init(nibName: nil, bundle: nil)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  override func loadView() {
    view = BorderRedrawingView()
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    addChild(hosting)
    hosting.view.frame = view.bounds
    hosting.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    view.addSubview(hosting.view)
    hosting.didMove(toParent: self)
  }
}

private final class BorderRedrawingView: UIView {
  override class var layerClass: AnyClass { BorderRedrawingLayer.self }
}

/// swift-snapshot-testing captures a view with `CALayer.render(in:)` when the tests run
/// without a host app. `render(in:)` draws a border with continuous corners wrongly: a
/// capsule gets straight edges sticking out at its ends, and a smaller corner radius gets
/// notches where the curve meets the straight edge. SwiftUI's `Capsule()` and
/// `RoundedRectangle` default to continuous corners, so their outlines are affected. This
/// layer redraws those borders as paths for the capture and then puts them back.
final class BorderRedrawingLayer: CALayer {
  override func render(in ctx: CGContext) {
    let restore = redrawContinuousBorders(in: self)
    super.render(in: ctx)
    restore()
  }
}

/// Replaces each continuous-corner border in the layer tree under `root` with a path of the
/// same outline, and returns a closure that puts the borders back. `UIBezierPath`'s rounded
/// rectangle has continuous corners, like the border it replaces.
func redrawContinuousBorders(in root: CALayer) -> () -> Void {
  var restores: [() -> Void] = []

  func visit(_ layer: CALayer) {
    (layer.sublayers ?? []).forEach(visit)
    guard layer.borderWidth > 0, layer.cornerRadius > 0, layer.cornerCurve == .continuous,
      layer.maskedCorners == allCorners, let color = layer.borderColor
    else { return }

    let width = layer.borderWidth
    let outline = CAShapeLayer()
    outline.frame = layer.bounds
    outline.contentsScale = layer.contentsScale
    outline.path = UIBezierPath(
      roundedRect: layer.bounds.insetBy(dx: width / 2, dy: width / 2),
      cornerRadius: max(layer.cornerRadius - width / 2, 0)
    ).cgPath
    outline.fillColor = nil
    outline.strokeColor = color
    outline.lineWidth = width

    layer.borderWidth = 0
    layer.addSublayer(outline)
    restores.append {
      outline.removeFromSuperlayer()
      layer.borderWidth = width
    }
  }

  CATransaction.begin()
  CATransaction.setDisableActions(true)
  visit(root)
  CATransaction.commit()

  return {
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    restores.reversed().forEach { $0() }
    CATransaction.commit()
  }
}

private let allCorners: CACornerMask = [
  .layerMinXMinYCorner, .layerMaxXMinYCorner, .layerMinXMaxYCorner, .layerMaxXMaxYCorner,
]
