package app.engspace;

import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.WindowManager;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        preferHighestRefreshRate();
        disableZoom();
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
