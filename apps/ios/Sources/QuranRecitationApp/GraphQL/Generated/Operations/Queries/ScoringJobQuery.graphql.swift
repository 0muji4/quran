// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI
@_spi(Execution) @_spi(Unsafe) import ApolloAPI

public extension QuranSchema {
  nonisolated struct ScoringJobQuery: GraphQLQuery {
    public static let operationName: String = "ScoringJob"
    public static let operationDocument: ApolloAPI.OperationDocument = .init(
      definition: .init(
        #"query ScoringJob($jobId: ID!) { scoringJob(jobId: $jobId) { __typename jobId status score verdict segments { __typename label score } feedback { __typename accuracy completeness overall referenceAudioUrl transcript wer cer wordAlignments { __typename refWord hypWord op } } } }"#
      ))

    public var jobId: ID

    public init(jobId: ID) {
      self.jobId = jobId
    }

    @_spi(Unsafe) public var __variables: Variables? { ["jobId": jobId] }

    nonisolated public struct Data: QuranSchema.SelectionSet {
      @_spi(Unsafe) public let __data: DataDict
      @_spi(Unsafe) public init(_dataDict: DataDict) { __data = _dataDict }

      @_spi(Execution) public static var __parentType: any ApolloAPI.ParentType { QuranSchema.Objects.Query }
      @_spi(Execution) public static var __selections: [ApolloAPI.Selection] { [
        .field("scoringJob", ScoringJob?.self, arguments: ["jobId": .variable("jobId")]),
      ] }
      @_spi(Execution) public static var __fulfilledFragments: [any ApolloAPI.SelectionSet.Type] { [
        ScoringJobQuery.Data.self
      ] }

      public var scoringJob: ScoringJob? { __data["scoringJob"] }

      /// ScoringJob
      ///
      /// Parent Type: `ScoringResult`
      nonisolated public struct ScoringJob: QuranSchema.SelectionSet {
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
          ScoringJobQuery.Data.ScoringJob.self
        ] }

        public var jobId: QuranSchema.ID { __data["jobId"] }
        public var status: GraphQLEnum<QuranSchema.ScoringStatus> { __data["status"] }
        public var score: Double? { __data["score"] }
        public var verdict: String? { __data["verdict"] }
        public var segments: [Segment] { __data["segments"] }
        public var feedback: Feedback? { __data["feedback"] }

        /// ScoringJob.Segment
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
            ScoringJobQuery.Data.ScoringJob.Segment.self
          ] }

          public var label: String { __data["label"] }
          public var score: Double { __data["score"] }
        }

        /// ScoringJob.Feedback
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
            ScoringJobQuery.Data.ScoringJob.Feedback.self
          ] }

          public var accuracy: Double { __data["accuracy"] }
          public var completeness: Double { __data["completeness"] }
          public var overall: Double { __data["overall"] }
          public var referenceAudioUrl: String? { __data["referenceAudioUrl"] }
          public var transcript: String? { __data["transcript"] }
          public var wer: Double? { __data["wer"] }
          public var cer: Double? { __data["cer"] }
          public var wordAlignments: [WordAlignment] { __data["wordAlignments"] }

          /// ScoringJob.Feedback.WordAlignment
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
              ScoringJobQuery.Data.ScoringJob.Feedback.WordAlignment.self
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