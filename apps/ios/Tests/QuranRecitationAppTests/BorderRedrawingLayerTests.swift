import QuartzCore
import UIKit
import XCTest

/// Checks the workaround in `BorderRedrawingLayer` against the `render(in:)` defect it
/// works around. Each test renders a 110×40 capsule border with continuous corners at
/// (10, 10) and reads the pixel on its left edge 9pt above and below its centre. A correct
/// capsule curves away from the edge there; the defect draws a straight edge through it.
final class BorderRedrawingLayerTests: XCTestCase {
  /// If this fails, `render(in:)` draws continuous borders correctly: delete
  /// `BorderRedrawingLayer` and `SnapshotHostingController`, and re-record the snapshots.
  func test_renderIn_drawsAContinuousCapsuleBorderWithStraightEnds() {
    let root = Self.capsuleScene(root: CALayer())
    XCTAssertLessThan(Self.brightness(of: root, x: 10, y: 21), 100)
    XCTAssertLessThan(Self.brightness(of: root, x: 10, y: 39), 100)
  }

  func test_redrawingLayer_drawsTheCapsuleEndsCurved() {
    let root = Self.capsuleScene(root: BorderRedrawingLayer())
    XCTAssertGreaterThan(Self.brightness(of: root, x: 10, y: 21), 200)
    XCTAssertGreaterThan(Self.brightness(of: root, x: 10, y: 39), 200)
  }

  func test_redrawingLayer_putsTheBorderBackAfterRendering() {
    let root = Self.capsuleScene(root: BorderRedrawingLayer())
    _ = Self.brightness(of: root, x: 10, y: 21)
    let capsule = root.sublayers?.first
    XCTAssertEqual(capsule?.borderWidth, 1)
    XCTAssertEqual(capsule?.sublayers ?? [], [])
  }

  private static func capsuleScene(root: CALayer) -> CALayer {
    root.frame = CGRect(x: 0, y: 0, width: 130, height: 60)
    root.backgroundColor = UIColor.white.cgColor
    let capsule = CALayer()
    capsule.frame = CGRect(x: 10, y: 10, width: 110, height: 40)
    capsule.cornerRadius = 20
    capsule.cornerCurve = .continuous
    capsule.borderWidth = 1
    capsule.borderColor = UIColor.black.cgColor
    root.addSublayer(capsule)
    return root
  }

  /// The red channel at (x, y), from 0 (black) to 255 (white). The checked points are
  /// symmetric about the capsule's centre, so the context's vertical orientation does not
  /// matter.
  private static func brightness(of layer: CALayer, x: Int, y: Int) -> Int {
    let width = Int(layer.bounds.width)
    let height = Int(layer.bounds.height)
    let context = CGContext(
      data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    layer.render(in: context)
    let pixels = context.data!.assumingMemoryBound(to: UInt8.self)
    return Int(pixels[(y * width + x) * 4])
  }
}
