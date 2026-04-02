import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { useTheme, useThemedStyles } from '../theme';

const HERO_IMAGE =
  'https://res.cloudinary.com/ddfhaqeme/image/upload/v1772699634/e0818545-8027-4b28-8a1f-d521f79fdb6a_plei96.jpg';

type LoginScreenProps = {
  isLoading?: boolean;
  isLoginReady?: boolean;
  loginError?: string;
  onLogin: () => void;
};

export function LoginScreen({
  isLoading = false,
  isLoginReady = true,
  loginError = '',
  onLogin,
}: LoginScreenProps) {
  const styles = useThemedStyles(createStyles);
  const buttonLabel = isLoading ? 'Connecting Google...' : 'Continue with Google';

  return (
    <LinearGradient
      colors={['#120C0A', '#241715', '#3A221A']}
      locations={[0, 0.55, 1]}
      style={styles.container}
    >
      <ImageBackground
        source={{ uri: HERO_IMAGE }}
        style={styles.heroImage}
        imageStyle={styles.heroImageStyle}
      >
        <LinearGradient
          colors={['rgba(12, 8, 7, 0.16)', 'rgba(12, 8, 7, 0.72)', '#120C0A']}
          locations={[0, 0.5, 1]}
          style={styles.heroOverlay}
        />
      </ImageBackground>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View style={styles.heroCopy}>
            <View style={styles.brandPill}>
              <Ionicons name="cafe-outline" size={15} color="#E8CBB6" />
              <Text style={styles.brandPillText}>Inkollu coffee kitchen</Text>
            </View>

            <View style={styles.brandMark}>
              <LinearGradient
                colors={['rgba(255, 243, 233, 0.18)', 'rgba(198, 124, 78, 0.24)']}
                style={styles.brandMarkInner}
              >
                <Ionicons
                  name="cafe"
                  size={50}
                  color="#F7D5BA"
                />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Coffee Hub</Text>
            <Text style={styles.subtitle}>Fresh brews. Fast delivery.</Text>
            <Text style={styles.description}>
              A warmer, smoother ordering flow with account switching fixed before every Google sign-in.
            </Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelRow}>
              <Ionicons name="logo-google" size={16} color="#E8CBB6" />
              <Text style={styles.panelEyebrow}>Simple sign in</Text>
            </View>

            <Text style={styles.panelText}>
              Continue with Google and the app will force the account picker so switching profiles feels reliable.
            </Text>

            <PrimaryButton
              title={buttonLabel}
              onPress={onLogin}
              loading={isLoading}
              disabled={!isLoginReady}
              icon={<Ionicons name="logo-google" size={18} color="#FBF6F1" />}
              style={styles.button}
            />

            {loginError ? (
              <Text style={styles.errorText}>{loginError}</Text>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120C0A',
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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  heroCopy: {
    paddingTop: theme.spacing.xl,
  },
  brandPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 248, 241, 0.08)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
  },
  brandPillText: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#F7E9DA',
  },
  brandMark: {
    marginTop: theme.spacing.xl,
    width: 128,
    height: 128,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 10,
  },
  brandMarkInner: {
    flex: 1,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: theme.spacing.xl,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
    color: '#FFF8F1',
  },
  subtitle: {
    marginTop: 8,
    fontSize: theme.typography.subheading,
    fontWeight: '700',
    color: '#E8CBB6',
  },
  description: {
    marginTop: theme.spacing.md,
    maxWidth: 320,
    fontSize: theme.typography.body,
    lineHeight: 24,
    color: 'rgba(248, 233, 216, 0.84)',
  },
  panel: {
    borderRadius: theme.radius.hero,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 250, 244, 0.08)',
    padding: theme.spacing.lg,
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  panelEyebrow: {
    fontSize: theme.typography.eyebrow,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#E8CBB6',
  },
  panelText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    lineHeight: 22,
    color: 'rgba(248, 233, 216, 0.88)',
  },
  button: {
    marginTop: theme.spacing.lg,
  },
  errorText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.body,
    lineHeight: 20,
    color: '#F2B7AF',
  },
});
