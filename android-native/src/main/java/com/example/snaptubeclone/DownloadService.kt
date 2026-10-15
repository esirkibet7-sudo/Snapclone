package com.example.snaptubeclone

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder

/**
 * Native boundary for long-running downloads.
 * The permitted provider URL is supplied by the JS layer; actual HTTP/download
 * implementation should be wired to the chosen permitted API/source.
 */
class DownloadService : Service() {
    companion object { private const val CHANNEL_ID = "downloads"; private const val NOTIFICATION_ID = 1001 }

    override fun onCreate() {
        super.onCreate()
        createChannel()
        startForeground(NOTIFICATION_ID, notification("Preparing download…"))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // TODO: accept a signed/validated provider URL and persist work with WorkManager/Media3.
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getSystemService(NotificationManager::class.java).createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Downloads", NotificationManager.IMPORTANCE_LOW)
            )
        }
    }

    private fun notification(text: String): Notification =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID).setContentTitle("SnapClone").setContentText(text).setSmallIcon(android.R.drawable.stat_sys_download).setOngoing(true).build()
        } else {
            Notification.Builder(this).setContentTitle("SnapClone").setContentText(text).setSmallIcon(android.R.drawable.stat_sys_download).setOngoing(true).build()
        }
}
