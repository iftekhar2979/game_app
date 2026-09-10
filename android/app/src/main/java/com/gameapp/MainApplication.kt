package com.gameapp

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    createDefaultNotificationChannel()
  }

  /**
   * The channel every push arrives on.
   *
   * From Android 8 a notification whose channel does not exist is dropped
   * silently - no error, no entry in the shade, nothing in logcat that names
   * the cause. It has to exist before the first push arrives, which means at
   * launch rather than when the JS bundle happens to get around to it, because
   * a push can wake a killed app straight into the messaging service.
   *
   * The id matches `default_notification_channel_id` in the manifest and the
   * `channelId` the server sets on every message.
   */
  private fun createDefaultNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val channel =
      NotificationChannel(
        CHANNEL_ID,
        // Shown to the user in Settings, so it is a description rather than an id.
        "General notifications",
        NotificationManager.IMPORTANCE_HIGH,
      )
    channel.description = "League activity, chat replies and announcements."
    channel.enableVibration(true)

    val manager = getSystemService(NotificationManager::class.java)
    // Creating a channel that already exists is a no-op, so this is safe on
    // every launch. Note that once created, importance is the user's to change
    // and later edits here are ignored.
    manager?.createNotificationChannel(channel)
    val fantasyChannel = NotificationChannel(
      "fantasy_alerts",
      "Draft and lineup reminders",
      NotificationManager.IMPORTANCE_HIGH,
    )
    fantasyChannel.description = "Your draft picks, draft start times and lineup deadlines."
    fantasyChannel.enableVibration(true)
    manager?.createNotificationChannel(fantasyChannel)
  }

  private companion object {
    const val CHANNEL_ID = "default"
  }
}
