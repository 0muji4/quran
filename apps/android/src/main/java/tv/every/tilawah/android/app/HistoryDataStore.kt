package tv.every.tilawah.android.app

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore

/**
 * Application-scoped DataStore that backs [tv.every.tilawah.android.storage.DataStoreHistoryStore].
 * Single instance per process per the Jetpack DataStore contract.
 */
val Context.historyDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "tilawah-history",
)
