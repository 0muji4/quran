// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

public extension QuranSchema {
  nonisolated struct GetAyahQuery: GraphQLQuery {
    public static let operationName: String = "GetAyah"
    public static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query GetAyah($surahId: ID!, $ayahNumber: Int!) { ayah(surahId: $surahId, ayahNumber: $ayahNumber) { __typename id surahId ayahNumber textAr textEn transliteration } }"#
      ))

    public var surahId: ID
    public var ayahNumber: Int32

    public init(
      surahId: ID,
      ayahNumber: Int32
    ) {
      self.surahId = surahId
      self.ayahNumber = ayahNumber
    }

    @_spi(Unsafe) public var __variables: Variables? { [
      "surahId": surahId,
      "ayahNumber": ayahNumber
    ] }

    nonisolated public struct Data: QuranSchema.SelectionSet {
      @_spi(Unsafe) public let __data: DataDict
      @_spi(Unsafe) public init(_dataDict: DataDict) { __data = _dataDict }

      @_spi(Execution) public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.Query }
      @_spi(Execution) public static var __selections: [ApolloAPI.Selection] { [
        .field("ayah", Ayah?.self, arguments: [
          "surahId": .variable("surahId"),
          "ayahNumber": .variable("ayahNumber")
        ]),
      ] }
      @_spi(Execution) public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        GetAyahQuery.Data.self
      ] }

      public var ayah: Ayah? { __data["ayah"] }

      /// Ayah
      ///
      /// Parent Type: `Ayah`
      nonisolated public struct Ayah: QuranSchema.SelectionSet {
        @_spi(Unsafe) public let __data: DataDict
        @_spi(Unsafe) public init(_dataDict: DataDict) { __data = _dataDict }

        @_spi(Execution) public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.Ayah }
        @_spi(Execution) public static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("id", QuranSchema.ID.self),
          .field("surahId", QuranSchema.ID.self),
          .field("ayahNumber", Int.self),
          .field("textAr", String.self),
          .field("textEn", String?.self),
          .field("transliteration", String?.self),
        ] }
        @_spi(Execution) public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          GetAyahQuery.Data.Ayah.self
        ] }

        public var id: QuranSchema.ID { __data["id"] }
        public var surahId: QuranSchema.ID { __data["surahId"] }
        public var ayahNumber: Int { __data["ayahNumber"] }
        public var textAr: String { __data["textAr"] }
        public var textEn: String? { __data["textEn"] }
        public var transliteration: String? { __data["transliteration"] }
      }
    }
  }

}