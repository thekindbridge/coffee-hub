import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProviders } from './src/app/providers/AppProviders';
import { useAuth } from './src/hooks/useAuth';
import { useAuthActions } from './src/hooks/useAuthActions';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoginScreen } from './src/screens/LoginScreen';
import { ThemeProvider, useTheme } from './src/theme';

export default function App() {
  const auth = useAuth();
  const authActions = useAuthActions();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootContent auth={auth} authActions={authActions} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootContent({
  auth,
  authActions,
}: {
  auth: ReturnType<typeof useAuth>;
  authActions: ReturnType<typeof useAuthActions>;
}) {
  const { theme } = useTheme();
  const isAuthenticated = auth.isAuthReady && Boolean(auth.user);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {isAuthenticated ? (
        <AppProviders auth={auth}>
          <StatusBar style={theme.isDark ? 'light' : 'dark'} />
          <AppNavigator />
        </AppProviders>
      ) : (
        <>
          <StatusBar style="light" />
          <LoginScreen
            isLoading={authActions.isLoggingIn}
            isLoginReady={auth.isAuthReady && authActions.isLoginReady}
            loginError={authActions.loginError}
            onLogin={() => {
              void authActions.handleLogin();
            }}
          />
        </>
      )}
    </View>
  );
}
