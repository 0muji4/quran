import SwiftUI
import XCTest

/// Temporary diagnostic, not for merging. Runs inside `SnapshotHost`, so windows join a
/// connected scene and `drawHierarchy(in:afterScreenUpdates: true)` can go through the
/// render server. Answers three questions before the snapshot harness moves to a host app:
///
/// 1. Repeatability: the searchable screen (clear button glyph and glass field) captured
///    six times with `drawHierarchy` and six times with `render(in:)`.
/// 2. Glass: a segmented control with the first and then the second segment selected. If
///    the two captures differ, the selection thumb is drawn.
/// 3. Height: a 402×1800 window, taller than the 874-point screen, with a red band at the
///    bottom. The pixel there tells whether off-screen parts are drawn.
///
/// Writes `report.txt` and the captures to `$SNAPSHOT_ARTIFACTS/HostedCaptureDiagnostic`.
@MainActor
final class HostedCaptureDiagnosticTests: XCTestCase {
  private var out: URL!
  private var report: [String] = []

  func test_hostedCapture() throws {
    let root = ProcessInfo.processInfo.environment["SNAPSHOT_ARTIFACTS"]
      .map { URL(fileURLWithPath: $0) } ?? FileManager.default.temporaryDirectory
    out = root.appendingPathComponent("HostedCaptureDiagnostic")
    try FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
    defer {
      try? report.joined(separator: "\n").write(
        to: out.appendingPathComponent("report.txt"), atomically: true, encoding: .utf8)
    }

    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    report.append(
      "connectedScenes=\(UIApplication.shared.connectedScenes.count) windowScenes=\(scenes.count)"
        + " screen=\(scenes.first.map { "\($0.screen.bounds) scale=\($0.screen.scale)" } ?? "nil")")
    let scene = try XCTUnwrap(scenes.first, "no connected window scene")

    // 1. Repeatability of the searchable screen.
    let searchable = NavigationStack {
      List { Text(verbatim: "Row") }
        .navigationTitle(Text(verbatim: "Library"))
        .searchable(
          text: .constant("Yasin"), placement: .navigationBarDrawer(displayMode: .always))
    }
    for method in Method.allCases {
      var images: [Data] = []
      for attempt in 0..<6 {
        let png = try capture(searchable, in: scene, size: CGSize(width: 402, height: 300), method)
        images.append(png)
        try png.write(to: out.appendingPathComponent("search-\(method)-\(attempt).png"))
      }
      report.append(
        "search \(method): \(Set(images).count) distinct of 6,"
          + " colors=\(Self.colorCount(images[0]))")
    }

    // 2. Glass: does the segmented selection thumb show?
    for method in Method.allCases {
      var bySelection: [Data] = []
      for selection in 0..<2 {
        let picker = Picker(selection: .constant(selection)) {
          Text(verbatim: "All").tag(0)
          Text(verbatim: "Mecca").tag(1)
          Text(verbatim: "Medina").tag(2)
        } label: {
          Text(verbatim: "Filter")
        }
        .pickerStyle(.segmented)
        .padding()
        let png = try capture(picker, in: scene, size: CGSize(width: 402, height: 100), method)
        bySelection.append(png)
        try png.write(to: out.appendingPathComponent("segmented-\(method)-\(selection).png"))
      }
      report.append(
        "segmented \(method): selection 0 and 1 \(bySelection[0] == bySelection[1] ? "SAME" : "differ")")
    }

    // 3. Height: is the part below the screen drawn?
    let tall = VStack(spacing: 0) {
      Color.white
      Color.red.frame(height: 100)
    }
    .ignoresSafeArea()
    for method in Method.allCases {
      let png = try capture(tall, in: scene, size: CGSize(width: 402, height: 1800), method)
      try png.write(to: out.appendingPathComponent("tall-\(method).png"))
      report.append(
        "tall \(method): pixel at (201, 1750) = \(Self.pixel(png, x: 201, y: 1750)),"
          + " at (201, 400) = \(Self.pixel(png, x: 201, y: 400))")
    }

    XCTFail("Diagnostic run: the snapshot artifacts hold the report and the captures.")
  }

  private enum Method: String, CaseIterable, CustomStringConvertible {
    case drawHierarchy, render
    var description: String { rawValue }
  }

  /// Shows `view` in a key window of `scene`, laid out at `size`, and captures it at scale 1.
  private func capture<V: View>(
    _ view: V, in scene: UIWindowScene, size: CGSize, _ method: Method
  ) throws -> Data {
    let window = UIWindow(windowScene: scene)
    window.frame = CGRect(origin: .zero, size: size)
    let host = UIHostingController(rootView: view)
    window.rootViewController = host
    window.makeKeyAndVisible()
    host.view.frame = window.bounds
    window.layoutIfNeeded()
    defer { window.isHidden = true }

    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    var drew = true
    let image = UIGraphicsImageRenderer(bounds: window.bounds, format: format).image { context in
      switch method {
      case .drawHierarchy:
        drew = window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
      case .render:
        window.layer.render(in: context.cgContext)
      }
    }
    if !drew { report.append("  \(method) \(size): drawHierarchy returned false") }
    return try XCTUnwrap(image.pngData())
  }

  private static func rgba(_ png: Data) -> (pixels: [UInt32], width: Int, height: Int)? {
    guard let image = UIImage(data: png)?.cgImage else { return nil }
    let width = image.width
    let height = image.height
    var pixels = [UInt32](repeating: 0, count: width * height)
    let drawn = pixels.withUnsafeMutableBytes { buffer -> Bool in
      guard
        let context = CGContext(
          data: buffer.baseAddress, width: width, height: height, bitsPerComponent: 8,
          bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(),
          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
      else { return false }
      context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
      return true
    }
    return drawn ? (pixels, width, height) : nil
  }

  /// Distinct RGBA values in the image; 1 means a blank capture.
  private static func colorCount(_ png: Data) -> Int {
    rgba(png).map { Set($0.pixels).count } ?? -1
  }

  /// The pixel at (x, y) from the top-left, as RRGGBBAA.
  private static func pixel(_ png: Data, x: Int, y: Int) -> String {
    guard let bitmap = rgba(png), x < bitmap.width, y < bitmap.height else { return "n/a" }
    // The bitmap context's memory starts at the top row.
    let value = bitmap.pixels[y * bitmap.width + x].littleEndian
    let bytes = withUnsafeBytes(of: value) { Array($0) }
    return bytes.map { String(format: "%02X", $0) }.joined()
  }
}
