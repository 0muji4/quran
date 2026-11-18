import SwiftUI
import XCTest

/// Checks that snapshots are captured the way `assertSnapshot(of:in:)` relies on (ADR 0031):
/// in the TestHost app's key window, through the render server, with animations stopped.
@MainActor
final class SnapshotHarnessTests: XCTestCase {
  /// Without a host app there is no connected scene, and `drawHierarchy` returns a blank
  /// image.
  func test_runsInAHostAppWithAKeyWindow() {
    let windows = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap(\.windows)
    XCTAssertTrue(windows.contains(where: \.isKeyWindow))
  }

  /// `CALayer.render(in:)` draws a border with continuous corners with straight edges
  /// sticking out at the ends of a capsule. The render server draws it correctly. A 110×40
  /// black capsule border at (10, 10) on white curves away from its left edge 9pt above and
  /// below its centre, so those pixels stay white.
  func test_drawsAContinuousCapsuleBorderWithCurvedEnds() throws {
    let capsule = UIView(frame: CGRect(x: 10, y: 10, width: 110, height: 40))
    capsule.layer.cornerRadius = 20
    capsule.layer.cornerCurve = .continuous
    capsule.layer.borderWidth = 1
    capsule.layer.borderColor = UIColor.black.cgColor
    let scene = UIView(frame: CGRect(x: 0, y: 0, width: 130, height: 60))
    scene.backgroundColor = .white
    scene.addSubview(capsule)

    let image = try Self.capture(scene)

    XCTAssertGreaterThan(Self.brightness(of: image, x: 10, y: 21), 200)
    XCTAssertGreaterThan(Self.brightness(of: image, x: 10, y: 39), 200)
  }

  /// A spinner, or any animation, would make a capture depend on when it is taken. Under a
  /// `FrozenTimeView` an animation shows its first frame. Here a 20pt black square is
  /// animated from x 10 to x 110 (its centre) in a millisecond and kept at the end. If time
  /// ran, it would have reached x 110 before the capture.
  func test_capturesAnimationsAtTheirFirstFrame() throws {
    let frozen = try Self.captureAnimatedSquare(frozen: true)
    XCTAssertLessThan(Self.brightness(of: frozen, x: 10, y: 10), 50)
    XCTAssertGreaterThan(Self.brightness(of: frozen, x: 110, y: 10), 200)
  }

  /// Without the `FrozenTimeView`, time runs: the same animation, started a second before the
  /// capture so it has certainly ended, shows the square at its end. This shows the test
  /// above tells the two apart.
  func test_capturesAnimationsAtTheirEndWithoutFrozenTime() throws {
    let running = try Self.captureAnimatedSquare(frozen: false)
    XCTAssertGreaterThan(Self.brightness(of: running, x: 10, y: 10), 200)
    XCTAssertLessThan(Self.brightness(of: running, x: 110, y: 10), 50)
  }

  /// Captures a 120×20 white view with the animated square in it, under a `FrozenTimeView`
  /// or, to show the difference, under a plain view with the animation started a second ago.
  private static func captureAnimatedSquare(frozen: Bool) throws -> CGImage {
    let frame = CGRect(x: 0, y: 0, width: 120, height: 20)
    let container = frozen ? FrozenTimeView(frame: frame) : UIView(frame: frame)
    container.backgroundColor = .white
    let square = CALayer()
    square.frame = CGRect(x: 0, y: 0, width: 20, height: 20)
    square.backgroundColor = UIColor.black.cgColor
    container.layer.addSublayer(square)
    let move = CABasicAnimation(keyPath: "position.x")
    move.fromValue = 10
    move.toValue = 110
    move.duration = 0.001
    move.fillMode = .forwards
    move.isRemovedOnCompletion = false
    snapshotWindow().addSubview(container)
    if !frozen {
      move.beginTime = square.convertTime(CACurrentMediaTime(), from: nil) - 1
    }
    square.add(move, forKey: "move")
    return try capture(container)
  }

  /// The comparison passes a difference of up to `snapshotChannelTolerance` in a channel,
  /// such as glass noise, and fails anything larger, in light and in dark colours alike.
  func test_channelMismatch_passesUpToTheToleranceAndFailsBeyondIt() {
    for base in [20, 240] {
      let reference = Self.solidImage(gray: base)
      XCTAssertNil(channelMismatch(reference, reference, tolerance: snapshotChannelTolerance))
      XCTAssertNil(
        channelMismatch(
          reference, Self.solidImage(gray: base + snapshotChannelTolerance),
          tolerance: snapshotChannelTolerance))
      XCTAssertNotNil(
        channelMismatch(
          reference, Self.solidImage(gray: base + snapshotChannelTolerance + 1),
          tolerance: snapshotChannelTolerance))
    }
  }

  /// A 4×4 opaque image in one sRGB grey, `gray` out of 255.
  private static func solidImage(gray: Int) -> UIImage {
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.preferredRange = .standard
    return UIGraphicsImageRenderer(size: CGSize(width: 4, height: 4), format: format).image {
      context in
      let value = CGFloat(gray) / 255
      UIColor(red: value, green: value, blue: value, alpha: 1).setFill()
      context.fill(CGRect(x: 0, y: 0, width: 4, height: 4))
    }
  }

  /// A large navigation title sits on the 16pt layout margin, mirrored in right-to-left.
  /// Under swift-snapshot-testing's own preparation it lost its leading margin.
  func test_largeTitleKeepsTheLayoutMargin() throws {
    for variant in RenderVariant.all where !variant.dark && !variant.largeText {
      let controller = UIHostingController(
        rootView: NavigationStack {
          List { Text(verbatim: "Row") }
            .navigationTitle(Text(verbatim: "Library"))
        })
      _ = captureInKeyWindow(controller, in: variant)
      let title = try XCTUnwrap(
        Self.views(in: controller.view)
          .compactMap { $0 as? UILabel }
          .first { $0.text == "Library" && $0.font.pointSize > 30 })
      let frame = title.convert(title.bounds, to: controller.view)
      if variant.rightToLeft {
        XCTAssertEqual(frame.maxX, snapshotSize.width - 16, accuracy: 0.5, "\(variant)")
      } else {
        XCTAssertEqual(frame.minX, 16, accuracy: 0.5, "\(variant)")
      }
    }
  }

  /// A search field holding text, whose clear button was drawn differently from capture to
  /// capture, has its clear button hidden in every rendering and captures the same way twice.
  func test_searchFieldWithTextHidesItsClearButton() throws {
    for variant in RenderVariant.all {
      var captures: [UIImage] = []
      for _ in 0..<2 {
        let controller = UIHostingController(
          rootView: NavigationStack {
            List { Text(verbatim: "Row") }
              .navigationTitle(Text(verbatim: "Library"))
              .searchable(
                text: .constant("Yasin"), placement: .navigationBarDrawer(displayMode: .always))
          })
        captures.append(captureInKeyWindow(controller, in: variant))
        let fields = Self.views(in: controller.view).compactMap { $0 as? UISearchTextField }
        XCTAssertFalse(fields.isEmpty, "\(variant)")
        for field in fields {
          XCTAssertEqual(field.clearButtonMode, .never, "\(variant)")
          XCTAssertTrue(buttons(in: field).allSatisfy(\.isHidden), "\(variant)")
        }
      }
      XCTAssertNil(
        channelMismatch(captures[0], captures[1], tolerance: snapshotChannelTolerance),
        "\(variant)")
    }
  }

  /// The selection thumb of a segmented control is iOS 26 glass, which only the render
  /// server draws. The baselines show it on "Mecca".
  func test_segmentedControl() {
    for variant in RenderVariant.all {
      assertSnapshot(
        of: Picker(selection: .constant(1)) {
          Text(verbatim: "All").tag(0)
          Text(verbatim: "Mecca").tag(1)
          Text(verbatim: "Medina").tag(2)
        } label: {
          Text(verbatim: "Filter")
        }
        .pickerStyle(.segmented)
        .padding(),
        in: variant
      )
    }
  }

  /// Shows `view` in the snapshot window and captures it at scale 1 through the render
  /// server.
  private static func capture(_ view: UIView) throws -> CGImage {
    let window = snapshotWindow()
    window.addSubview(view)
    defer { view.removeFromSuperview() }
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    let image = UIGraphicsImageRenderer(bounds: view.bounds, format: format).image { _ in
      _ = view.drawHierarchy(in: view.bounds, afterScreenUpdates: true)
    }
    return try XCTUnwrap(image.cgImage)
  }

  /// The red channel at (x, y), from 0 (black) to 255 (white). The checked points are
  /// symmetric about the capsule's centre, so the context's vertical orientation does not
  /// matter.
  private static func brightness(of image: CGImage, x: Int, y: Int) -> Int {
    let width = image.width
    let height = image.height
    let context = CGContext(
      data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    let pixels = context.data!.assumingMemoryBound(to: UInt8.self)
    return Int(pixels[(y * width + x) * 4])
  }

  private static func views(in root: UIView) -> [UIView] {
    [root] + root.subviews.flatMap(views(in:))
  }
}
