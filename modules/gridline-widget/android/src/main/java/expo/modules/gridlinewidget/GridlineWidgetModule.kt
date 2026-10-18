package expo.modules.gridlinewidget

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class GridlineWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("GridlineWidget")

    Function("setWidgetData") { json: String ->
      val context = requireNotNull(appContext.reactContext)
      context.getSharedPreferences(context.packageName + ".gridline-widget", Context.MODE_PRIVATE)
        .edit()
        .putString("data", json)
        .apply()
      GridlineWidgetProvider.refresh(context)
    }
  }
}
