import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ROUTES } from '../constants/routes';
import { palette } from '../constants/theme';
import { useAuth } from '../hooks';
import { LoginScreen } from '../screens/LoginScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { MainTabNavigator } from './MainTabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.background,
    border: palette.border,
    card: palette.surface,
    primary: palette.primary,
    text: palette.textPrimary,
  },
};

export function AppNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          contentStyle: {
            backgroundColor: palette.background,
          },
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: palette.surface,
          },
          headerTintColor: palette.textPrimary,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen
              component={MainTabNavigator}
              name={ROUTES.MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              component={MenuScreen}
              name={ROUTES.Menu}
              options={{ title: 'Menu' }}
            />
          </>
        ) : (
          <Stack.Screen
            component={LoginScreen}
            name={ROUTES.Login}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
