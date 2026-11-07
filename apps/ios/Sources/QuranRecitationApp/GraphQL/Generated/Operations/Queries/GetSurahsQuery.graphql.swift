// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

public extension QuranSchema {
  nonisolated struct GetSurahsQuery: GraphQLQuery {
    public static let operationName: String = "GetSurahs"
    public static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query GetSurahs($limit: Int, $offset: Int) { surahs(limit: $limit, offset: $offset) { __typename id nameAr nameEn revelationPlace ayahCount } }"#
      ))

    public var limit: GraphQLNullable<Int32>
    public var offset: GraphQLNullable<Int32>

    public init(
      limit: GraphQLNullable<Int32>,
      offset: GraphQLNullable<Int32>
    ) {
      self.limit = limit
      self.offset = offset
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "limit": limit,
      "offset": offset
    ] }

    nonisolated public struct Data: QuranSchema.SelectionSet {
      @_spi(Unsafe) public let __data: DataDict
      @_spi(Unsafe) public init(_dataDict: DataDict) { __data = _dataDict }

      @_spi(Execution) public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.Query }
      @_spi(Execution) public static var __selections: [ApolloAPI.Selection] { [
        .field("surahs", [Surah].self, arguments: [
          "limit": .variable("limit"),
          "offset": .variable("offset")
        ]),
      ] }
      @_spi(Execution) public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        GetSurahsQuery.Data.self
      ] }

      public var surahs: [Surah] { __data["surahs"] }

      /// Surah
      ///
      /// Parent Type: `Surah`
      nonisolated public struct Surah: QuranSchema.SelectionSet {
        @_spi(Unsafe) public let __data: DataDict
        @_spi(Unsafe) public init(_dataDict: DataDict) { __data = _dataDict }

        @_spi(Execution) public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.Surah }
        @_spi(Execution) public static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("id", QuranSchema.ID.self),
          .field("nameAr", String.self),
          .field("nameEn", String.self),
          .field("revelationPlace", String.self),
          .field("ayahCount", Int.self),
        ] }
        @_spi(Execution) public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          GetSurahsQuery.Data.Surah.self
        ] }

        public var id: QuranSchema.ID { __data["id"] }
        public var nameAr: String { __data["nameAr"] }
        public var nameEn: String { __data["nameEn"] }
        public var revelationPlace: String { __data["revelationPlace"] }
        public var ayahCount: Int { __data["ayahCount"] }
      }
    }
  }

}