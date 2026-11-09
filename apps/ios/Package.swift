// swift-tools-version: 6.1
import PackageDescription

let package = Package(
  name: "QuranRecitationApp",
  defaultLocalization: "en",
  platforms: [.iOS(.v18)],
  products: [
    .executable(name: "QuranRecitationApp", targets: ["QuranRecitationApp"])
  ],
  dependencies: [
    .package(url: "https://github.com/apollographql/apollo-ios.git", exact: "2.5.0"),
    .package(url: "https://github.com/google/GoogleSignIn-iOS.git", from: "10.1.0"),
    .package(url: "https://github.com/pointfreeco/swift-snapshot-testing.git", exact: "1.19.7")
  ],
  targets: [
    .executableTarget(
      name: "QuranRecitationApp",
      dependencies: [
        .product(name: "Apollo", package: "apollo-ios"),
        .product(name: "ApolloAPI", package: "apollo-ios"),
        .product(name: "GoogleSignIn", package: "GoogleSignIn-iOS")
      ],
      path: "Sources/QuranRecitationApp",
      resources: [
        .process("Resources")
      ]
    ),
    .testTarget(
      name: "QuranRecitationAppTests",
      dependencies: [
        "QuranRecitationApp",
        .product(name: "Apollo", package: "apollo-ios"),
        .product(name: "ApolloAPI", package: "apollo-ios"),
        .product(name: "SnapshotTesting", package: "swift-snapshot-testing")
      ],
      path: "Tests/QuranRecitationAppTests",
      exclude: ["__Snapshots__"]
    )
  ],
  swiftLanguageModes: [.v5]
)
