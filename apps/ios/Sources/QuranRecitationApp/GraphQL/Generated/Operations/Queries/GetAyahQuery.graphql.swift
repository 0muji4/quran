// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public extension QuranSchema {
  class GetAyahQuery: GraphQLQuery {
    public static let operationName: String = "GetAyah"
    public static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query GetAyah($surahId: ID!, $ayahNumber: Int!) { ayah(surahId: $surahId, ayahNumber: $ayahNumber) { __typename id surahId ayahNumber textAr textEn transliteration } }"#
      ))

    public var surahId: ID
    public var ayahNumber: Int

    public init(
      surahId: ID,
      ayahNumber: Int
    ) {
      self.surahId = surahId
      self.ayahNumber = ayahNumber
    }

    public var __variables: Variables? { [
      "surahId": surahId,
      "ayahNumber": ayahNumber
    ] }

    public struct Data: QuranSchema.SelectionSet {
      public let __data: DataDict
      public init(_dataDict: DataDict) { __data = _dataDict }

      public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.Query }
      public static var __selections: [ApolloAPI.Selection] { [
        .field("ayah", Ayah?.self, arguments: [
          "surahId": .variable("surahId"),
          "ayahNumber": .variable("ayahNumber")
        ]),
      ] }
      public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        GetAyahQuery.Data.self
      ] }

      public var ayah: Ayah? { __data["ayah"] }

      /// Ayah
      ///
      /// Parent Type: `Ayah`
      public struct Ayah: QuranSchema.SelectionSet {
        public let __data: DataDict
        public init(_dataDict: DataDict) { __data = _dataDict }

        public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.Ayah }
        public static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("id", QuranSchema.ID.self),
          .field("surahId", QuranSchema.ID.self),
          .field("ayahNumber", Int.self),
          .field("textAr", String.self),
          .field("textEn", String?.self),
          .field("transliteration", String?.self),
        ] }
        public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
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