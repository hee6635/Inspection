package com.hee.inspection

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.WebView

class MainActivity : Activity() {
    private lateinit var web: WebView
    private val prefs by lazy { getSharedPreferences("data", MODE_PRIVATE) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        web.settings.javaScriptEnabled = true
        web.setBackgroundColor(0) // let the theme background show while the page loads
        web.addJavascriptInterface(Bridge(), "Android")
        web.loadUrl("file:///android_asset/index.html")
        setContentView(web)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        web.evaluateJavascript("back()") { if (it != "true") finish() }
    }

    inner class Bridge {
        @JavascriptInterface fun load(): String = prefs.getString("tree", "") ?: ""

        @JavascriptInterface fun save(s: String) { prefs.edit().putString("tree", s).apply() }

        @JavascriptInterface fun copy(text: String, cat: String, item: String) {
            clipboard().setPrimaryClip(ClipData.newPlainText("점검", text))
            if (!canFloat()) return
            startForegroundService(
                Intent(this@MainActivity, FloatService::class.java)
                    .putExtra("t", text).putExtra("l1", cat).putExtra("l2", item)
            )
        }

        @JavascriptInterface fun canFloat(): Boolean = Settings.canDrawOverlays(this@MainActivity)

        @JavascriptInterface fun askFloat() {
            startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
        }

        @JavascriptInterface fun share(text: String) {
            val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text)
            startActivity(Intent.createChooser(send, "백업 내보내기"))
        }

        @JavascriptInterface fun paste(): String =
            clipboard().primaryClip?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.coerceToText(this@MainActivity)?.toString() ?: ""

        private fun clipboard() = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    }
}
