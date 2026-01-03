package com.quranproject.android.network

import com.quranproject.android.network.model.AyahsResponse
import com.quranproject.android.network.model.CreateScoringJobRequest
import com.quranproject.android.network.model.ScoringResult
import com.quranproject.android.network.model.SignedUploadRequest
import com.quranproject.android.network.model.SignedUploadResponse
import com.quranproject.android.network.model.SurahsResponse
import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface ApiService {
    @POST("signed-upload-url")
    fun requestSignedUploadUrl(
        @Body input: SignedUploadRequest
    ): Call<SignedUploadResponse>

    @POST("scoring-jobs")
    fun createScoringJob(
        @Body input: CreateScoringJobRequest
    ): Call<ScoringResult>

    @GET("scoring-jobs/{jobId}")
    fun fetchScoringJob(
        @Path("jobId") jobId: String
    ): Call<ScoringResult>

    @GET("rsc/surahs")
    fun fetchSurahs(): Call<SurahsResponse>

    @GET("rsc/surah/{surahId}/ayahs")
    fun fetchSurahAyahs(
        @Path("surahId") surahId: String
    ): Call<AyahsResponse>
}
