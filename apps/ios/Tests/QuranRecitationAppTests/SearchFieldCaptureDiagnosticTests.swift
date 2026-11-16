import SwiftUI
import XCTest

/// Temporary diagnostic, not for merging. The earlier runs showed that the search field's
/// clear button glyph is an `RBSymbolLayer` with no bitmap contents, and that
/// `CALayer.render(in:)` (what swift-snapshot-testing uses by default) usually leaves it
/// out, sometimes not. This run captures the same screen six times with `render(in:)` and
/// six times with `drawHierarchy(in:afterScreenUpdates: true)`, which goes through the
/// render server, and reports per method how many distinct images it produced and whether
/// the clear button's area holds anything but background.
@MainActor
final class SearchFieldCaptureDiagnosticTests: XCTestCase {
  func test_searchFieldCapture() throws {
    let root = ProcessInfo.processInfo.environment["SNAPSHOT_ARTIFACTS"]
      .map { URL(fileURLWithPath: $0) } ?? FileManager.default.temporaryDirectory
    let out = root.appendingPathComponent("SearchFieldCaptureDiagnostic")
    try FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
    var report: [String] = [
      "connectedScenes=\(UIApplication.shared.connectedScenes.count)"
    ]

    for method in ["render", "drawHierarchy"] {
      var images: [Data] = []
      for attempt in 0..<6 {
        let screen = NavigationStack {
          List { Text(verbatim: "Row") }
            .navigationTitle(Text(verbatim: "Library"))
            .searchable(
              text: .constant("Yasin"), placement: .navigationBarDrawer(displayMode: .always))
        }
        let host = UIHostingController(rootView: screen)
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 402, height: 300))
        window.rootViewController = host
        window.isHidden = false
        host.view.frame = window.bounds
        host.view.layoutIfNeeded()

        let clear = Self.views(in: host.view).first { "\(type(of: $0))" == "_UITextFieldClearButton" }
        let clearRect = clear.map { $0.convert($0.bounds, to: host.view) } ?? .zero

        let format = UIGraphicsImageRendererFormat()
        format.scale = 3
        let image = UIGraphicsImageRenderer(bounds: host.view.bounds, format: format).image {
          context in
          if method == "render" {
            host.view.layer.render(in: context.cgContext)
          } else {
            _ = host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true)
          }
        }
        let png = image.pngData()!
        images.append(png)
        try png.write(to: out.appendingPathComponent("\(method)-\(attempt).png"))
        report.append(
          "\(method) attempt=\(attempt) windowScene=\(window.windowScene != nil)"
            + " clearRect=\(clearRect)"
            + " clearColors=\(Self.distinctColors(in: image, rect: clearRect))"
            + " wholeColors=\(Self.distinctColors(in: image, rect: host.view.bounds))")
        window.isHidden = true
      }
      report.append("\(method): \(Set(images).count) distinct images of 6")
    }
    try report.joined(separator: "\n").write(
      to: out.appendingPathComponent("report.txt"), atomically: true, encoding: .utf8)
    XCTFail("Diagnostic run: the snapshot artifacts hold the report and the captures.")
  }

  private static func views(in root: UIView) -> [UIView] {
    [root] + root.subviews.flatMap(views(in:))
  }

  /// The number of distinct RGBA values inside `rect` (in points), 1 when it is flat.
  private static func distinctColors(in image: UIImage, rect: CGRect) -> Int {
    guard let cgImage = image.cgImage, !rect.isEmpty else { return 0 }
    let scale = image.scale
    let pixelRect = CGRect(
      x: rect.minX * scale, y: rect.minY * scale,
      width: rect.width * scale, height: rect.height * scale
    ).integral
    guard let cropped = cgImage.cropping(to: pixelRect) else { return 0 }
    let width = cropped.width
    let height = cropped.height
    var pixels = [UInt32](repeating: 0, count: width * height)
    let drawn = pixels.withUnsafeMutableBytes { buffer -> Bool in
      guard
        let context = CGContext(
          data: buffer.baseAddress, width: width, height: height, bitsPerComponent: 8,
          bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(),
          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
      else { return false }
      context.draw(cropped, in: CGRect(x: 0, y: 0, width: width, height: height))
      return true
    }
    return drawn ? Set(pixels).count : -1
  }
}
