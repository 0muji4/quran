package com.quranproject.android

import android.content.Context
import android.media.MediaRecorder
import java.io.File

class AudioRecorder(private val context: Context) {
    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null

    fun startRecording(): File {
        if (recorder != null) {
            throw IllegalStateException("Recording already in progress.")
        }

        val file = File(context.cacheDir, "recording-${System.currentTimeMillis()}.m4a")
        val mediaRecorder = MediaRecorder().apply {
            setAudioSource(MediaRecorder.AudioSource.MIC)
            setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            setAudioEncodingBitRate(128_000)
            setAudioSamplingRate(44_100)
            setOutputFile(file.absolutePath)
            prepare()
            start()
        }

        recorder = mediaRecorder
        outputFile = file
        return file
    }

    fun stopRecording(): File {
        val activeRecorder = recorder ?: throw IllegalStateException("No active recording found.")
        return try {
            activeRecorder.stop()
            outputFile ?: throw IllegalStateException("Missing recording output file.")
        } catch (error: RuntimeException) {
            outputFile?.delete()
            throw error
        } finally {
            activeRecorder.release()
            recorder = null
        }
    }

    fun cancel() {
        recorder?.let { activeRecorder ->
            try {
                activeRecorder.stop()
            } catch (_: RuntimeException) {
                outputFile?.delete()
            } finally {
                activeRecorder.release()
                recorder = null
            }
        }
    }
}
