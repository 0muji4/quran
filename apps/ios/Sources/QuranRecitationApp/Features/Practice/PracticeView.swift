import SwiftUI

/// Practice screen layout: back button, "Surah · ayah N" title with a
/// menu, progress dots, AyahCard, and teacher reference panel.
/// Recording panel and analysing/error states land in PR 14–16.
struct PracticeView: View {
  @StateObject var viewModel: PracticeViewModel
  let onClose: () -> Void

  init(viewModel: @autoclosure @escaping () -> PracticeViewModel, onClose: @escaping () -> Void) {
    self._viewModel = StateObject(wrappedValue: viewModel())
    self.onClose = onClose
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: Spacing.lg) {
        topBar
        progressDots
        if let ayah = viewModel.ayah, let surah = viewModel.surah {
          AyahCard(
            surahNameEn: surah.nameEn,
            ayahNumber: ayah.ayahNumber,
            textAr: ayah.textAr
          )
          .padding(.horizontal, Spacing.screenHorizontal)
          TeacherReferencePanel(
            reciterName: viewModel.reciterName,
            state: viewModel.teacherState,
            onTogglePlayback: { viewModel.toggleReferencePlayback() },
            onChangeRate: { viewModel.cycleReferenceRate() }
          )
          .padding(.horizontal, Spacing.screenHorizontal)
          RecordingPanel(
            state: viewModel.state,
            onTapRecord: { viewModel.toggleRecording() }
          )
          .padding(.horizontal, Spacing.screenHorizontal)
        } else if case .error(let error) = viewModel.state {
          Text(error.errorDescription ?? "")
            .font(Font.brand.body)
            .foregroundColor(Color.brand.textSecondary)
            .padding(.horizontal, Spacing.screenHorizontal)
        } else {
          ProgressView()
            .frame(maxWidth: .infinity)
            .padding(.top, Spacing.xxl)
        }
      }
      .padding(.vertical, Spacing.lg)
    }
    .background(Color.brand.surface.ignoresSafeArea())
    .navigationBarBackButtonHidden(true)
    .task {
      if viewModel.ayah == nil {
        await viewModel.load()
        await viewModel.loadReference()
      }
    }
  }

  private var topBar: some View {
    HStack {
      Button(action: onClose) {
        Image(systemName: "chevron.right")
          .rotationEffect(.degrees(180))
          .foregroundColor(Color.brand.textPrimary)
          .padding(Spacing.sm)
          .background(Color.brand.card)
          .clipShape(Circle())
      }
      Spacer()
      VStack {
        Text(title)
          .font(Font.brand.body.weight(.semibold))
          .foregroundColor(Color.brand.textPrimary)
      }
      Spacer()
      Image(systemName: "ellipsis")
        .foregroundColor(Color.brand.textPrimary)
        .padding(Spacing.sm)
        .background(Color.brand.card)
        .clipShape(Circle())
    }
    .padding(.horizontal, Spacing.screenHorizontal)
  }

  private var progressDots: some View {
    HStack(spacing: Spacing.xs) {
      ForEach(0..<dotCount, id: \.self) { index in
        Capsule()
          .fill(index + 1 == viewModel.currentAyahNumber ? Color.brand.primary : Color.brand.tile)
          .frame(width: index + 1 == viewModel.currentAyahNumber ? 24 : 16, height: 4)
      }
    }
    .padding(.horizontal, Spacing.screenHorizontal)
  }

  private var dotCount: Int {
    min(viewModel.surah?.ayahCount ?? 0, 10)
  }

  private var title: String {
    if let surah = viewModel.surah {
      return "\(surah.nameEn) · ayah \(viewModel.currentAyahNumber)"
    }
    return "Ayah \(viewModel.currentAyahNumber)"
  }
}
