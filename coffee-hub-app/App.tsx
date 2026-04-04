import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { resetAuthSession } from './src/services/auth/authService';
import { ThemeProvider, useTheme } from './src/theme';

type GlobalErrorUtils = {
  getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

export default function App() {
  const [isStartupResetComplete, setIsStartupResetComplete] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const errorUtils = (globalThis as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
    const previousGlobalHandler = errorUtils?.getGlobalHandler?.();

    errorUtils?.setGlobalHandler?.((error, isFatal) => {
      console.error('[App] Global error', { error, isFatal });
      previousGlobalHandler?.(error, isFatal);
    });

    // Debug hard reset: clear persisted storage before mounting the app so
    // AsyncStorage and Fast Refresh cannot silently rehydrate auth state.
    const runStartupReset = async () => {
      console.log('[App] bundle entry: coffee-hub-app/App.tsx');
      console.log('\uD83D\uDD25 FORCE CLEAR STORAGE');

      try {
        await AsyncStorage.clear();
        console.log('[App] AsyncStorage.clear:success');
      } catch (storageError) {
        console.error('[App] AsyncStorage.clear:error', storageError);
      }

      try {
        resetAuthSession('App startup hard reset');
      } catch (resetError) {
        console.error('[App] resetAuthSession:error', resetError);
      }

      if (isMounted) {
        console.log('[App] startup reset complete');
        setIsStartupResetComplete(true);
      }
    };

    void runStartupReset();

    return () => {
      isMounted = false;

      if (previousGlobalHandler && errorUtils?.setGlobalHandler) {
        errorUtils.setGlobalHandler(previousGlobalHandler);
      }
    };
  }, []);

  if (!isStartupResetComplete) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ flex: 1, backgroundColor: '#ffffff' }} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

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
