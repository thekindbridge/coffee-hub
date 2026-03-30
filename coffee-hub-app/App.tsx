import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProviders } from './src/app/providers/AppProviders';
import { COLORS } from './src/constants/theme';
import { useAuth } from './src/hooks/useAuth';
import { useAuthActions } from './src/hooks/useAuthActions';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoginScreen } from './src/screens/LoginScreen';

export default function App() {
  const auth = useAuth();
  const authActions = useAuthActions();

  const isAuthenticated = auth.isAuthReady && Boolean(auth.user);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        {isAuthenticated ? (
          <AppProviders>
            <StatusBar style="dark" />
            <AppNavigator />
          </AppProviders>
        ) : (
          <>
            <StatusBar style="light" />
            <LoginScreen
              isLoading={!auth.isAuthReady || authActions.isLoggingIn}
              onLogin={() => {
                void authActions.handleLogin();
              }}
            />
          </>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
