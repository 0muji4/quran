package tv.every.tilawah.android.storage

import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import java.time.Instant

/**
 * History persistence DTOs. Field names and JSON encoding match
 * `apps/web/app/lib/storage.ts` and the iOS `HistoryStore.swift`
 * shape so a future server-side history store can serve all three
 * clients without per-platform mapping. See ADR 0007.
 *
 * Dates serialise as ISO 8601 strings to match the web `JSON.stringify(new Date())`
 * convention and Swift's `JSONEncoder.dateEncodingStrategy = .iso8601`.
 */
@Serializable
data class LastPracticed(
    val surahId: String,
    val ayahNumber: Int,
    val surahNameEn: String,
    val surahNameAr: String,
    val ayahCount: Int,
    @Serializable(with = InstantIsoSerializer::class)
    val practicedAt: Instant,
)

@Serializable
data class BestScoreEntry(
    val score: Double,
    @Serializable(with = InstantIsoSerializer::class)
    val achievedAt: Instant,
)

@Serializable
enum class AttemptStatus {
    COMPLETED,
    FAILED,
}

@Serializable
data class Attempt(
    val id: String,
    val surahId: String,
    val surahNameEn: String,
    val ayahNumber: Int,
    val score: Double?,
    val jobId: String,
    @Serializable(with = InstantIsoSerializer::class)
    val createdAt: Instant,
    val status: AttemptStatus,
    val durationMs: Long? = null,
)

/** JSON envelope for the recent-attempts log. Matches `{ attempts: [] }` on web. */
@Serializable
internal data class AttemptLog(val attempts: List<Attempt>)

object HistoryStoreConstants {
    const val HISTORY_LIMIT = 50

    object Key {
        const val LAST_PRACTICED = "tilawah:last-practiced"
        const val BEST_SCORES = "tilawah:best-scores"
        const val RECENT_ATTEMPTS = "tilawah:recent-attempts"
    }
}

/** ISO 8601 (no fractional override) round-trip via java.time.Instant. */
object InstantIsoSerializer : KSerializer<Instant> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("Instant", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: Instant) {
        encoder.encodeString(value.toString())
    }

    override fun deserialize(decoder: Decoder): Instant = Instant.parse(decoder.decodeString())
}
