package app.engspace;

import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.Display;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    // how often the page process died lately (static: survives the recreate below)
    private static long lastRendererGone = 0;
    private static int rendererGoneCount = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        preferHighestRefreshRate();
        disableZoom();
        surviveRendererLoss();
    }

    // Android may end the web view's page process: out of memory (a full-size camera photo on a phone with little RAM), or
    // reclaimed while the camera app was in front. Capacitor then answers "not handled" and Android ends the whole app — the
    // app "closed by itself" after «التقاط صورة». Instead: drop the dead web view and rebuild the screen, so the app reopens
    // in place. Three losses within a minute means something keeps killing it: close quietly rather than loop.
    private void surviveRendererLoss() {
        if (getBridge() == null) return;
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                long now = SystemClock.elapsedRealtime();
                rendererGoneCount = now - lastRendererGone < 60_000 ? rendererGoneCount + 1 : 1;
                lastRendererGone = now;
                // the dead web view must never be used again: out of the layout, destroyed
                if (view.getParent() instanceof ViewGroup) ((ViewGroup) view.getParent()).removeView(view);
                view.destroy();
                if (rendererGoneCount >= 3) finish();
                else recreate();
                return true;
            }
        });
    }

    // The app behaves like a native app: no pinch zoom, no zoom controls (the viewport meta and the CSS say the same).
    private void disableZoom() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        WebSettings settings = getBridge().getWebView().getSettings();
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
    }

    @Override
    public void onResume() {
        super.onResume();
        // the system may reset the mode when the app returns to the front (or after a display change)
        preferHighestRefreshRate();
    }

    // Many phones run apps at 60 Hz unless the window asks for more. Ask for the display's fastest mode at the current
    // resolution (90 / 120 / 144 Hz where the panel has it); the system still drops it for battery saver or thermal limits.
    private void preferHighestRefreshRate() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        Display display = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R ? getDisplay() : getWindowManager().getDefaultDisplay();
        if (display == null) return;
        Display.Mode current = display.getMode();
        Display.Mode best = current;
        for (Display.Mode m : display.getSupportedModes()) {
            if (m.getPhysicalWidth() == current.getPhysicalWidth() && m.getPhysicalHeight() == current.getPhysicalHeight()
                    && m.getRefreshRate() > best.getRefreshRate()) {
                best = m;
            }
        }
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        if (lp.preferredDisplayModeId != best.getModeId()) {
            lp.preferredDisplayModeId = best.getModeId();
            getWindow().setAttributes(lp);
        }
    }
}
