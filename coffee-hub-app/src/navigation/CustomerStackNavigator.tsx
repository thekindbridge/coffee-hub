import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROOT_ROUTES } from '../constants/routes';
import { CartScreen } from '../screens/CartScreen';
import { CheckoutDetailsScreen } from '../screens/CheckoutDetailsScreen';
import { useTheme } from '../theme';
import { MainTabNavigator } from './MainTabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function CustomerStackNavigator() {
  const { theme } = useTheme();

  console.log('[CustomerStackNavigator] render');

  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'fade_from_bottom',
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        headerShown: false,
      }}
    >
      <Stack.Screen name={ROOT_ROUTES.MAIN_TABS} component={MainTabNavigator} />
      <Stack.Screen name={ROOT_ROUTES.CART} component={CartScreen} />
      <Stack.Screen
        name={ROOT_ROUTES.CHECKOUT_DETAILS}
        component={CheckoutDetailsScreen}
      />
    </Stack.Navigator>
  );
}
