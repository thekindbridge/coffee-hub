import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DELIVERY_ROUTES } from '../constants/routes';
import { DeliveryActiveOrdersScreen } from '../screens/DeliveryActiveOrdersScreen';
import { DeliveryStatusUpdateScreen } from '../screens/DeliveryStatusUpdateScreen';
import { DeliveryTrackingScreen } from '../screens/DeliveryTrackingScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useTheme } from '../theme';
import type { DeliveryStackParamList } from './types';

const Stack = createNativeStackNavigator<DeliveryStackParamList>();

export function DeliveryStackNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'fade_from_bottom',
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          color: theme.colors.text,
          fontWeight: '800',
        },
      }}
    >
      <Stack.Screen
        name={DELIVERY_ROUTES.ACTIVE_ORDERS}
        component={DeliveryActiveOrdersScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={DELIVERY_ROUTES.TRACKING}
        component={DeliveryTrackingScreen}
        options={{ title: 'Delivery Tracking' }}
      />
      <Stack.Screen
        name={DELIVERY_ROUTES.STATUS_UPDATE}
        component={DeliveryStatusUpdateScreen}
        options={{ title: 'Status Update' }}
      />
      <Stack.Screen
        name={DELIVERY_ROUTES.PROFILE}
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
