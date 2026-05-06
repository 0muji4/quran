// @generated
// This file was automatically generated and should not be edited.

import ApolloAPI

public extension QuranSchema {
  struct CreateScoringJobInput: InputObject {
    public private(set) var __data: InputDict

    public init(_ data: InputDict) {
      __data = data
    }

    public init(
      surahId: ID,
      ayahNumber: GraphQLNullable<Int> = nil,
      uploadKey: String
    ) {
      __data = InputDict([
        "surahId": surahId,
        "ayahNumber": ayahNumber,
        "uploadKey": uploadKey
      ])
    }

    public var surahId: ID {
      get { __data["surahId"] }
      set { __data["surahId"] = newValue }
    }

    public var ayahNumber: GraphQLNullable<Int> {
      get { __data["ayahNumber"] }
      set { __data["ayahNumber"] = newValue }
    }

    public var uploadKey: String {
      get { __data["uploadKey"] }
      set { __data["uploadKey"] = newValue }
    }
  }

}