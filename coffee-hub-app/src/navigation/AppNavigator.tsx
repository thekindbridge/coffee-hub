import { useEffect } from 'react';
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

  useEffect(() => {
    console.log('USER STATE:', auth.user);
  }, [auth.user]);

  console.log('[AppNavigator] decision check:', {
    authError: auth.authError,
    isAuthReady: auth.isAuthReady,
    user: auth.user,
  });

  if (!auth.isAuthReady) {
    console.log('[AppNavigator] -> loading-screen');
    return (
      <RoleLoadingScreen
        subtitle="Checking for a saved Coffee Hub email login."
        title="Preparing your workspace"
      />
    );
  }

  if (!auth.user) {
    console.log('[AppNavigator] -> login-screen');
    console.log('\u27A1\uFE0F login-screen');
    return <DummyLoginScreen errorMessage={auth.authError} />;
  }

  const isAdmin = auth.user.role === 'admin';
  const isAgent = auth.user.role === 'agent';
  const isCustomer = auth.user.role === 'customer';

  console.log('[AppNavigator] -> authenticated-stack', {
    isAdmin,
    isAgent,
    isCustomer,
  });
  console.log('\u27A1\uFE0F authenticated-stack');

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
