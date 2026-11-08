package com.tilawah.android.backend

import com.apollographql.apollo.ApolloClient
import com.apollographql.apollo.api.http.HttpRequest
import com.apollographql.apollo.api.http.HttpResponse
import com.apollographql.apollo.network.http.HttpInterceptor
import com.apollographql.apollo.network.http.HttpInterceptorChain
import com.tilawah.android.app.AppError
import java.io.IOException
import okio.Buffer
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ApolloQuranBackendTest {

    @Test
    fun `AppError thrown by an interceptor reaches the caller`() = runTest {
        val backend = backendFailingWith(AppError.InvalidCredentials)

        assertEquals(AppError.InvalidCredentials, failureOf { backend.surahs(null, null) })
    }

    @Test
    fun `other transport failures surface as BackendUnavailable`() = runTest {
        val backend = backendFailingWith(IOException("connection reset"))

        val failure = failureOf { backend.surahs(null, null) }

        assertTrue(failure is AppError.BackendUnavailable)
        assertEquals("surahs", (failure as AppError.BackendUnavailable).operation)
    }

    @Test
    fun `scoring job score converts from a 0 to 1 fraction to whole points`() = runTest {
        val backend = backendRespondingWith(scoringJobJson(score = "0.825"))

        assertEquals(83, backend.fetchScoringJob("job-1").score)
    }

    @Test
    fun `scoring job without a score stays null`() = runTest {
        val backend = backendRespondingWith(scoringJobJson(score = "null"))

        assertNull(backend.fetchScoringJob("job-1").score)
    }

    private fun scoringJobJson(score: String): String =
        """{"data":{"scoringJob":{"jobId":"job-1","status":"COMPLETED","score":$score,
           "verdict":null,"segments":[],"feedback":null}}}"""

    private fun backendRespondingWith(body: String): ApolloQuranBackend =
        ApolloQuranBackend(
            apollo = ApolloClient.Builder()
                .serverUrl("http://localhost/graphql")
                .addHttpInterceptor(RespondingInterceptor(body))
                .build(),
        )

    private fun backendFailingWith(failure: Throwable): ApolloQuranBackend =
        ApolloQuranBackend(
            apollo = ApolloClient.Builder()
                .serverUrl("http://localhost/graphql")
                .addHttpInterceptor(FailingInterceptor(failure))
                .build(),
        )

    private suspend fun failureOf(block: suspend () -> Unit): Throwable {
        try {
            block()
        } catch (cause: Throwable) {
            return cause
        }
        throw AssertionError("expected the call to throw")
    }

    private class RespondingInterceptor(private val body: String) : HttpInterceptor {
        override suspend fun intercept(
            request: HttpRequest,
            chain: HttpInterceptorChain,
        ): HttpResponse = HttpResponse.Builder(statusCode = 200)
            .body(Buffer().writeUtf8(body))
            .build()
    }

    private class FailingInterceptor(private val failure: Throwable) : HttpInterceptor {
        override suspend fun intercept(
            request: HttpRequest,
            chain: HttpInterceptorChain,
        ): HttpResponse = throw failure
    }
}
