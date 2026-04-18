package com.coffeehub.app;

import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {

    private static final int COFFEE_BACKGROUND = Color.parseColor("#120C09");
    private static final int OVERLAY_BACKGROUND = Color.parseColor("#CC120C09");
    private static final int OVERLAY_CARD_BACKGROUND = Color.parseColor("#E61C120D");
    private static final int OVERLAY_TEXT = Color.parseColor("#FFF6EE");
    private FrameLayout authRedirectOverlay;
    private TextView authRedirectMessageView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureWebView();
        configureBackButton();
        installAuthRedirectOverlay();
        registerWebViewListeners();
    }

    private void configureWebView() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        CookieManager cookieManager = CookieManager.getInstance();

        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setSupportMultipleWindows(false);

        webView.setBackgroundColor(COFFEE_BACKGROUND);
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);

        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);
        cookieManager.flush();
    }

    private void configureBackButton() {
        getOnBackPressedDispatcher().addCallback(
            this,
            new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    if (getBridge() != null && getBridge().getWebView() != null && getBridge().getWebView().canGoBack()) {
                        getBridge().getWebView().goBack();
                    } else {
                        finishAffinity();
                    }
                }
            }
        );
    }

    private void registerWebViewListeners() {
        if (getBridge() == null) {
            return;
        }

        getBridge().addWebViewListener(
            new WebViewListener() {
                @Override
                public void onPageCommitVisible(WebView view, String url) {
                    view.setBackgroundColor(COFFEE_BACKGROUND);
                    CookieManager.getInstance().flush();
                }

                @Override
                public void onReceivedError(WebView webView) {
                    CookieManager.getInstance().flush();
                }
            }
        );
    }

    private void installAuthRedirectOverlay() {
        if (authRedirectOverlay != null) {
            return;
        }

        ViewGroup rootView = findViewById(android.R.id.content);
        if (rootView == null) {
            return;
        }

        FrameLayout overlay = new FrameLayout(this);
        overlay.setLayoutParams(
            new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        );
        overlay.setBackgroundColor(OVERLAY_BACKGROUND);
        overlay.setClickable(true);
        overlay.setFocusable(true);
        overlay.setVisibility(View.GONE);

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER_HORIZONTAL);
        content.setPadding(dpToPx(24), dpToPx(24), dpToPx(24), dpToPx(24));

        GradientDrawable cardBackground = new GradientDrawable();
        cardBackground.setColor(OVERLAY_CARD_BACKGROUND);
        cardBackground.setCornerRadius(dpToPx(18));
        content.setBackground(cardBackground);

        ProgressBar progressBar = new ProgressBar(this);
        LinearLayout.LayoutParams progressParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        progressParams.bottomMargin = dpToPx(16);
        progressBar.setLayoutParams(progressParams);

        TextView messageView = new TextView(this);
        messageView.setText("Opening secure Google sign-in...");
        messageView.setGravity(Gravity.CENTER);
        messageView.setTextColor(OVERLAY_TEXT);
        messageView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);

        content.addView(progressBar);
        content.addView(messageView);

        FrameLayout.LayoutParams contentParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        contentParams.gravity = Gravity.CENTER;
        contentParams.leftMargin = dpToPx(32);
        contentParams.rightMargin = dpToPx(32);

        overlay.addView(content, contentParams);
        rootView.addView(overlay);

        authRedirectOverlay = overlay;
        authRedirectMessageView = messageView;
    }

    private int dpToPx(int value) {
        return Math.round(
            TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                value,
                getResources().getDisplayMetrics()
            )
        );
    }
}
