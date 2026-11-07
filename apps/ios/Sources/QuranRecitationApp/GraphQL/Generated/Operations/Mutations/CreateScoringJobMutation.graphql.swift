// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

public extension QuranSchema {
  nonisolated struct CreateScoringJobMutation: GraphQLMutation {
    public static let operationName: String = "CreateScoringJob"
    public static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"mutation CreateScoringJob($input: CreateScoringJobInput!) { createScoringJob(input: $input) { __typename jobId status score verdict segments { __typename label score } feedback { __typename accuracy completeness overall referenceAudioUrl transcript wer cer wordAlignments { __typename refWord hypWord op } } } }"#
      ))

    public var input: CreateScoringJobInput

    public init(input: CreateScoringJobInput) {
      self.input = input
    }

    @_spi(Unsafe) public var __variables: Variables? { ["input": input] }

    nonisolated public struct Data: QuranSchema.SelectionSet {
      @_spi(Unsafe) public let __data: DataDict
      @_spi(Unsafe) public init(_dataDict: DataDict) { __data = _dataDict }

      @_spi(Execution) public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.Mutation }
      @_spi(Execution) public static var __selections: [ApolloAPI.Selection] { [
        .field("createScoringJob", CreateScoringJob.self, arguments: ["input": .variable("input")]),
      ] }
      @_spi(Execution) public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        CreateScoringJobMutation.Data.self
      ] }

      public var createScoringJob: CreateScoringJob { __data["createScoringJob"] }

      /// CreateScoringJob
      ///
      /// Parent Type: `ScoringResult`
      nonisolated public struct CreateScoringJob: QuranSchema.SelectionSet {
        @_spi(Unsafe) public let __data: DataDict
        @_spi(Unsafe) public init(_dataDict: DataDict) { __data = _dataDict }

        @_spi(Execution) public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.ScoringResult }
        @_spi(Execution) public static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("jobId", QuranSchema.ID.self),
          .field("status", GraphQLEnum<QuranSchema.ScoringStatus>.self),
          .field("score", Double?.self),
          .field("verdict", String?.self),
          .field("segments", [Segment].self),
          .field("feedback", Feedback?.self),
        ] }
        @_spi(Execution) public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
          CreateScoringJobMutation.Data.CreateScoringJob.self
        ] }

        public var jobId: QuranSchema.ID { __data["jobId"] }
        public var status: GraphQLEnum<QuranSchema.ScoringStatus> { __data["status"] }
        public var score: Double? { __data["score"] }
        public var verdict: String? { __data["verdict"] }
        public var segments: [Segment] { __data["segments"] }
        public var feedback: Feedback? { __data["feedback"] }

        /// CreateScoringJob.Segment
        ///
        /// Parent Type: `ScoreSegment`
        nonisolated public struct Segment: QuranSchema.SelectionSet {
          @_spi(Unsafe) public let __data: DataDict
          @_spi(Unsafe) public init(_dataDict: DataDict) { __data = _dataDict }

          @_spi(Execution) public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.ScoreSegment }
          @_spi(Execution) public static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("label", String.self),
            .field("score", Double.self),
          ] }
          @_spi(Execution) public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            CreateScoringJobMutation.Data.CreateScoringJob.Segment.self
          ] }

          public var label: String { __data["label"] }
          public var score: Double { __data["score"] }
        }

        /// CreateScoringJob.Feedback
        ///
        /// Parent Type: `PronunciationFeedback`
        nonisolated public struct Feedback: QuranSchema.SelectionSet {
          @_spi(Unsafe) public let __data: DataDict
          @_spi(Unsafe) public init(_dataDict: DataDict) { __data = _dataDict }

          @_spi(Execution) public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.PronunciationFeedback }
          @_spi(Execution) public static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("accuracy", Double.self),
            .field("completeness", Double.self),
            .field("overall", Double.self),
            .field("referenceAudioUrl", String?.self),
            .field("transcript", String?.self),
            .field("wer", Double?.self),
            .field("cer", Double?.self),
            .field("wordAlignments", [WordAlignment].self),
          ] }
          @_spi(Execution) public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
            CreateScoringJobMutation.Data.CreateScoringJob.Feedback.self
          ] }

          public var accuracy: Double { __data["accuracy"] }
          public var completeness: Double { __data["completeness"] }
          public var overall: Double { __data["overall"] }
          public var referenceAudioUrl: String? { __data["referenceAudioUrl"] }
          public var transcript: String? { __data["transcript"] }
          public var wer: Double? { __data["wer"] }
          public var cer: Double? { __data["cer"] }
          public var wordAlignments: [WordAlignment] { __data["wordAlignments"] }

          /// CreateScoringJob.Feedback.WordAlignment
          ///
          /// Parent Type: `WordAlignment`
          nonisolated public struct WordAlignment: QuranSchema.SelectionSet {
            @_spi(Unsafe) public let __data: DataDict
            @_spi(Unsafe) public init(_dataDict: DataDict) { __data = _dataDict }

            @_spi(Execution) public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.WordAlignment }
            @_spi(Execution) public static var __selections: [ApolloAPI.Selection] { [
              .field("__typename", String.self),
              .field("refWord", String?.self),
              .field("hypWord", String?.self),
              .field("op", String.self),
            ] }
            @_spi(Execution) public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
              CreateScoringJobMutation.Data.CreateScoringJob.Feedback.WordAlignment.self
            ] }

            public var refWord: String? { __data["refWord"] }
            public var hypWord: String? { __data["hypWord"] }
            public var op: String { __data["op"] }
          }
        }
      }
    }
  }

}