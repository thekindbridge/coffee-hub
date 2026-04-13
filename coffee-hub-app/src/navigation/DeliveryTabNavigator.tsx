import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DeliveryBottomTabs } from '../components/delivery/DeliveryBottomTabs';
import { DELIVERY_ROUTES } from '../constants/routes';
import { DeliveryDashboardScreen } from '../screens/delivery/DeliveryDashboardScreen';
import { DeliveryEarningsScreen } from '../screens/delivery/DeliveryEarningsScreen';
import { DeliveryMapTrackingScreen } from '../screens/delivery/DeliveryMapTrackingScreen';
import { DeliveryOrdersScreen } from '../screens/delivery/DeliveryOrdersScreen';
import { DeliveryProfileScreen } from '../screens/delivery/DeliveryProfileScreen';
import { useTheme } from '../theme';
import type { DeliveryTabParamList } from './types';

const Tab = createBottomTabNavigator<DeliveryTabParamList>();

export function DeliveryTabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
      tabBar={props => <DeliveryBottomTabs {...props} />}
    >
      <Tab.Screen
        name={DELIVERY_ROUTES.DASHBOARD}
        component={DeliveryDashboardScreen}
      />
      <Tab.Screen
        name={DELIVERY_ROUTES.MAP}
        component={DeliveryMapTrackingScreen}
      />
      <Tab.Screen
        name={DELIVERY_ROUTES.ORDERS}
        component={DeliveryOrdersScreen}
      />
      <Tab.Screen
        name={DELIVERY_ROUTES.EARNINGS}
        component={DeliveryEarningsScreen}
      />
      <Tab.Screen
        name={DELIVERY_ROUTES.PROFILE}
        component={DeliveryProfileScreen}
      />
    </Tab.Navigator>
  );
}
