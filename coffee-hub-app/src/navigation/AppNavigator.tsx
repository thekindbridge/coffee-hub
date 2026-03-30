import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROOT_ROUTES } from '../constants/routes';
import { navigationTheme } from '../constants/theme';
import { CartScreen } from '../screens/CartScreen';
import { CheckoutDetailsScreen } from '../screens/CheckoutDetailsScreen';
import { MainTabNavigator } from './MainTabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name={ROOT_ROUTES.MAIN_TABS} component={MainTabNavigator} />
        <Stack.Screen name={ROOT_ROUTES.CART} component={CartScreen} />
        <Stack.Screen
          name={ROOT_ROUTES.CHECKOUT_DETAILS}
          component={CheckoutDetailsScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
