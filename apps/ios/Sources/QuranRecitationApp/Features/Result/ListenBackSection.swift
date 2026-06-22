import SwiftUI

/// "Listen back" card with two PlaybackRows — the teacher reference
/// (loaded via `referenceAudioUrl` from the scoring feedback) and the
/// user's own recording. AudioPlayer instances are owned by the parent
/// View; this struct is purely presentational.
struct ListenBackSection: View {
  let teacherDuration: TimeInterval?
  let youDuration: TimeInterval?
  let teacherIsPlaying: Bool
  let youIsPlaying: Bool
  let onToggleTeacher: () -> Void
  let onToggleYou: () -> Void

  var body: some View {
    BrandCard {
      VStack(alignment: .leading, spacing: Spacing.md) {
        Text("result.listenBack.title", bundle: .module)
          .font(Font.brand.body.weight(.semibold))
          .foregroundColor(Color.brand.textPrimary)
        PlaybackRow(
          title: "result.listenBack.teacher",
          duration: teacherDuration,
          isPlaying: teacherIsPlaying,
          tint: Color.brand.primary,
          onToggle: onToggleTeacher
        )
        Divider().background(Color.brand.tile)
        PlaybackRow(
          title: "result.listenBack.you",
          duration: youDuration,
          isPlaying: youIsPlaying,
          tint: Color.brand.accent,
          onToggle: onToggleYou
        )
      }
    }
  }
}
