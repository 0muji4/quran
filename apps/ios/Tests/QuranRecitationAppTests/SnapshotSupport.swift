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

  /// Applies the rendering to `controller` itself through `traitOverrides`. Display scale 1
  /// keeps the committed images small.
  @MainActor
  func apply(to controller: UIViewController) {
    controller.traitOverrides.displayScale = 1
    controller.traitOverrides.userInterfaceStyle = dark ? .dark : .light
    // About 135% of the default body size, the category closest to Android's 1.3 font scale.
    controller.traitOverrides.preferredContentSizeCategory =
      largeText ? .extraExtraExtraLarge : .large
    controller.traitOverrides.layoutDirection = rightToLeft ? .rightToLeft : .leftToRight
  }

  static let all: [RenderVariant] = [false, true].flatMap { dark in
    [false, true].flatMap { largeText in
      [false, true].map { rtl in RenderVariant(dark: dark, largeText: largeText, rightToLeft: rtl) }
    }
  }
}

/// The width of the pinned simulator's screen (iPhone 17 Pro), and a height that fits the
/// longest screen state without scrolling. The host app's key window is resized to it for
/// each capture, and keeps the screen's safe area (the status bar and the home indicator).
let snapshotSize = CGSize(width: 402, height: 1800)

/// Compares `view`, rendered in `variant`, with `__Snapshots__/<test class>/<test>.<variant>.png`.
///
/// The tests run inside the TestHost app (ADR 0031). `captureInKeyWindow(_:in:)` shows the
/// view as the root of the app's key window and captures it through the render server, which
/// includes what only the render server draws, such as iOS 26 glass. swift-snapshot-testing
/// records, loads and compares the files.
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
  let strategy = Snapshotting<UIViewController, UIImage>(
    pathExtension: "png",
    diffing: .channelTolerant(.image(scale: 1), tolerance: snapshotChannelTolerance)
  ) { controller in
    MainActor.assumeIsolated { captureInKeyWindow(controller, in: variant) }
  }
  SnapshotTesting.assertSnapshot(
    of: UIHostingController(rootView: localized),
    as: strategy,
    named: variant.description,
    file: file,
    testName: testName,
    line: line
  )
}

/// Shows `controller` as the root of the TestHost app's key window, laid out at
/// `snapshotSize` in `variant`, and captures the window through the render server.
///
/// This replaces swift-snapshot-testing's own preparation, which wraps the screen in a parent
/// view controller and overrides its traits from there: under that parent, a large
/// navigation title loses its leading margin, whatever traits are overridden.
///
/// The render server draws animations as they are at the moment of the capture, such as the
/// angle of a spinner, so Core Animation time is stopped in the screen and every animation
/// is captured at its first frame.
@MainActor
func captureInKeyWindow(_ controller: UIViewController, in variant: RenderVariant) -> UIImage {
  let window = snapshotWindow()
  let previousRoot = window.rootViewController
  defer { window.rootViewController = previousRoot }
  variant.apply(to: controller)
  stopAnimationTime(in: controller.view.layer)
  window.rootViewController = controller
  window.frame = CGRect(origin: .zero, size: snapshotSize)
  window.layoutIfNeeded()
  let format = UIGraphicsImageRendererFormat()
  format.scale = 1
  format.preferredRange = .standard
  return UIGraphicsImageRenderer(bounds: window.bounds, format: format).image { _ in
    _ = window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
  }
}

/// Stops Core Animation time in `layer` (`speed` 0), so an animation added anywhere under
/// it stays at its first frame. It has no effect on a window's own layer, the root of what
/// the render server draws, so it is applied to a view inside the window.
func stopAnimationTime(in layer: CALayer) {
  layer.speed = 0
  layer.timeOffset = 0
}

/// A view with Core Animation time stopped (`stopAnimationTime(in:)`).
final class FrozenTimeView: UIView {
  override init(frame: CGRect) {
    super.init(frame: frame)
    stopAnimationTime(in: layer)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }
}

/// The TestHost app's key window, which snapshots are captured in (ADR 0031).
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
