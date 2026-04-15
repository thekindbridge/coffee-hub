import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from 'expo-av';

const CUSTOMER_NOTIFICATION_SOUND_URL = 'https://res.cloudinary.com/ddfhaqeme/video/upload/v1776282240/Customer_notification_xhynnm.mp3';

let activeSound: Audio.Sound | null = null;
let activePlaybackResolver: (() => void) | null = null;
let hasConfiguredAudioMode = false;

const logNotificationWarning = (message: string, error: unknown) => {
  if (__DEV__) {
    console.warn(message, error);
  }
};

const resolveActivePlayback = () => {
  const resolver = activePlaybackResolver;
  activePlaybackResolver = null;
  resolver?.();
};

const releaseSoundAsync = async (sound: Audio.Sound | null) => {
  if (!sound) {
    return;
  }

  try {
    sound.setOnPlaybackStatusUpdate(null);
    await sound.stopAsync().catch(() => undefined);
    await sound.unloadAsync();
  } catch (error) {
    logNotificationWarning('Failed to release notification sound.', error);
  }
};

const clearActiveSoundAsync = async () => {
  const sound = activeSound;

  activeSound = null;
  resolveActivePlayback();

  await releaseSoundAsync(sound);
};

const ensureAudioModeAsync = async () => {
  if (hasConfiguredAudioMode) {
    return;
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
    playsInSilentModeIOS: true,
    playThroughEarpieceAndroid: false,
    shouldDuckAndroid: true,
    staysActiveInBackground: false,
  });

  hasConfiguredAudioMode = true;
};

export const playNotificationSoundAsync = async () => {
  await clearActiveSoundAsync();

  try {
    await ensureAudioModeAsync();
  } catch (error) {
    logNotificationWarning('Failed to configure notification audio mode.', error);
    return;
  }

  return new Promise<void>(async resolve => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: CUSTOMER_NOTIFICATION_SOUND_URL },
        {
          progressUpdateIntervalMillis: 250,
          shouldPlay: true,
          volume: 1,
        },
      );

      activeSound = sound;
      activePlaybackResolver = resolve;

      const finalizePlayback = () => {
        if (activeSound === sound) {
          activeSound = null;
        }

        if (activePlaybackResolver === resolve) {
          activePlaybackResolver = null;
        }

        resolve();
      };

      sound.setOnPlaybackStatusUpdate(status => {
        if (!status.isLoaded) {
          if (status.error) {
            logNotificationWarning('Notification sound playback failed.', status.error);
          }

          void releaseSoundAsync(sound).finally(finalizePlayback);
          return;
        }

        if (status.didJustFinish) {
          void releaseSoundAsync(sound).finally(finalizePlayback);
        }
      });
    } catch (error) {
      logNotificationWarning('Failed to play notification sound.', error);
      resolve();
    }
  });
};

export const cleanupNotificationSoundAsync = async () => {
  await clearActiveSoundAsync();
};
