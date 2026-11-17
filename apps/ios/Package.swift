// swift-tools-version: 6.1
import PackageDescription

let package = Package(
  name: "QuranRecitationApp",
  defaultLocalization: "en",
  platforms: [.iOS(.v18)],
  products: [
    .library(name: "QuranRecitationApp", targets: ["QuranRecitationApp"]),
    .executable(name: "QuranRecitationAppMain", targets: ["QuranRecitationAppMain"])
  ],
  dependencies: [
    .package(url: "https://github.com/apollographql/apollo-ios.git", exact: "2.5.0"),
    .package(url: "https://github.com/google/GoogleSignIn-iOS.git", from: "10.1.0")
  ],
  targets: [
    // Everything the app is made of. The executable below only holds the entry point.
    // The tests run in a host app from TestHost/project.yml, which links this library.
    .target(
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
    .executableTarget(
      name: "QuranRecitationAppMain",
      dependencies: ["QuranRecitationApp"],
      path: "Sources/QuranRecitationAppMain"
    )
  ],
  swiftLanguageModes: [.v5]
)
