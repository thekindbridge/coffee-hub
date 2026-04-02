import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { AuthState } from '../../hooks/useAuth';
import { useCheckoutFlow } from '../../hooks/useCheckoutFlow';
import { useOffers } from '../../hooks/useOffers';
import type { Order } from '../../types';
import { useProfileData } from '../../features/profile/hooks/useProfileData';
import { getCurrentAuthUser } from '../../services/auth/authService';
import { toAppServiceError } from '../../services/serviceError';
import { DEFAULT_SHOP_TIMING } from '../../utils/shopTiming';

type CartContextValue = ReturnType<typeof useCheckoutFlow> & {
  authError: string;
  isAuthReady: boolean;
  refreshAuthSession: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

type CartProviderProps = PropsWithChildren<{
  auth: AuthState;
}>;

export function CartProvider({ auth, children }: CartProviderProps) {
  const offersState = useOffers();
  const { profile } = useProfileData();
  const [authError, setAuthError] = useState('');
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  const refreshAuthSession = useCallback(async () => {
    try {
      setAuthError('');
      const user = getCurrentAuthUser();
      if (!user) {
        return;
      }

      await user.getIdToken(true);
    } catch (error) {
      const typedError = toAppServiceError(
        error,
        'Unable to refresh your secure session right now.',
        'network',
      );
      setAuthError(typedError.message);
    }
  }, []);

  useEffect(() => {
    if (auth.currentUserId) {
      void refreshAuthSession();
    } else {
      setAuthError('');
    }
  }, [auth.currentUserId, refreshAuthSession]);

  const checkout = useCheckoutFlow({
    currentUserId: auth.currentUserId,
    profileSaved: profile,
    shopTiming: DEFAULT_SHOP_TIMING,
    findActiveOfferByCode: offersState.findActiveOfferByCode,
    onOrderPlaced: nextOrder => {
      setPlacedOrder(nextOrder);
    },
  });

  const value = useMemo<CartContextValue>(() => ({
    ...checkout,
    placedOrder,
    setPlacedOrder,
    authError,
    isAuthReady: auth.isAuthReady,
    refreshAuthSession,
  }), [
    auth.isAuthReady,
    authError,
    checkout,
    placedOrder,
    refreshAuthSession,
  ]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export const useCartState = () => {
  const value = useContext(CartContext);

  if (!value) {
    throw new Error('useCartState must be used within CartProvider.');
  }

  return value;
};
