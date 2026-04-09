import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/theme';

type GlobalErrorUtils = {
  getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

export default function App() {
  useEffect(() => {
    const errorUtils = (globalThis as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
    const previousGlobalHandler = errorUtils?.getGlobalHandler?.();

    errorUtils?.setGlobalHandler?.((error, isFatal) => {
      console.error('[App] Global error', { error, isFatal });
      previousGlobalHandler?.(error, isFatal);
    });

    return () => {
      if (previousGlobalHandler && errorUtils?.setGlobalHandler) {
        errorUtils.setGlobalHandler(previousGlobalHandler);
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <RootContent />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootContent() {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </View>
  );
}
