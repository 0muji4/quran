// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "QuranRecitationApp",
  defaultLocalization: "en",
  platforms: [.iOS(.v16)],
  products: [
    .executable(name: "QuranRecitationApp", targets: ["QuranRecitationApp"])
  ],
  dependencies: [
    .package(url: "https://github.com/apollographql/apollo-ios.git", exact: "1.25.5")
  ],
  targets: [
    .executableTarget(
      name: "QuranRecitationApp",
      dependencies: [
        .product(name: "Apollo", package: "apollo-ios"),
        .product(name: "ApolloAPI", package: "apollo-ios")
      ],
      path: "Sources/QuranRecitationApp",
      resources: [
        .process("Resources")
      ]
    ),
    .testTarget(
      name: "QuranRecitationAppTests",
      dependencies: ["QuranRecitationApp"],
      path: "Tests/QuranRecitationAppTests"
    )
  ]
)
