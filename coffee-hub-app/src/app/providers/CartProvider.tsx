import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { AuthState } from '../../hooks/useAuth';
import { useCheckoutFlow } from '../../hooks/useCheckoutFlow';
import { useShopTiming } from '../../hooks/useShopTiming';
import { useOffers } from '../../hooks/useOffers';
import type { Order } from '../../types';
import { useProfileData } from '../../features/profile/hooks/useProfileData';

type CartContextValue = ReturnType<typeof useCheckoutFlow> & {
  authError: string;
  isAuthReady: boolean;
  isShopTimingLoading: boolean;
  refreshAuthState: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

type CartProviderProps = PropsWithChildren<{
  auth: AuthState;
}>;

export function CartProvider({ auth, children }: CartProviderProps) {
  const offersState = useOffers();
  const { profile } = useProfileData();
  const shopTiming = useShopTiming();
  const [authError, setAuthError] = useState('');
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  const refreshAuthState = useCallback(async () => {
    if (!auth.user?.email) {
      setAuthError('User not found.');
      return;
    }

    console.log('User:', auth.user);
    setAuthError('');
  }, [auth.user]);

  const checkout = useCheckoutFlow({
    currentUserId: auth.currentUserId,
    currentTimeInMinutes: shopTiming.currentTime,
    isShopTimingLoading: shopTiming.isLoading,
    profileSaved: profile,
    refreshShopTiming: shopTiming.refreshShopTiming,
    shopTiming: shopTiming.shopTiming,
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
    isShopTimingLoading: shopTiming.isLoading,
    isAuthReady: auth.isAuthReady,
    refreshAuthState,
  }), [
    auth.isAuthReady,
    authError,
    checkout,
    placedOrder,
    shopTiming.isLoading,
    refreshAuthState,
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
