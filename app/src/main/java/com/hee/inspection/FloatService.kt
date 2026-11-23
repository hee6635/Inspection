package com.hee.inspection

import android.animation.ValueAnimator
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PathMeasure
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import kotlin.math.abs

/** Small translucent bubble over other apps: tap = copy again, drag = move, long press = close. */
class FloatService : Service() {
    private val wm by lazy { getSystemService(WINDOW_SERVICE) as WindowManager }
    private val prefs by lazy { getSharedPreferences("float", MODE_PRIVATE) }
    private val dp by lazy { resources.displayMetrics.density }
    private val ui = Handler(Looper.getMainLooper())
    private var frame: FrameLayout? = null
    private lateinit var lp: WindowManager.LayoutParams
    private lateinit var t1: TextView
    private lateinit var t2: TextView
    private lateinit var t3: TextView
    private lateinit var ring: RingView
    private var copyText = ""
    private var closing = false
    private var ringAnim: ValueAnimator? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val text = intent?.getStringExtra("t")
        if (intent?.action == "close" || text == null) { stopSelf(); return START_NOT_STICKY }
        foreground()
        if (frame == null) build()
        copyText = text
        t1.text = intent.getStringExtra("l1") ?: ""
        t2.text = intent.getStringExtra("l2") ?: ""
        t3.text = text
        val f = frame!!
        f.post {
            f.pivotX = f.width.toFloat(); f.pivotY = 0f
            f.scaleX = 0.6f; f.scaleY = 0.6f; f.alpha = 0f
            f.animate().scaleX(1f).scaleY(1f).alpha(1f).setDuration(350).setInterpolator(DecelerateInterpolator(2f)).start()
        }
        return START_NOT_STICKY
    }

    private fun foreground() {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel("float", "점검 말풍선", NotificationManager.IMPORTANCE_MIN))
        val close = PendingIntent.getService(
            this, 0, Intent(this, FloatService::class.java).setAction("close"), PendingIntent.FLAG_IMMUTABLE
        )
        val n = Notification.Builder(this, "float")
            .setSmallIcon(android.R.drawable.ic_menu_edit)
            .setContentTitle("점검 말풍선 표시 중")
            .setContentText("누르면 말풍선 닫기")
            .setContentIntent(close)
            .build()
        if (Build.VERSION.SDK_INT >= 34) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        else startForeground(1, n)
    }

    private fun text(sp: Float, color: Int, bold: Boolean = false) = TextView(this).apply {
        setTextSize(TypedValue.COMPLEX_UNIT_SP, sp)
        setTextColor(color)
        maxWidth = (220 * dp).toInt()
        if (bold) typeface = Typeface.DEFAULT_BOLD
    }

    private fun build() {
        t1 = text(10.5f, 0xFFC9D1D9.toInt())
        t2 = text(10.5f, 0xFFC9D1D9.toInt())
        t3 = text(13.5f, 0xFFFF8F9C.toInt(), true)
        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val p = (12 * dp).toInt(); val v = (8 * dp).toInt()
            setPadding(p, v, p, v)
            background = GradientDrawable().apply { setColor(0xBD191F28.toInt()); cornerRadius = 14 * dp }
            addView(t1); addView(t2); addView(t3)
        }
        ring = RingView(this, 14 * dp, 2.5f * dp)
        val f = FrameLayout(this)
        f.addView(col)
        f.addView(ring, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        lp = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END // x is the distance from the right edge
            x = prefs.getInt("x", (10 * dp).toInt())
            y = prefs.getInt("y", (80 * dp).toInt())
        }
        f.setOnTouchListener(touch())
        wm.addView(f, lp)
        frame = f
    }

    private fun touch(): View.OnTouchListener {
        var sx = 0f; var sy = 0f; var ox = 0; var oy = 0; var moved = false
        val startRing = Runnable {
            ringAnim = ValueAnimator.ofFloat(0f, 1f).setDuration(600).apply {
                addUpdateListener { ring.progress = it.animatedValue as Float; if (it.animatedFraction >= 1f) close() }
                start()
            }
        }
        fun stopRing() { ui.removeCallbacks(startRing); ringAnim?.cancel(); ringAnim = null; ring.progress = 0f }
        return View.OnTouchListener { v, e ->
            if (closing) return@OnTouchListener true
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    sx = e.rawX; sy = e.rawY; ox = lp.x; oy = lp.y; moved = false
                    ui.postDelayed(startRing, 200)
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = e.rawX - sx; val dy = e.rawY - sy
                    if (!moved && abs(dx) + abs(dy) > 12 * dp) { moved = true; stopRing() }
                    if (moved) { lp.x = ox - dx.toInt(); lp.y = oy + dy.toInt(); wm.updateViewLayout(v, lp) }
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    stopRing()
                    if (closing) return@OnTouchListener true
                    if (moved) prefs.edit().putInt("x", lp.x).putInt("y", lp.y).apply()
                    else if (e.actionMasked == MotionEvent.ACTION_UP) recopy(v)
                }
            }
            true
        }
    }

    private fun recopy(v: View) {
        (getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
            .setPrimaryClip(ClipData.newPlainText("점검", copyText))
        v.animate().scaleX(1.07f).scaleY(1.07f).setDuration(110).withEndAction {
            v.animate().scaleX(1f).scaleY(1f).setDuration(160).start()
        }.start()
        Toast.makeText(this, "다시 복사됨", Toast.LENGTH_SHORT).show()
    }

    private fun close() {
        if (closing) return
        closing = true
        frame?.animate()?.scaleX(0.2f)?.scaleY(0.2f)?.alpha(0f)?.setDuration(250)?.withEndAction { stopSelf() }?.start()
    }

    override fun onDestroy() {
        ui.removeCallbacksAndMessages(null)
        frame?.let { wm.removeView(it) }
        frame = null
        super.onDestroy()
    }
}

/** Rounded-rect outline drawn clockwise up to [progress] (0..1). */
class RingView(c: Context, private val radius: Float, stroke: Float) : View(c) {
    var progress = 0f
        set(v) { field = v; invalidate() }
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE; strokeWidth = stroke; color = 0xFFFF8F9C.toInt(); strokeCap = Paint.Cap.ROUND
    }
    private val path = Path()
    private val seg = Path()

    // Take no space while the bubble sizes itself; the FrameLayout then stretches us to the bubble's size.
    // (Default View measuring grabbed the whole screen inside the WRAP_CONTENT overlay window.)
    override fun onMeasure(w: Int, h: Int) {
        fun size(spec: Int) = if (MeasureSpec.getMode(spec) == MeasureSpec.EXACTLY) MeasureSpec.getSize(spec) else 0
        setMeasuredDimension(size(w), size(h))
    }

    override fun onDraw(canvas: Canvas) {
        if (progress <= 0f) return
        val s = paint.strokeWidth / 2
        path.reset()
        path.addRoundRect(s, s, width - s, height - s, radius, radius, Path.Direction.CW)
        val pm = PathMeasure(path, false)
        seg.reset()
        pm.getSegment(0f, pm.length * progress, seg, true)
        canvas.drawPath(seg, paint)
    }
}
