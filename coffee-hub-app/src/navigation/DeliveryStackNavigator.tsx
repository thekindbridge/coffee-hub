import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DELIVERY_ROUTES } from '../constants/routes';
import { DeliveryOrderDetailsScreen } from '../screens/delivery/DeliveryOrderDetailsScreen';
import { useTheme } from '../theme';
import { DeliveryTabNavigator } from './DeliveryTabNavigator';
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
        name={DELIVERY_ROUTES.TABS}
        component={DeliveryTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={DELIVERY_ROUTES.ORDER_DETAILS}
        component={DeliveryOrderDetailsScreen}
        options={{ title: 'Order details' }}
      />
    </Stack.Navigator>
  );
}
