package com.tilawah.android.backend

import com.apollographql.apollo.ApolloClient
import com.apollographql.apollo.api.http.HttpRequest
import com.apollographql.apollo.api.http.HttpResponse
import com.apollographql.apollo.network.http.HttpInterceptor
import com.apollographql.apollo.network.http.HttpInterceptorChain
import com.tilawah.android.app.AppError
import java.io.IOException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
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

    private class FailingInterceptor(private val failure: Throwable) : HttpInterceptor {
        override suspend fun intercept(
            request: HttpRequest,
            chain: HttpInterceptorChain,
        ): HttpResponse = throw failure
    }
}
