// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

public extension QuranSchema {
  nonisolated struct SignedUploadInput: InputObject {
    @_spi(Unsafe) public private(set) var __data: InputDict

    @_spi(Unsafe) public init(_ data: InputDict) {
      __data = data
    }

    public init(
      filename: String,
      contentType: String
    ) {
      __data = InputDict([
        "filename": filename,
        "contentType": contentType
      ])
    }

    public var filename: String {
      get { __data["filename"] }
      set { __data["filename"] = newValue }
    }

    public var contentType: String {
      get { __data["contentType"] }
      set { __data["contentType"] = newValue }
    }
  }

}