package com.tilawah.android.app

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore

/**
 * Application-scoped DataStore backing
 * [com.tilawah.android.storage.DataStoreAuthSession]. Held separately
 * from [historyDataStore] so a corrupt session blob never takes
 * practice history with it.
 */
val Context.authDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "tilawah-auth",
)
