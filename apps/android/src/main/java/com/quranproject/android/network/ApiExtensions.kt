package com.quranproject.android.network

import kotlinx.coroutines.suspendCancellableCoroutine
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

suspend fun <T> Call<T>.awaitBody(): T {
    return suspendCancellableCoroutine { continuation ->
        enqueue(object : Callback<T> {
            override fun onResponse(call: Call<T>, response: Response<T>) {
                val body = response.body()
                if (response.isSuccessful && body != null) {
                    continuation.resume(body)
                } else {
                    continuation.resumeWithException(
                        IllegalStateException("Request failed with status ${response.code()}.")
                    )
                }
            }

            override fun onFailure(call: Call<T>, t: Throwable) {
                if (continuation.isCancelled) return
                continuation.resumeWithException(t)
            }
        })

        continuation.invokeOnCancellation { cancel() }
    }
}
