// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public extension QuranSchema {
  class GetSurahsQuery: GraphQLQuery {
    public static let operationName: String = "GetSurahs"
    public static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query GetSurahs($limit: Int, $offset: Int) { surahs(limit: $limit, offset: $offset) { __typename id nameAr nameEn revelationPlace ayahCount } }"#
      ))

    public var limit: GraphQLNullable<Int>
    public var offset: GraphQLNullable<Int>

    public init(
      limit: GraphQLNullable<Int>,
      offset: GraphQLNullable<Int>
    ) {
      self.limit = limit
      self.offset = offset
    }

    public var __variables: Variables? { [
      "limit": limit,
      "offset": offset
    ] }

    public struct Data: QuranSchema.SelectionSet {
      public let __data: DataDict
      public init(_dataDict: DataDict) { __data = _dataDict }

      public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.Query }
      public static var __selections: [ApolloAPI.Selection] { [
        .field("surahs", [Surah].self, arguments: [
          "limit": .variable("limit"),
          "offset": .variable("offset")
        ]),
      ] }
      public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        GetSurahsQuery.Data.self
      ] }

      public var surahs: [Surah] { __data["surahs"] }

      /// Surah
      ///
      /// Parent Type: `Surah`
      public struct Surah: QuranSchema.SelectionSet {
        public let __data: DataDict
        public init(_dataDict: DataDict) { __data = _dataDict }

        public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.Surah }
        public static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("id", QuranSchema.ID.self),
          .field("nameAr", String.self),
          .field("nameEn", String.self),
          .field("revelationPlace", String.self),
          .field("ayahCount", Int.self),
        ] }
        public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
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