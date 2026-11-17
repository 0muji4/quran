import SwiftUI

/// An empty app whose only job is to give hosted tests a connected window scene.
@main
struct SnapshotHostApp: App {
  var body: some Scene {
    WindowGroup { Color.clear }
  }
}
