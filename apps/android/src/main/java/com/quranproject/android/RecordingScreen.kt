package com.quranproject.android

import android.Manifest
import android.content.pm.PackageManager
import android.media.MediaPlayer
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Divider
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.quranproject.android.network.model.AyahRecord
import com.quranproject.android.network.model.ScoringResult
import com.quranproject.android.network.model.ScoringStatus
import com.quranproject.android.network.model.SurahSummary
import com.quranproject.android.util.summarizeSurah
import java.io.File

@Composable
fun RecordingScreen(viewModel: RecordingViewModel = viewModel()) {
    val context = LocalContext.current
    var hasPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasPermission = granted
        if (!granted) {
            viewModel.onPermissionDenied()
        }
    }

    val canRecord = hasPermission && !viewModel.isBusy
    val hasSelection = viewModel.selectedSurahId != null && viewModel.selectedAyahNumber != null

    Surface(
        modifier = Modifier.fillMaxSize()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "Recitation Recorder",
                style = MaterialTheme.typography.headlineSmall
            )

            SurahSelector(
                surahs = viewModel.surahs,
                selectedSurahId = viewModel.selectedSurahId,
                onSurahSelected = viewModel::selectSurah
            )

            AyahSelector(
                ayahs = viewModel.ayahs,
                selectedAyahNumber = viewModel.selectedAyahNumber,
                onAyahSelected = viewModel::selectAyah
            )

            viewModel.selectedAyah?.let { ayah ->
                SelectedAyahCard(ayah)
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Button(
                    onClick = {
                        if (hasPermission) {
                            viewModel.toggleRecording()
                        } else {
                            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                        }
                    },
                    enabled = canRecord && hasSelection
                ) {
                    Text(if (viewModel.isRecording) "Stop recording" else "Start recording")
                }
                TextButton(
                    onClick = viewModel::reset,
                    enabled = !viewModel.isRecording && !viewModel.isBusy
                ) {
                    Text("Reset")
                }
            }

            StatusSection(viewModel)

            viewModel.recordingFile?.let { file ->
                RecordingPreview(file = file)
            }

            viewModel.scoringResult?.let { job ->
                JobStatusSection(job = job, polling = viewModel.polling)
                if (job.segments.isNotEmpty()) {
                    SegmentHighlights(job = job)
                }
            }
        }
    }
}

@Composable
private fun StatusSection(viewModel: RecordingViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = "Status: ${viewModel.statusText}",
            color = viewModel.statusColor,
            style = MaterialTheme.typography.bodyLarge
        )
        viewModel.statusMessage?.let {
            Text(text = it, style = MaterialTheme.typography.bodyMedium)
        }
        viewModel.uploadDestination?.let {
            Text(text = "Signed URL: $it", style = MaterialTheme.typography.bodySmall)
        }
        viewModel.errorMessage?.let {
            Text(
                text = "Error: $it",
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

@Composable
private fun SelectedAyahCard(ayah: AyahRecord) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp)
    ) {
        Text(
            text = "Selected ayah",
            style = MaterialTheme.typography.labelMedium
        )
        Text(
            text = ayah.textAr,
            style = MaterialTheme.typography.titleLarge,
            textAlign = TextAlign.End,
            modifier = Modifier.fillMaxWidth(),
            textDirection = TextDirection.Rtl
        )
        ayah.textEn?.let {
            Text(text = it, style = MaterialTheme.typography.bodyMedium)
        }
        ayah.transliteration?.let {
            Text(text = it, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun RecordingPreview(file: File) {
    var isPlaying by remember { mutableStateOf(false) }
    val mediaPlayer = remember { MediaPlayer() }

    DisposableEffect(file) {
        runCatching {
            mediaPlayer.reset()
            mediaPlayer.setDataSource(file.absolutePath)
            mediaPlayer.prepare()
            mediaPlayer.setOnCompletionListener {
                isPlaying = false
            }
        }
        onDispose {
            mediaPlayer.reset()
            isPlaying = false
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            mediaPlayer.release()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = "Preview of your last recording",
            style = MaterialTheme.typography.labelMedium
        )
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(onClick = {
                if (isPlaying) {
                    mediaPlayer.pause()
                    isPlaying = false
                } else {
                    mediaPlayer.start()
                    isPlaying = true
                }
            }) {
                Text(if (isPlaying) "Pause" else "Play")
            }
            Text(text = file.name, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun JobStatusSection(job: ScoringResult, polling: Boolean) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = "Job ${job.jobId}",
            style = MaterialTheme.typography.titleMedium
        )
        Text(
            text = "Status: ${job.status}${job.verdict?.let { " — $it" } ?: ""}",
            style = MaterialTheme.typography.bodyMedium
        )
        job.score?.let { score ->
            Text(text = "Overall score: ${(score * 100).formatPercent()}")
        }
        job.feedback?.let { feedback ->
            if (job.status == ScoringStatus.COMPLETED) {
                Text(
                    text = "Pronunciation Assessment Results",
                    style = MaterialTheme.typography.titleSmall
                )
                feedback.transcript?.let { transcript ->
                    Text(text = "Transcript", style = MaterialTheme.typography.labelMedium)
                    Text(
                        text = transcript,
                        textAlign = TextAlign.End,
                        modifier = Modifier.fillMaxWidth(),
                        textDirection = TextDirection.Rtl
                    )
                }
                feedback.wer?.let { wer ->
                    Text(text = "Word Error Rate (WER): ${(wer * 100).formatPercent()}")
                }
                Text(text = "Accuracy: ${(feedback.accuracy * 100).formatPercent()}")
                Text(text = "Fluency: ${(feedback.fluency * 100).formatPercent()}")
                Text(text = "Completeness: ${(feedback.completeness * 100).formatPercent()}")
                Text(text = "Overall: ${(feedback.overall * 100).formatPercent()}")
            }
        }
        if (polling) {
            Text(text = "Polling for updates…", style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun SegmentHighlights(job: ScoringResult) {
    Divider()
    Column(
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(text = "Segment highlights", style = MaterialTheme.typography.titleSmall)
        job.segments.forEach { segment ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = segment.label)
                Text(text = (segment.score * 100).formatPercent())
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SurahSelector(
    surahs: List<SurahSummary>,
    selectedSurahId: String?,
    onSurahSelected: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedSurah = surahs.firstOrNull { it.id == selectedSurahId }
    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = !expanded }
    ) {
        OutlinedTextField(
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor(),
            value = selectedSurah?.let { "${it.nameAr} — ${summarizeSurah(it)}" }
                ?: if (surahs.isEmpty()) "No surahs available" else "Select surah",
            onValueChange = {},
            readOnly = true,
            label = { Text("Surah") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) }
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            surahs.forEach { surah ->
                DropdownMenuItem(
                    text = { Text("${surah.nameAr} — ${summarizeSurah(surah)}") },
                    onClick = {
                        onSurahSelected(surah.id)
                        expanded = false
                    }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AyahSelector(
    ayahs: List<AyahRecord>,
    selectedAyahNumber: Int?,
    onAyahSelected: (Int) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = selectedAyahNumber?.let { "Ayah $it" }
        ?: if (ayahs.isEmpty()) "No ayahs available" else "Select ayah"

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = !expanded }
    ) {
        OutlinedTextField(
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor(),
            value = selectedLabel,
            onValueChange = {},
            readOnly = true,
            label = { Text("Ayah") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) }
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            ayahs.forEach { ayah ->
                DropdownMenuItem(
                    text = { Text("Ayah ${ayah.ayahNumber}") },
                    onClick = {
                        onAyahSelected(ayah.ayahNumber)
                        expanded = false
                    }
                )
            }
        }
    }
}

private fun Double.formatPercent(): String {
    return String.format("%.1f%%", this)
}
