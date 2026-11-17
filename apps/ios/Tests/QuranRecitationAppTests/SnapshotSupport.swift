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
/// longest screen state without scrolling. The host app's key window is resized to it for
/// each capture.
let snapshotSize = CGSize(width: 402, height: 1800)

/// Compares `view`, rendered in `variant`, with `__Snapshots__/<test class>/<test>.<variant>.png`.
///
/// The tests run inside the TestHost app (ADR 0031), so the view is shown in the app's key
/// window and captured with `drawHierarchy(in:afterScreenUpdates:)`. That capture goes
/// through the render server and includes what only it draws, such as iOS 26 glass.
///
/// The render server draws animations as they are at the moment of the capture, such as
/// the angle of a spinner. The view is hosted in a `FrozenTimeView`, so every animation is
/// captured at its first frame.
///
/// Glass is not drawn the same way every time: repeat captures differ by up to 2/255 in a
/// colour channel inside glass, and nowhere else. So every pixel is compared, and a colour
/// channel matches when it differs by at most `snapshotChannelTolerance` (3/255).
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
  var strategy = Snapshotting<UIViewController, UIImage>.image(
    drawHierarchyInKeyWindow: true,
    size: snapshotSize,
    traits: variant.traits
  )
  strategy.diffing = .channelTolerant(strategy.diffing, tolerance: snapshotChannelTolerance)
  SnapshotTesting.assertSnapshot(
    of: FrozenTimeHostingController(rootView: localized),
    as: strategy,
    named: variant.description,
    file: file,
    testName: testName,
    line: line
  )
}

/// A view whose layer has Core Animation time stopped (`speed` 0). An animation added
/// anywhere under it stays at its first frame, so a capture through the render server does
/// not depend on when it is taken.
final class FrozenTimeView: UIView {
  override init(frame: CGRect) {
    super.init(frame: frame)
    layer.speed = 0
    layer.timeOffset = 0
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }
}

/// Hosts a SwiftUI view in a `FrozenTimeView` for a snapshot.
final class FrozenTimeHostingController<Content: View>: UIViewController {
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
    view = FrozenTimeView()
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

/// The TestHost app's key window, which swift-snapshot-testing captures in (ADR 0031).
@MainActor
func snapshotWindow(file: StaticString = #filePath, line: UInt = #line) -> UIWindow {
  guard
    let window = UIApplication.shared.connectedScenes
      .compactMap({ $0 as? UIWindowScene })
      .flatMap(\.windows)
      .first(where: \.isKeyWindow)
  else {
    preconditionFailure("Snapshots need the TestHost app's key window (ADR 0031)", file: file, line: line)
  }
  return window
}

/// The largest difference in a colour channel, out of 255, that still counts as a match.
/// Measured glass noise reaches 2; any change to the UI that matters is far larger.
let snapshotChannelTolerance = 3

extension Diffing where Value == UIImage {
  /// `base`, with its comparison replaced by `channelMismatch(_:_:tolerance:)`. The library's
  /// own `perceptualPrecision` computes ΔE on sRGB values as if they were linear, which
  /// inflates differences in dark colours and hides larger ones in light colours, so it
  /// cannot express a tolerance that is the same everywhere.
  static func channelTolerant(_ base: Diffing, tolerance: Int) -> Diffing {
    .diff(toData: base.toData, fromData: base.fromData) { old, new in
      guard let message = channelMismatch(old, new, tolerance: tolerance) else { return nil }
      return (
        message,
        [.data(base.toData(old), name: "reference.png"), .data(base.toData(new), name: "failure.png")]
      )
    }
  }
}

/// Compares two images as 8-bit sRGB. Returns nil when they have the same size and every
/// colour channel of every pixel differs by at most `tolerance`, and otherwise says how they
/// differ.
func channelMismatch(_ old: UIImage, _ new: UIImage, tolerance: Int) -> String? {
  guard let reference = srgbBytes(of: old), let actual = srgbBytes(of: new) else {
    return "An image could not be read."
  }
  guard reference.width == actual.width, reference.height == actual.height else {
    return "The image is \(actual.width)×\(actual.height) px; the reference is"
      + " \(reference.width)×\(reference.height) px."
  }
  if reference.bytes == actual.bytes { return nil }
  var differing = 0
  var largest = 0
  for index in reference.bytes.indices {
    let delta = abs(Int(reference.bytes[index]) - Int(actual.bytes[index]))
    largest = max(largest, delta)
    if delta > tolerance { differing += 1 }
  }
  if differing == 0 { return nil }
  return "\(differing) colour channels differ by more than \(tolerance)/255 (the largest by"
    + " \(largest)/255)."
}

/// The image's pixels as 8-bit RGBA in sRGB, top row first.
private func srgbBytes(of image: UIImage) -> (bytes: [UInt8], width: Int, height: Int)? {
  guard let cgImage = image.cgImage, let space = CGColorSpace(name: CGColorSpace.sRGB) else {
    return nil
  }
  let width = cgImage.width
  let height = cgImage.height
  var bytes = [UInt8](repeating: 0, count: width * height * 4)
  let drawn = bytes.withUnsafeMutableBytes { buffer -> Bool in
    guard
      let context = CGContext(
        data: buffer.baseAddress, width: width, height: height, bitsPerComponent: 8,
        bytesPerRow: width * 4, space: space,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
    else { return false }
    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
    return true
  }
  return drawn ? (bytes, width, height) : nil
}
