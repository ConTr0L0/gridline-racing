package expo.modules.gridlinewidget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.Executors
import kotlin.math.min

class GridlineWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { render(context, manager, it) }
    scheduleNextBoundary(context)
    if (appWidgetIds.isNotEmpty()) ensureDriverPortrait(context)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == ACTION_REFRESH || intent.action == Intent.ACTION_BOOT_COMPLETED ||
      intent.action == Intent.ACTION_TIME_CHANGED || intent.action == Intent.ACTION_TIMEZONE_CHANGED) {
      refresh(context)
    }
  }

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    super.onDeleted(context, appWidgetIds)
    if (AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, GridlineWidgetProvider::class.java)).isEmpty()) {
      cancelBoundary(context)
    }
  }

  companion object {
    private const val ACTION_REFRESH = "com.contr0l0.f1gridline.widget.REFRESH"
    private const val ALARM_REQUEST = 2026
    private const val PREFS = ".gridline-widget"
    private const val DATA = "data"
    private const val PORTRAIT_ATTEMPT_URL = "portrait-attempt-url"
    private const val PORTRAIT_ATTEMPT_AT = "portrait-attempt-at"
    private const val PORTRAIT_RETRY_MS = 10 * 60 * 1000L
    private val portraitExecutor = Executors.newSingleThreadExecutor()
    @Volatile private var queuedPortraitUrl: String? = null

    fun refresh(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, GridlineWidgetProvider::class.java))
      ids.forEach { render(context, manager, it) }
      if (ids.isEmpty()) cancelBoundary(context) else {
        scheduleNextBoundary(context)
        ensureDriverPortrait(context)
      }
    }

    private fun render(context: Context, manager: AppWidgetManager, widgetId: Int) {
      val raw = context.getSharedPreferences(context.packageName + PREFS, Context.MODE_PRIVATE).getString(DATA, null)
      val data = raw?.takeIf { it.isNotBlank() }?.let { runCatching { JSONObject(it) }.getOrNull() }
      val views = RemoteViews(context.packageName, R.layout.gridline_widget)
      val hasData = data != null
      views.setViewVisibility(R.id.widget_empty, if (hasData) View.GONE else View.VISIBLE)
      views.setViewVisibility(R.id.widget_content, if (hasData) View.VISIBLE else View.GONE)

      val now = System.currentTimeMillis()
      val events = data?.optJSONArray("races").asObjects().sortedBy { it.optLong("startAt") }
      val current = events.firstOrNull { it.optLong("weekendStart") <= now && it.optLong("endAt") > now }
      val event = current ?: events.firstOrNull { it.optLong("weekendStart") > now }
      val startAt = event?.optLong("startAt", 0L) ?: 0L
      val endAt = event?.optLong("endAt", 0L) ?: 0L
      val inProgress = event != null && startAt <= now && endAt > now
      views.setTextViewText(R.id.widget_race_name, event?.optString("name").orEmpty().ifBlank { "赛程待同步" })
      views.setTextViewText(R.id.widget_race_location, event?.optString("location").orEmpty().ifBlank { "打开 APP 同步赛程" })
      views.setTextViewText(R.id.widget_race_state, when {
        inProgress -> "本站 · 正赛进行中"
        current != null -> "本站 · 正赛倒计时"
        event != null -> "下一站 · 正赛倒计时"
        else -> "本赛季暂无下一站"
      })
      views.setTextViewText(R.id.widget_race_date, if (event != null) "北京时间  " + shanghaiTime(startAt) else "赛程同步后显示开赛时间")
      views.setViewVisibility(R.id.widget_countdown, if (event != null && !inProgress) View.VISIBLE else View.GONE)
      views.setViewVisibility(R.id.widget_live, if (inProgress) View.VISIBLE else View.GONE)
      if (event != null && !inProgress) {
        views.setChronometer(R.id.widget_countdown, SystemClock.elapsedRealtime() + startAt - now, null, true)
        views.setChronometerCountDown(R.id.widget_countdown, true)
      }

      val driverTarget = data?.optJSONObject("driverTarget")
      val teamTarget = data?.optJSONObject("teamTarget")
      setTarget(views, R.id.widget_driver_label, R.id.widget_driver_name, R.id.widget_driver_score, driverTarget, "车手榜待更新")
      setTarget(views, R.id.widget_team_label, R.id.widget_team_name, R.id.widget_team_score, teamTarget, "车队榜待更新")
      val portraitUrl = driverTarget?.optString("headshotUrl").orEmpty()
      val portrait = portraitUrl.takeIf { it.startsWith("https://", true) }
        ?.let { portraitFile(context, it) }
        ?.takeIf { it.isFile }
        ?.let { runCatching { BitmapFactory.decodeFile(it.absolutePath) }.getOrNull() }
      if (portrait == null) views.setImageViewResource(R.id.widget_driver_photo, R.drawable.gridline_widget_driver_placeholder)
      else views.setImageViewBitmap(R.id.widget_driver_photo, portrait)
      val logoResource = teamLogoResource(teamTarget?.optString("logoKey").orEmpty())
      views.setViewVisibility(R.id.widget_team_logo_tile, if (logoResource == 0) View.GONE else View.VISIBLE)
      if (logoResource != 0) views.setImageViewResource(R.id.widget_team_logo, logoResource)
      fillRows(views, data?.optJSONArray("drivers"), intArrayOf(R.id.driver_pos_1, R.id.driver_pos_2, R.id.driver_pos_3), intArrayOf(R.id.driver_name_1, R.id.driver_name_2, R.id.driver_name_3), intArrayOf(R.id.driver_pts_1, R.id.driver_pts_2, R.id.driver_pts_3))
      fillRows(views, data?.optJSONArray("teams"), intArrayOf(R.id.team_pos_1, R.id.team_pos_2, R.id.team_pos_3), intArrayOf(R.id.team_name_1, R.id.team_name_2, R.id.team_name_3), intArrayOf(R.id.team_pts_1, R.id.team_pts_2, R.id.team_pts_3))
      val updatedAt = data?.optLong("updatedAt", 0L) ?: 0L
      views.setTextViewText(R.id.widget_updated, if (updatedAt > 0) "数据更新  " + shanghaiTime(updatedAt) else "等待 APP 同步")

      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      if (launch != null) {
        launch.action = Intent.ACTION_VIEW
        if (event != null) launch.data = Uri.parse("f1gridline://race/" + Uri.encode(event.optString("id")))
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val click = PendingIntent.getActivity(context, widgetId, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_root, click)
      }
      manager.updateAppWidget(widgetId, views)
    }

    private fun teamLogoResource(key: String): Int = when (key) {
      "mercedes" -> R.drawable.widget_team_logo_mercedes
      "ferrari" -> R.drawable.widget_team_logo_ferrari
      "mclaren" -> R.drawable.widget_team_logo_mclaren
      "redbull" -> R.drawable.widget_team_logo_redbull
      "racing-bulls" -> R.drawable.widget_team_logo_racing_bulls
      "alpine" -> R.drawable.widget_team_logo_alpine
      "haas", "haas-f1-team" -> R.drawable.widget_team_logo_haas
      "audi" -> R.drawable.widget_team_logo_audi
      "williams" -> R.drawable.widget_team_logo_williams
      "aston" -> R.drawable.widget_team_logo_aston
      "cadillac" -> R.drawable.widget_team_logo_cadillac
      else -> 0
    }

    private fun ensureDriverPortrait(context: Context) {
      val preferences = context.getSharedPreferences(context.packageName + PREFS, Context.MODE_PRIVATE)
      val raw = preferences.getString(DATA, null) ?: return
      val url = runCatching { JSONObject(raw).optJSONObject("driverTarget")?.optString("headshotUrl").orEmpty() }.getOrNull()
        ?.takeIf { it.startsWith("https://", true) } ?: return
      val destination = portraitFile(context, url)
      if (destination.isFile) return
      if (preferences.getString(PORTRAIT_ATTEMPT_URL, null) == url && System.currentTimeMillis() - preferences.getLong(PORTRAIT_ATTEMPT_AT, 0L) < PORTRAIT_RETRY_MS) return
      synchronized(this) {
        if (queuedPortraitUrl == url) return
        queuedPortraitUrl = url
      }
      preferences.edit().putString(PORTRAIT_ATTEMPT_URL, url).putLong(PORTRAIT_ATTEMPT_AT, System.currentTimeMillis()).apply()
      portraitExecutor.execute {
        var connection: HttpURLConnection? = null
        try {
          connection = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 5000
            readTimeout = 8000
            instanceFollowRedirects = true
          }
          if (connection.responseCode in 200..299 && connection.contentLengthLong <= 5 * 1024 * 1024) {
            val bitmap = connection.inputStream.use { BitmapFactory.decodeStream(it) }
            if (bitmap != null && bitmap.width > 0 && bitmap.height > 0) {
              val side = min(bitmap.width, bitmap.height)
              val square = Bitmap.createBitmap(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side)
              val thumbnail = Bitmap.createScaledBitmap(square, 96, 96, true)
              if (square !== bitmap) square.recycle()
              bitmap.recycle()
              destination.parentFile?.mkdirs()
              val temporary = File(destination.parentFile, destination.name + ".tmp")
              val saved = FileOutputStream(temporary).use { thumbnail.compress(Bitmap.CompressFormat.PNG, 100, it) }
              thumbnail.recycle()
              if (saved) temporary.renameTo(destination)
            }
          }
        } catch (_: Exception) {
          // Keep the local placeholder and retry on a later data sync.
        } finally {
          connection?.disconnect()
          synchronized(this) { if (queuedPortraitUrl == url) queuedPortraitUrl = null }
          if (destination.isFile) refresh(context)
        }
      }
    }

    private fun portraitFile(context: Context, url: String): File {
      val hash = MessageDigest.getInstance("SHA-256").digest(url.toByteArray())
        .joinToString("") { "%02x".format(it.toInt() and 0xff) }
      return File(context.cacheDir, "gridline-driver-$hash.png")
    }

    private fun setTarget(views: RemoteViews, labelId: Int, nameId: Int, scoreId: Int, target: JSONObject?, fallback: String) {
      views.setTextViewText(labelId, target?.optString("label").orEmpty().ifBlank { fallback })
      views.setTextViewText(nameId, target?.optString("name").orEmpty().ifBlank { "—" })
      val position = target?.optInt("position", 0) ?: 0
      val points = target?.opt("points")?.takeUnless { it === JSONObject.NULL }?.toString() ?: "—"
      views.setTextViewText(scoreId, if (position > 0) "P" + position + "  ·  " + points + " PTS" else "—  ·  " + points + " PTS")
    }

    private fun fillRows(views: RemoteViews, rows: JSONArray?, positions: IntArray, names: IntArray, points: IntArray) {
      for (index in positions.indices) {
        val row = rows?.optJSONObject(index)
        views.setTextViewText(positions[index], row?.optInt("position", index + 1)?.let { String.format(Locale.US, "%02d", it) } ?: "—")
        views.setTextViewText(names[index], row?.optString("name").orEmpty().ifBlank { "—" })
        views.setTextViewText(points[index], row?.opt("points")?.takeUnless { it === JSONObject.NULL }?.toString() ?: "—")
      }
    }

    private fun scheduleNextBoundary(context: Context) {
      val raw = context.getSharedPreferences(context.packageName + PREFS, Context.MODE_PRIVATE).getString(DATA, null)
      val events = raw?.takeIf { it.isNotBlank() }?.let { runCatching { JSONObject(it).optJSONArray("races").asObjects() }.getOrNull() }.orEmpty()
      val now = System.currentTimeMillis()
      val next = events.flatMap { listOf(it.optLong("weekendStart"), it.optLong("startAt"), it.optLong("endAt")) }
        .filter { it > now }.minOrNull()
      val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val intent = Intent(context, GridlineWidgetProvider::class.java).setAction(ACTION_REFRESH)
      val pending = PendingIntent.getBroadcast(context, ALARM_REQUEST, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      if (next != null) {
        // ponytail: one inexact boundary alarm; exact alarms need a permission the widget does not require.
        alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pending)
      } else {
        alarm.cancel(pending)
      }
    }

    private fun cancelBoundary(context: Context) {
      val intent = Intent(context, GridlineWidgetProvider::class.java).setAction(ACTION_REFRESH)
      val pending = PendingIntent.getBroadcast(context, ALARM_REQUEST, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pending)
    }

    private fun shanghaiTime(millis: Long): String = SimpleDateFormat("M月d日  HH:mm", Locale.SIMPLIFIED_CHINESE).apply {
      timeZone = TimeZone.getTimeZone("Asia/Shanghai")
    }.format(Date(millis))

    private fun JSONArray?.asObjects(): List<JSONObject> = (0 until (this?.length() ?: 0)).mapNotNull { this?.optJSONObject(it) }
  }
}
