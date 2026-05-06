package com.coffeehub.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {

    private static final int COFFEE_BACKGROUND = Color.parseColor("#120C09");

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CoffeeHubSettingsPlugin.class);
        super.onCreate(savedInstanceState);
        configureWebView();
        configureBackButton();
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
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setLoadWithOverviewMode(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setTextZoom(100);
        settings.setUseWideViewPort(true);

        webView.setBackgroundColor(COFFEE_BACKGROUND);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
        webView.setScrollbarFadingEnabled(true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_BOUND, true);
        }

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
}
