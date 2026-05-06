package com.coffeehub.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

public final class NotificationChannelHelper {

    public static final String ADMIN_CHANNEL_ID = "admin_channel";
    public static final String CUSTOMER_CHANNEL_ID = "customer_channel";
    public static final String AGENT_CHANNEL_ID = "agent_channel";

    private NotificationChannelHelper() {}

    public static void ensureChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
        if (notificationManager == null) {
            return;
        }

        createChannel(
            context,
            notificationManager,
            ADMIN_CHANNEL_ID,
            "Admin updates",
            "Alerts for admin order activity.",
            R.raw.admin,
            new long[] { 200L, 100L, 200L }
        );
        createChannel(
            context,
            notificationManager,
            CUSTOMER_CHANNEL_ID,
            "Order updates",
            "Alerts for customer order progress.",
            R.raw.customer,
            new long[] { 300L }
        );
        createChannel(
            context,
            notificationManager,
            AGENT_CHANNEL_ID,
            "Delivery updates",
            "Alerts for assigned delivery work.",
            R.raw.agent,
            new long[] { 100L, 50L, 100L, 50L, 200L }
        );
    }

    public static String resolveChannelId(String role) {
        if ("admin".equals(role)) {
            return ADMIN_CHANNEL_ID;
        }

        if ("delivery_agent".equals(role) || "agent".equals(role)) {
            return AGENT_CHANNEL_ID;
        }

        return CUSTOMER_CHANNEL_ID;
    }

    private static void createChannel(
        Context context,
        NotificationManager notificationManager,
        String channelId,
        String name,
        String description,
        int soundResource,
        long[] vibrationPattern
    ) {
        NotificationChannel existingChannel = notificationManager.getNotificationChannel(channelId);
        if (existingChannel != null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            channelId,
            name,
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription(description);
        channel.enableVibration(true);
        channel.setVibrationPattern(vibrationPattern);

        Uri soundUri = Uri.parse(
            "android.resource://" + context.getPackageName() + "/" + soundResource
        );
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        channel.setSound(soundUri, audioAttributes);

        notificationManager.createNotificationChannel(channel);
    }
}
