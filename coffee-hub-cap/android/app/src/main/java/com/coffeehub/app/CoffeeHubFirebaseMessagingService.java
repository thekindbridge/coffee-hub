package com.coffeehub.app;

import android.app.ActivityManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class CoffeeHubFirebaseMessagingService extends FirebaseMessagingService {

    private static final String APP_WEB_BASE_URL = "https://coffee-hub-inkollu.vercel.app";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        if (data == null || data.isEmpty()) {
            return;
        }

        if (isAppInForeground()) {
            return;
        }

        NotificationChannelHelper.ensureChannels(this);

        String title = getValue(
            data.get("title"),
            remoteMessage.getNotification() != null ? remoteMessage.getNotification().getTitle() : null,
            getString(R.string.app_name)
        );
        String body = getValue(
            data.get("body"),
            remoteMessage.getNotification() != null ? remoteMessage.getNotification().getBody() : null,
            ""
        );
        String role = getValue(data.get("recipientRole"), null, "customer");
        String channelId = getValue(
            data.get("channelId"),
            null,
            NotificationChannelHelper.resolveChannelId(role)
        );
        String eventId = getValue(data.get("eventId"), null, "");
        String targetUrl = normalizeTargetUrl(getValue(data.get("url"), null, "/"));
        int notificationId = buildNotificationId(eventId, channelId, targetUrl);

        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(targetUrl));
        intent.setClass(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setColor(Color.parseColor("#F7C38D"))
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        NotificationManagerCompat.from(this).notify(notificationId, notificationBuilder.build());
    }

    private boolean isAppInForeground() {
        ActivityManager.RunningAppProcessInfo appProcessInfo = new ActivityManager.RunningAppProcessInfo();
        ActivityManager.getMyMemoryState(appProcessInfo);
        return appProcessInfo.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
            || appProcessInfo.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE;
    }

    private String getValue(String primary, String secondary, String fallback) {
        if (primary != null && !primary.trim().isEmpty()) {
            return primary.trim();
        }

        if (secondary != null && !secondary.trim().isEmpty()) {
            return secondary.trim();
        }

        return fallback;
    }

    private int buildNotificationId(String eventId, String channelId, String targetUrl) {
        String seed = !eventId.trim().isEmpty()
            ? eventId.trim()
            : (channelId + ":" + targetUrl).trim();
        return Math.abs(seed.hashCode());
    }

    private String normalizeTargetUrl(String value) {
        String trimmedValue = value == null ? "" : value.trim();
        if (trimmedValue.isEmpty()) {
            return APP_WEB_BASE_URL + "/";
        }

        if (trimmedValue.startsWith("https://") || trimmedValue.startsWith("http://")) {
            return trimmedValue;
        }

        if (trimmedValue.startsWith("/")) {
            return APP_WEB_BASE_URL + trimmedValue;
        }

        return APP_WEB_BASE_URL + "/" + trimmedValue;
    }
}
