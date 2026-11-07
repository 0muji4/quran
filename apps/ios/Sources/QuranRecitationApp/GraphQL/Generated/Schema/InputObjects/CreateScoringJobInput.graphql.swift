// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

public extension QuranSchema {
  nonisolated struct CreateScoringJobInput: InputObject {
    @_spi(Unsafe) public private(set) var __data: InputDict

    @_spi(Unsafe) public init(_ data: InputDict) {
      __data = data
    }

    public init(
      surahId: ID,
      ayahNumber: GraphQLNullable<Int32> = nil,
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

    public var ayahNumber: GraphQLNullable<Int32> {
      get { __data["ayahNumber"] }
      set { __data["ayahNumber"] = newValue }
    }

    public var uploadKey: String {
      get { __data["uploadKey"] }
      set { __data["uploadKey"] = newValue }
    }
  }

}