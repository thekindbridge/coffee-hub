import {
  NavigationContainer,
  useNavigationContainerRef,
  type ParamListBase,
} from '@react-navigation/native';
import { ROOT_ROUTES, TAB_ROUTES } from '../constants/routes';
import { ProfileCompletionPrompt } from '../features/profile/components/ProfileCompletionPrompt';
import { useUserRole } from '../features/roles/hooks/useUserRole';
import { AdminStackNavigator } from './AdminStackNavigator';
import { CustomerStackNavigator } from './CustomerStackNavigator';
import { DeliveryStackNavigator } from './DeliveryStackNavigator';
import { RoleLoadingScreen } from '../screens/RoleLoadingScreen';
import { useTheme } from '../theme';

export function AppNavigator() {
  const navigationRef = useNavigationContainerRef<ParamListBase>();
  const { theme } = useTheme();
  const {
    isAdmin,
    isCustomer,
    isDelivery,
    loading,
  } = useUserRole();

  if (loading) {
    return <RoleLoadingScreen />;
  }

  return (
    <>
      <NavigationContainer ref={navigationRef} theme={theme.navigationTheme}>
        {isAdmin ? (
          <AdminStackNavigator />
        ) : isDelivery ? (
          <DeliveryStackNavigator />
        ) : (
          <CustomerStackNavigator />
        )}
      </NavigationContainer>

      {isCustomer ? (
        <ProfileCompletionPrompt
          onCompleteNow={() => {
            if (!navigationRef.isReady()) {
              return;
            }

            navigationRef.navigate(ROOT_ROUTES.MAIN_TABS, {
              params: {
                openEdit: true,
              },
              screen: TAB_ROUTES.PROFILE,
            });
          }}
        />
      ) : null}
    </>
  );
}
