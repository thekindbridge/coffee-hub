import {
  NavigationContainer,
  useNavigationContainerRef,
  type ParamListBase,
} from '@react-navigation/native';
import { AppProviders } from '../app/providers/AppProviders';
import { DummyLoginScreen } from '../auth/screens/DummyLoginScreen';
import { ROOT_ROUTES, TAB_ROUTES } from '../constants/routes';
import { ProfileCompletionPrompt } from '../features/profile/components/ProfileCompletionPrompt';
import { useAuth } from '../hooks/useAuth';
import { AdminStackNavigator } from './AdminStackNavigator';
import { CustomerStackNavigator } from './CustomerStackNavigator';
import { DeliveryStackNavigator } from './DeliveryStackNavigator';
import { RoleLoadingScreen } from '../screens/RoleLoadingScreen';
import { useTheme } from '../theme';

export function AppNavigator() {
  const navigationRef = useNavigationContainerRef<ParamListBase>();
  const { theme } = useTheme();
  const auth = useAuth();

  if (!auth.isAuthReady) {
    return (
      <RoleLoadingScreen
        subtitle="Checking for a saved COFFEE-HUB email login."
        title="Preparing your workspace"
      />
    );
  }

  if (!auth.user) {
    return <DummyLoginScreen errorMessage={auth.authError} />;
  }

  const isAdmin = auth.user.role === 'admin';
  const isAgent = auth.user.role === 'agent';
  const isCustomer = auth.user.role === 'customer';

  return (
    <AppProviders auth={auth}>
      <>
        <NavigationContainer ref={navigationRef} theme={theme.navigationTheme}>
          {isAdmin ? (
            <AdminStackNavigator />
          ) : isAgent ? (
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
    </AppProviders>
  );
}
