package com.coffeehub.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.Logger;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {

    private static final int COFFEE_BACKGROUND = Color.parseColor("#120C09");
    private static final int OVERLAY_BACKGROUND = Color.parseColor("#CC120C09");
    private static final int OVERLAY_CARD_BACKGROUND = Color.parseColor("#E61C120D");
    private static final int OVERLAY_TEXT = Color.parseColor("#FFF6EE");
    private static final String APP_SCHEME = "https";
    private static final String APP_HOST = "coffee-hub-inkollu.vercel.app";
    private static final String GOOGLE_ACCOUNTS_HOST = "accounts.google.com";
    private static final String FIREBASE_AUTH_HANDLER_PATH = "/__/auth/handler";
    private static final long AUTH_RETURN_TIMEOUT_MS = 900L;
    private static final String AUTH_LOG_TAG = Logger.tags("CoffeeHub", "Auth");

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private FrameLayout authRedirectOverlay;
    private TextView authRedirectMessageView;
    private boolean externalAuthInProgress = false;
    private boolean loadingAuthReturnUrl = false;

    private final Runnable authResumeFallback = new Runnable() {
        @Override
        public void run() {
            if (externalAuthInProgress && !loadingAuthReturnUrl) {
                externalAuthInProgress = false;
                hideAuthRedirectOverlay();
            }
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureWebView();
        configureBackButton();
        installAuthRedirectOverlay();
        registerWebViewListeners();
        installExternalAuthWebViewClient();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        if (intent != null) {
            setIntent(intent);
        }

        super.onNewIntent(intent);

        if (intent == null) {
            return;
        }

        mainHandler.post(() -> handleAppLinkReturn(intent));
    }

    @Override
    public void onResume() {
        super.onResume();

        if (externalAuthInProgress && !loadingAuthReturnUrl) {
            mainHandler.removeCallbacks(authResumeFallback);
            mainHandler.postDelayed(authResumeFallback, AUTH_RETURN_TIMEOUT_MS);
        }
    }

    @Override
    public void onPause() {
        mainHandler.removeCallbacks(authResumeFallback);
        super.onPause();
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

    private void installExternalAuthWebViewClient() {
        if (getBridge() == null) {
            return;
        }

        getBridge().setWebViewClient(new ExternalAuthWebViewClient(getBridge()));
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

                    if (shouldFinishAuthFlow(url)) {
                        loadingAuthReturnUrl = false;
                        externalAuthInProgress = false;
                        hideAuthRedirectOverlay();
                    }
                }

                @Override
                public void onReceivedError(WebView webView) {
                    CookieManager.getInstance().flush();

                    if (loadingAuthReturnUrl) {
                        loadingAuthReturnUrl = false;
                        externalAuthInProgress = false;
                        hideAuthRedirectOverlay();
                    }
                }
            }
        );
    }

    private void handleAppLinkReturn(Intent intent) {
        if (!isFirebaseAuthHandlerIntent(intent) || getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        Uri appLink = intent.getData();
        if (appLink == null) {
            return;
        }

        externalAuthInProgress = true;
        loadingAuthReturnUrl = true;
        mainHandler.removeCallbacks(authResumeFallback);
        showAuthRedirectOverlay("Completing Google sign-in...");
        CookieManager.getInstance().flush();
        getBridge().getWebView().loadUrl(appLink.toString());
    }

    private boolean openExternalBrowserForAuth(Uri url) {
        Intent intent = new Intent(Intent.ACTION_VIEW, url);
        intent.addCategory(Intent.CATEGORY_BROWSABLE);

        try {
            externalAuthInProgress = true;
            loadingAuthReturnUrl = false;
            mainHandler.removeCallbacks(authResumeFallback);
            showAuthRedirectOverlay("Opening secure Google sign-in...");
            startActivity(intent);
            return true;
        } catch (ActivityNotFoundException error) {
            externalAuthInProgress = false;
            loadingAuthReturnUrl = false;
            hideAuthRedirectOverlay();
            Logger.error(AUTH_LOG_TAG, "Unable to open an external browser for Google sign-in.", error);
            return false;
        }
    }

    private boolean shouldFinishAuthFlow(String url) {
        if ((!externalAuthInProgress && !loadingAuthReturnUrl) || url == null || url.isBlank()) {
            return false;
        }

        Uri currentUrl = Uri.parse(url);
        if (!isAppHost(currentUrl)) {
            return false;
        }

        String path = currentUrl.getPath();
        return path == null || !path.startsWith(FIREBASE_AUTH_HANDLER_PATH);
    }

    private boolean isFirebaseAuthHandlerIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) {
            return false;
        }

        return isFirebaseAuthHandlerUrl(intent.getData());
    }

    private boolean isAppHost(Uri url) {
        return url != null && APP_SCHEME.equalsIgnoreCase(url.getScheme()) && APP_HOST.equalsIgnoreCase(url.getHost());
    }

    private boolean isFirebaseAuthHandlerUrl(Uri url) {
        if (!isAppHost(url)) {
            return false;
        }

        String path = url != null ? url.getPath() : null;
        return path != null && path.startsWith(FIREBASE_AUTH_HANDLER_PATH);
    }

    private boolean isGoogleAccountsUrl(Uri url) {
        return url != null && url.toString().contains(GOOGLE_ACCOUNTS_HOST);
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

    private void showAuthRedirectOverlay(String message) {
        if (authRedirectOverlay == null) {
            installAuthRedirectOverlay();
        }

        if (authRedirectOverlay == null) {
            return;
        }

        if (authRedirectMessageView != null) {
            authRedirectMessageView.setText(message);
        }

        authRedirectOverlay.bringToFront();
        authRedirectOverlay.setVisibility(View.VISIBLE);
    }

    private void hideAuthRedirectOverlay() {
        if (authRedirectOverlay != null) {
            authRedirectOverlay.setVisibility(View.GONE);
        }
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

    private final class ExternalAuthWebViewClient extends BridgeWebViewClient {

        private ExternalAuthWebViewClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri requestUrl = request != null ? request.getUrl() : null;

            if (request != null && request.isForMainFrame() && isGoogleAccountsUrl(requestUrl)) {
                return openExternalBrowserForAuth(requestUrl);
            }

            return super.shouldOverrideUrlLoading(view, request);
        }
    }
}
