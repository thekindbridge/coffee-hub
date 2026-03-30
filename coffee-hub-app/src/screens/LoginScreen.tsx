import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

const HERO_IMAGE =
  'https://res.cloudinary.com/ddfhaqeme/image/upload/v1772699634/e0818545-8027-4b28-8a1f-d521f79fdb6a_plei96.jpg';

type LoginScreenProps = {
  isGoogleReady: boolean;
  isSessionReady: boolean;
  isLoggingIn?: boolean;
  loginError?: string;
  onLogin: () => void;
};

export function LoginScreen({
  isGoogleReady,
  isSessionReady,
  isLoggingIn = false,
  loginError = '',
  onLogin,
}: LoginScreenProps) {
  const isButtonEnabled = isSessionReady && isGoogleReady && !isLoggingIn;

  const buttonLabel = !isSessionReady
    ? 'Restoring session...'
    : !isGoogleReady
      ? 'Preparing Google...'
    : isLoggingIn
      ? 'Signing in...'
      : 'Continue with Google';

  return (
    <LinearGradient
      colors={['#0F0B09', '#18120F', '#23160F']}
      locations={[0, 0.55, 1]}
      style={styles.container}
    >
      <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.heroImage} imageStyle={styles.heroImageStyle}>
        <LinearGradient
          colors={['rgba(12, 8, 7, 0.2)', 'rgba(12, 8, 7, 0.72)', '#0F0B09']}
          locations={[0, 0.5, 1]}
          style={styles.heroOverlay}
        />
      </ImageBackground>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.heroCopy}>
            <View style={styles.brandPill}>
              <MaterialCommunityIcons name="coffee-outline" size={15} color="#F3C897" />
              <Text style={styles.brandPillText}>Inkollu coffee kitchen</Text>
            </View>

            <View style={styles.brandMark}>
              <LinearGradient
                colors={['rgba(255, 235, 212, 0.18)', 'rgba(89, 49, 28, 0.26)']}
                style={styles.brandMarkInner}
              >
                <MaterialCommunityIcons name="coffee-maker-outline" size={48} color="#FFD2A3" />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Coffee Hub</Text>
            <Text style={styles.subtitle}>Fresh brews. Fast delivery.</Text>
            <Text style={styles.description}>
              Premium comfort food, coffee-house warmth, and quick reorders designed for smooth delivery.
            </Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelRow}>
              <Feather name="shield" size={16} color="#F3C897" />
              <Text style={styles.panelEyebrow}>Secure Google sign-in</Text>
            </View>

            <Text style={styles.panelText}>
              Continue with Google to sync your orders, offers, and checkout flow across sessions.
            </Text>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.googleButton,
                !isButtonEnabled ? styles.googleButtonDisabled : null,
                pressed ? styles.googleButtonPressed : null,
              ]}
              onPress={onLogin}
              disabled={!isButtonEnabled}
            >
              <View style={styles.googleIconWrap}>
                <Ionicons name="logo-google" size={19} color="#1F150F" />
              </View>
              <Text style={styles.googleButtonText}>{buttonLabel}</Text>
            </Pressable>

            {loginError ? (
              <View style={styles.errorCard}>
                <Feather name="alert-circle" size={16} color="#F8C7C0" />
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            ) : null}

            {!loginError && !isSessionReady ? (
              <Text style={styles.sessionHint}>
                Checking for your saved Coffee Hub session...
              </Text>
            ) : null}

            {!loginError && isSessionReady && !isGoogleReady ? (
              <Text style={styles.sessionHint}>
                Preparing the Google sign-in flow...
              </Text>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0B09',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImageStyle: {
    opacity: 0.22,
  },
  heroOverlay: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    justifyContent: 'space-between',
  },
  heroCopy: {
    paddingTop: SPACING.xl,
  },
  brandPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 248, 241, 0.08)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
  },
  brandPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#F5E6D4',
  },
  brandMark: {
    marginTop: SPACING.xl,
    width: 124,
    height: 124,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 10,
  },
  brandMarkInner: {
    flex: 1,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: SPACING.xl,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '800',
    color: '#FFF8F1',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#F0CFAD',
  },
  description: {
    marginTop: SPACING.md,
    maxWidth: 320,
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(248, 233, 216, 0.84)',
  },
  panel: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 250, 244, 0.08)',
    padding: SPACING.lg,
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  panelEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#F0CFAD',
  },
  panelText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(248, 233, 216, 0.88)',
  },
  googleButton: {
    minHeight: 56,
    marginTop: SPACING.lg,
    borderRadius: 32,
    backgroundColor: '#FFF8F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 6,
  },
  googleButtonPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  googleButtonDisabled: {
    opacity: 0.72,
  },
  googleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F150F',
  },
  errorCard: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(114, 31, 22, 0.38)',
    padding: SPACING.md,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#FFF1EF',
  },
  sessionHint: {
    marginTop: SPACING.md,
    fontSize: 12,
    color: 'rgba(248, 233, 216, 0.7)',
  },
});
