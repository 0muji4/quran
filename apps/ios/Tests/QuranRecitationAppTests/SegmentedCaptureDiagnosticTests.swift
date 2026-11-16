import SwiftUI
import XCTest

/// Temporary diagnostic, not for merging. Shows whether a segmented picker's selected
/// thumb exists on screen and whether the snapshot capture (`CALayer.render(in:)`)
/// misses it: writes both captures and the layer tree to the snapshot artifacts.
@MainActor
final class SegmentedCaptureDiagnosticTests: XCTestCase {
  func test_segmentedThumb() throws {
    let root = ProcessInfo.processInfo.environment["SNAPSHOT_ARTIFACTS"]
      .map { URL(fileURLWithPath: $0) } ?? FileManager.default.temporaryDirectory
    let out = root.appendingPathComponent("SegmentedCaptureDiagnostic")
    try FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)

    for dark in [false, true] {
      let picker = Picker("Filter", selection: .constant(0)) {
        Text(verbatim: "All").tag(0)
        Text(verbatim: "Mecca").tag(1)
        Text(verbatim: "Medina").tag(2)
        Text(verbatim: "Short").tag(3)
      }
      .pickerStyle(.segmented)
      .padding(16)
      .frame(width: 402, height: 80)
      let host = UIHostingController(rootView: picker)
      let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 402, height: 80))
      window.overrideUserInterfaceStyle = dark ? .dark : .light
      window.rootViewController = host
      window.makeKeyAndVisible()
      host.view.frame = window.bounds
      host.view.layoutIfNeeded()
      RunLoop.main.run(until: Date().addingTimeInterval(1))

      var lines: [String] = []
      func dump(_ layer: CALayer, _ depth: Int) {
        let delegate = layer.delegate.map { String(describing: type(of: $0)) } ?? "-"
        lines.append(
          String(repeating: "  ", count: depth)
            + "\(type(of: layer)) delegate=\(delegate) frame=\(layer.frame.integral)"
            + " opacity=\(layer.opacity) hidden=\(layer.isHidden) contents=\(layer.contents != nil)"
            + " bg=\(layer.backgroundColor != nil) filters=\(layer.filters?.count ?? 0)"
            + " compositing=\(String(describing: layer.compositingFilter))")
        layer.sublayers?.forEach { dump($0, depth + 1) }
      }
      dump(window.layer, 0)

      let format = UIGraphicsImageRendererFormat()
      format.scale = 3
      let renderer = UIGraphicsImageRenderer(bounds: window.bounds, format: format)
      let rendered = renderer.image { window.layer.render(in: $0.cgContext) }
      let drawn = renderer.image { _ in _ = window.drawHierarchy(in: window.bounds, afterScreenUpdates: true) }
      let mode = dark ? "dark" : "light"
      try rendered.pngData()!.write(to: out.appendingPathComponent("render-in-\(mode).png"))
      try drawn.pngData()!.write(to: out.appendingPathComponent("draw-hierarchy-\(mode).png"))
      try lines.joined(separator: "\n").write(
        to: out.appendingPathComponent("layers-\(mode).txt"), atomically: true, encoding: .utf8)
      window.isHidden = true
    }
    XCTFail("Diagnostic run: the snapshot artifacts hold both captures and the layer tree.")
  }
}
