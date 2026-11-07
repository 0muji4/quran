// swift-tools-version: 6.1
import PackageDescription

let package = Package(
  name: "QuranRecitationApp",
  defaultLocalization: "en",
  platforms: [.iOS(.v16)],
  products: [
    .executable(name: "QuranRecitationApp", targets: ["QuranRecitationApp"])
  ],
  dependencies: [
    .package(url: "https://github.com/apollographql/apollo-ios.git", exact: "2.5.0"),
    .package(url: "https://github.com/google/GoogleSignIn-iOS.git", from: "10.1.0")
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
        .product(name: "ApolloAPI", package: "apollo-ios")
      ],
      path: "Tests/QuranRecitationAppTests"
    )
  ],
  swiftLanguageModes: [.v5]
)
