package com.quranproject.android

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.gson.JsonObject
import com.quranproject.android.network.ApiClient
import com.quranproject.android.network.awaitBody
import com.quranproject.android.network.model.AyahRecord
import com.quranproject.android.network.model.CreateScoringJobRequest
import com.quranproject.android.network.model.ScoringResult
import com.quranproject.android.network.model.ScoringStatus
import com.quranproject.android.network.model.SignedUploadRequest
import com.quranproject.android.network.model.SignedUploadResponse
import com.quranproject.android.network.model.SurahSummary
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File

class RecordingViewModel(application: Application) : AndroidViewModel(application) {
    private val api = ApiClient.service
    private val recorder = AudioRecorder(application.applicationContext)
    private val httpClient = OkHttpClient()

    var surahs by mutableStateOf<List<SurahSummary>>(emptyList())
        private set
    var ayahs by mutableStateOf<List<AyahRecord>>(emptyList())
        private set
    var selectedSurahId by mutableStateOf<String?>(null)
        private set
    var selectedAyahNumber by mutableStateOf<Int?>(null)
        private set
    var selectedAyah by mutableStateOf<AyahRecord?>(null)
        private set
    var isRecording by mutableStateOf(false)
        private set
    var isBusy by mutableStateOf(false)
        private set
    var statusText by mutableStateOf("Idle")
        private set
    var statusMessage by mutableStateOf<String?>(null)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set
    var uploadDestination by mutableStateOf<String?>(null)
        private set
    var scoringResult by mutableStateOf<ScoringResult?>(null)
        private set
    var polling by mutableStateOf(false)
        private set
    var recordingFile by mutableStateOf<File?>(null)
        private set

    val statusColor: Color
        get() = when {
            statusText.startsWith("Recording") -> Color(0xFFE53935)
            statusText.startsWith("Uploading") ||
                statusText.startsWith("Scoring") ||
                statusText.startsWith("Requesting") ->
                Color(0xFFFFB300)
            statusText.startsWith("Completed") -> Color(0xFF43A047)
            statusText.startsWith("Failed") -> Color(0xFFD81B60)
            else -> Color(0xFF6B7280)
        }

    init {
        loadSurahs()
    }

    fun selectSurah(surahId: String) {
        selectedSurahId = surahId
        loadAyahs(surahId)
    }

    fun selectAyah(ayahNumber: Int) {
        selectedAyahNumber = ayahNumber
        selectedAyah = ayahs.firstOrNull { it.ayahNumber == ayahNumber }
    }

    fun toggleRecording() {
        if (isRecording) {
            stopAndScore()
        } else {
            startRecording()
        }
    }

    fun reset() {
        recorder.cancel()
        isRecording = false
        isBusy = false
        statusText = "Idle"
        statusMessage = null
        errorMessage = null
        uploadDestination = null
        scoringResult = null
        polling = false
        recordingFile = null
    }

    fun onPermissionDenied() {
        errorMessage = "Microphone permission is required to record."
    }

    private fun loadSurahs() {
        viewModelScope.launch {
            try {
                val response = api.fetchSurahs().awaitBody()
                surahs = response.surahs
                if (surahs.isNotEmpty()) {
                    val current = selectedSurahId
                    if (current == null || surahs.none { it.id == current }) {
                        selectSurah(surahs.first().id)
                    }
                }
            } catch (error: Throwable) {
                errorMessage = error.message ?: "Failed to load surahs."
            }
        }
    }

    private fun loadAyahs(surahId: String) {
        viewModelScope.launch {
            try {
                val response = api.fetchSurahAyahs(surahId).awaitBody()
                ayahs = response.ayahs
                if (ayahs.isNotEmpty()) {
                    val current = selectedAyahNumber
                    val fallback = ayahs.first().ayahNumber
                    val updated = if (current != null && ayahs.any { it.ayahNumber == current }) {
                        current
                    } else {
                        fallback
                    }
                    selectAyah(updated)
                } else {
                    selectedAyahNumber = null
                    selectedAyah = null
                }
            } catch (error: Throwable) {
                errorMessage = error.message ?: "Failed to load ayahs."
            }
        }
    }

    private fun startRecording() {
        errorMessage = null
        if (selectedSurahId.isNullOrBlank() || selectedAyahNumber == null) {
            errorMessage = "Please select a surah and ayah before recording."
            return
        }

        try {
            recorder.startRecording()
            isRecording = true
            clearJobState()
            statusText = "Recording"
            statusMessage = "Recording..."
        } catch (error: Throwable) {
            statusText = "Failed"
            errorMessage = error.message ?: "Failed to start recording."
        }
    }

    private fun stopAndScore() {
        viewModelScope.launch {
            isRecording = false
            isBusy = true
            clearJobState()
            statusText = "Uploading"
            statusMessage = "Requesting signed upload URL..."
            errorMessage = null

            try {
                val recording = recorder.stopRecording()
                recordingFile = recording
                val signedUpload = api.requestSignedUploadUrl(
                    SignedUploadRequest(
                        filename = recording.name,
                        contentType = "audio/m4a"
                    )
                ).awaitBody()

                val uploadKey = signedUpload.uploadKey
                    ?: extractUploadKey(signedUpload.fields)
                    ?: throw IllegalStateException("Upload key missing from signed URL response.")
                val sessionId = signedUpload.sessionId

                uploadDestination = describeUploadTarget(signedUpload)
                statusMessage = "Uploading audio..."
                uploadFile(signedUpload.url, recording)

                statusText = "Scoring"
                statusMessage = "Creating scoring job..."
                val job = api.createScoringJob(
                    CreateScoringJobRequest(
                        sessionId = sessionId,
                        uploadKey = uploadKey,
                        surahId = selectedSurahId ?: "",
                        ayahNumber = selectedAyahNumber ?: 1
                    )
                ).awaitBody()
                scoringResult = job
                statusMessage = statusLabel(job)
                pollScoringJob(job.jobId)
            } catch (error: Throwable) {
                statusText = "Failed"
                errorMessage = error.message ?: "Failed to upload and score recording."
            } finally {
                isBusy = false
            }
        }
    }

    private suspend fun pollScoringJob(jobId: String) {
        polling = true
        repeat(20) {
            val job = try {
                api.fetchScoringJob(jobId).awaitBody()
            } catch (error: Throwable) {
                errorMessage = error.message ?: "Failed to fetch scoring job."
                polling = false
                return
            }
            scoringResult = job
            statusMessage = statusLabel(job)
            if (job.status == ScoringStatus.COMPLETED || job.status == ScoringStatus.FAILED) {
                statusText = if (job.status == ScoringStatus.COMPLETED) "Completed" else "Failed"
                polling = false
                return
            }
            statusText = "Scoring"
            delay(2_000)
        }
        polling = false
    }

    private suspend fun uploadFile(url: String, recording: File) {
        val request = Request.Builder()
            .url(url)
            .put(recording.asRequestBody("audio/m4a".toMediaType()))
            .build()

        httpClient.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw IllegalStateException("Upload failed with status ${response.code}.")
            }
        }
    }

    private fun extractUploadKey(fields: JsonObject?): String? {
        return fields?.get("key")?.asString
    }

    private fun describeUploadTarget(upload: SignedUploadResponse): String {
        return "PUT ${upload.url} (expires ${upload.expiresAt})"
    }

    private fun statusLabel(job: ScoringResult): String {
        return when (job.status) {
            ScoringStatus.COMPLETED -> job.verdict ?: "Scoring complete"
            ScoringStatus.FAILED -> job.verdict ?: "Scoring failed"
            ScoringStatus.RUNNING -> "Scoring in progress..."
            ScoringStatus.QUEUED -> "Job queued for scoring..."
        }
    }

    private fun clearJobState() {
        scoringResult = null
        uploadDestination = null
        statusMessage = null
        errorMessage = null
        polling = false
    }
}
