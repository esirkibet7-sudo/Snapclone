package com.example.snaptubeclone.media

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.NoOpCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.offline.DownloadManager
import androidx.media3.exoplayer.offline.DefaultDownloadIndex
import androidx.media3.exoplayer.offline.DefaultDownloaderFactory
import androidx.media3.exoplayer.offline.Download
import androidx.media3.exoplayer.offline.DownloadService
import java.io.File

@UnstableApi
class CloneDownloadService : DownloadService(
    1001,
    DEFAULT_FOREGROUND_NOTIFICATION_UPDATE_INTERVAL,
    CHANNEL_ID,
    0,
    0
) {
    override fun getDownloadManager(): DownloadManager = Companion.manager(this)
    override fun getScheduler(): androidx.media3.exoplayer.scheduler.Scheduler? = null
    override fun getForegroundNotification(downloads: MutableList<Download>, notMetRequirements: Int): Notification {
        val active = downloads.count { it.state == Download.STATE_DOWNLOADING }
        return Notification.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle(if(active>0) "Downloading media" else "Downloads")
            .setContentText(if(active>0) "$active active download(s)" else "Download manager ready")
            .setOngoing(active>0)
            .build()
    }
    override fun onCreate(){super.onCreate(); val nm=getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager; nm.createNotificationChannel(NotificationChannel(CHANNEL_ID,"Downloads",NotificationManager.IMPORTANCE_LOW))}
    companion object {
        private const val CHANNEL_ID="clone-downloads"
        @Volatile private var instance:DownloadManager?=null
        @Volatile private var downloadCache:SimpleCache?=null
        fun manager(context:Context):DownloadManager {
            return instance ?: synchronized(this){ instance ?: run {
                val appContext=context.applicationContext
                val db=StandaloneDatabaseProvider(appContext)
                val index=DefaultDownloadIndex(db)
                val cache=downloadCache ?: SimpleCache(
                    File(appContext.filesDir,"media-downloads"),
                    NoOpCacheEvictor(),
                    db
                ).also { downloadCache=it }
                val upstream=DefaultHttpDataSource.Factory()
                val cacheDataSource=CacheDataSource.Factory()
                    .setCache(cache)
                    .setUpstreamDataSourceFactory(upstream)
                val factory=DefaultDownloaderFactory(
                    cacheDataSource,
                    com.google.common.util.concurrent.MoreExecutors.directExecutor()
                )
                DownloadManager(appContext,index,factory).also{instance=it}
            }}
        }
    }
}
