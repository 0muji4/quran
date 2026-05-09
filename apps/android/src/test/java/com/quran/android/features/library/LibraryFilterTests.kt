package com.quran.android.features.library

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import com.quran.android.backend.MockBackend
import com.quran.android.backend.SurahSummary
import com.quran.android.telemetry.NoOpTelemetry

class LibraryFilterTests {

    @Test
    fun `chip filter narrows by revelationPlace and ayahCount`() = runTest {
        val viewModel = loadedViewModel()

        viewModel.setFilter(LibraryFilter.All)
        assertEquals(listOf("1", "2", "112", "3"), viewModel.filteredSurahs().map { it.id })

        viewModel.setFilter(LibraryFilter.Mecca)
        assertEquals(listOf("1", "112"), viewModel.filteredSurahs().map { it.id })

        viewModel.setFilter(LibraryFilter.Medina)
        assertEquals(listOf("2", "3"), viewModel.filteredSurahs().map { it.id })

        viewModel.setFilter(LibraryFilter.Short)
        assertEquals(listOf("1", "112"), viewModel.filteredSurahs().map { it.id })
    }

    @Test
    fun `query matches English and Arabic substrings case insensitively`() = runTest {
        val viewModel = loadedViewModel()

        viewModel.setQuery("FATI")
        assertEquals(listOf("1"), viewModel.filteredSurahs().map { it.id })

        viewModel.setQuery("ال")
        assertTrue(viewModel.filteredSurahs().isNotEmpty())

        viewModel.setQuery("no-such-surah")
        assertTrue(viewModel.filteredSurahs().isEmpty())

        viewModel.setQuery("")
        assertEquals(4, viewModel.filteredSurahs().size)
    }

    @Test
    fun `query and filter compose`() = runTest {
        val viewModel = loadedViewModel()
        viewModel.setFilter(LibraryFilter.Medina)
        viewModel.setQuery("Imran")
        assertEquals(listOf("3"), viewModel.filteredSurahs().map { it.id })
    }

    private suspend fun loadedViewModel(): LibraryViewModel {
        val backend = MockBackend(surahsResult = Result.success(fixtures))
        val viewModel = LibraryViewModel(backend, NoOpTelemetry)
        viewModel.loadInternal()
        return viewModel
    }

    private val fixtures = listOf(
        SurahSummary("1", "الفاتحة", "Al-Fatihah", "Mecca", 7),
        SurahSummary("2", "البقرة", "Al-Baqarah", "Medina", 286),
        SurahSummary("112", "الإخلاص", "Al-Ikhlas", "Mecca", 4),
        SurahSummary("3", "آل عمران", "Aal-Imran", "Medina", 200),
    )
}
