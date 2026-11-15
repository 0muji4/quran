import SwiftUI

/// Practice screen: feeds `PracticeViewModel` into `PracticeContent` and
/// loads the ayah on first appearance.
struct PracticeView: View {
  @State private var viewModel: PracticeViewModel
  let onClose: () -> Void

  init(viewModel: @autoclosure @escaping () -> PracticeViewModel, onClose: @escaping () -> Void) {
    self._viewModel = State(initialValue: viewModel())
    self.onClose = onClose
  }

  var body: some View {
    PracticeContent(
      state: viewModel.state,
      ayah: viewModel.ayah,
      surah: viewModel.surah,
      currentAyahNumber: viewModel.currentAyahNumber,
      reciterName: viewModel.reciterName,
      teacherState: viewModel.teacherState,
      isLoopEnabled: viewModel.isLoopEnabled,
      canGoToPreviousAyah: viewModel.canGoToPreviousAyah,
      canGoToNextAyah: viewModel.canGoToNextAyah,
      onClose: onClose,
      onTogglePlayback: { viewModel.toggleReferencePlayback() },
      onSelectRate: { viewModel.setReferenceRate($0) },
      onToggleLoop: { viewModel.toggleLoop() },
      onTapRecord: { viewModel.toggleRecording() },
      onReplay: { viewModel.replayLastRecording() },
      onRecordAgain: { viewModel.resetForRetry() },
      onPreviousAyah: { Task { await viewModel.goToPreviousAyah() } },
      onNextAyah: { Task { await viewModel.goToNextAyah() } }
    )
    .task {
      if viewModel.ayah == nil {
        await viewModel.load()
        await viewModel.loadReference()
      }
    }
  }
}

/// The Practice screen on `AppTheme` and system controls (ADR 0030). The
/// navigation bar holds the back button and the surah with the ayah position;
/// the state panel stays at the bottom while the ayah, the teacher recitation
/// and the ayah navigation scroll above it, so the record button stays on
/// screen for a long ayah. Takes state rather than the ViewModel, so any state
/// renders without one.
///
/// The screen sits at the root of the Practice tab, so "back" switches to the
/// Library tab (`onClose`) rather than popping a navigation stack.
struct PracticeContent: View {
  let state: PracticeRecordingState
  let ayah: AyahDetail?
  let surah: SurahSummary?
  let currentAyahNumber: Int
  let reciterName: String
  let teacherState: TeacherReferencePanel.State
  let isLoopEnabled: Bool
  let canGoToPreviousAyah: Bool
  let canGoToNextAyah: Bool
  let onClose: () -> Void
  let onTogglePlayback: () -> Void
  let onSelectRate: (Float) -> Void
  let onToggleLoop: () -> Void
  let onTapRecord: () -> Void
  let onReplay: () -> Void
  let onRecordAgain: () -> Void
  let onPreviousAyah: () -> Void
  let onNextAyah: () -> Void

  var body: some View {
    VStack(spacing: 0) {
      ScrollView {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.space3) {
          content
        }
        .padding(.horizontal, AppTheme.Spacing.space4)
        .padding(.top, AppTheme.Spacing.space1)
        .padding(.bottom, AppTheme.Spacing.space3)
      }
      if ayah != nil, surah != nil {
        statePanel
          .padding(.horizontal, AppTheme.Spacing.space4)
          .padding(.bottom, AppTheme.Spacing.space4)
      }
    }
    .background(AppTheme.Colors.surface.ignoresSafeArea())
    .controlSize(.large)
    .buttonBorderShape(.capsule)
    .tint(AppTheme.Colors.primary)
    .navigationBarTitleDisplayMode(.inline)
    .navigationBarBackButtonHidden(true)
    .toolbar {
      ToolbarItem(placement: .topBarLeading) {
        Button(action: onClose) {
          Image(systemName: "chevron.backward")
        }
        .accessibilityLabel(Text("practice.backToLibrary", bundle: .module))
      }
      ToolbarItem(placement: .principal) {
        titleView
      }
    }
  }

  @ViewBuilder
  private var content: some View {
    if let ayah, let surah {
      if surah.ayahCount > 1 {
        ProgressView(value: Double(currentAyahNumber), total: Double(surah.ayahCount))
          .accessibilityLabel(
            Text("practice.ayahPosition \(currentAyahNumber) \(surah.ayahCount)", bundle: .module))
      }
      AyahCard(ayah: ayah)
      TeacherReferencePanel(
        reciterName: reciterName,
        state: teacherState,
        availableRates: PracticeViewModel.supportedReferenceRates,
        isLoopEnabled: isLoopEnabled,
        onTogglePlayback: onTogglePlayback,
        onSelectRate: onSelectRate,
        onToggleLoop: onToggleLoop
      )
      ayahNavRow
    } else if case .error(let error) = state {
      Text(error.errorDescription ?? "")
        .font(AppTheme.Typography.body)
        .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
    } else {
      ProgressView()
        .frame(maxWidth: .infinity)
        .padding(.top, AppTheme.Spacing.space12)
    }
  }

  /// The surah name with the ayah position under it, in the navigation bar.
  private var titleView: some View {
    VStack(spacing: 0) {
      Text(verbatim: surah?.nameEn ?? "")
        .font(AppTheme.Typography.headline)
        .foregroundStyle(AppTheme.Colors.onSurface)
      if let surah {
        Text("practice.ayahPosition \(currentAyahNumber) \(surah.ayahCount)", bundle: .module)
          .font(AppTheme.Typography.footnote)
          .foregroundStyle(AppTheme.Colors.onSurfaceVariant)
      }
    }
    .accessibilityElement(children: .combine)
  }

  /// The panel for the current state. Scoring finishes by moving on to the
  /// Result screen, so `.done` shows the record button for the next attempt.
  @ViewBuilder
  private var statePanel: some View {
    switch state {
    case .idle, .recording, .done:
      RecordingPanel(state: state, onTapRecord: onTapRecord)
    case .uploading:
      AnalysingPanel(step: .transcribing)
    case .analysing(let step):
      AnalysingPanel(step: step)
    case .error(let error):
      PracticeErrorPanel(error: error, onReplay: onReplay, onRecordAgain: onRecordAgain)
    }
  }

  /// Previous and next ayah, each disabled at the surah's ends.
  private var ayahNavRow: some View {
    HStack(spacing: AppTheme.Spacing.space2) {
      Button(action: onPreviousAyah) {
        Label {
          Text("practice.nav.prev", bundle: .module)
        } icon: {
          Image(systemName: "chevron.backward")
        }
        .frame(maxWidth: .infinity)
      }
      .disabled(!canGoToPreviousAyah)

      Button(action: onNextAyah) {
        HStack(spacing: AppTheme.Spacing.space1) {
          Text("practice.nav.next", bundle: .module)
          Image(systemName: "chevron.forward")
        }
        .frame(maxWidth: .infinity)
      }
      .disabled(!canGoToNextAyah)
    }
    .buttonStyle(.borderless)
  }
}
