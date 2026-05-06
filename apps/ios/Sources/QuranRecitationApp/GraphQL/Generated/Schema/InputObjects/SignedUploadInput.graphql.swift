// @generated
// This file was automatically generated and should not be edited.

import ApolloAPI

public extension QuranSchema {
  struct SignedUploadInput: InputObject {
    public private(set) var __data: InputDict

    public init(_ data: InputDict) {
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