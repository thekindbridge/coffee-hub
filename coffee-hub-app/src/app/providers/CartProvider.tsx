import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { CustomerProfile, Order } from '../../types';
import { useCheckoutFlow } from '../../hooks/useCheckoutFlow';
import { useOffers } from '../../hooks/useOffers';
import {
  getCurrentAuthUser,
  subscribeToAuthSession,
} from '../../services/auth/authService';
import { toAppServiceError } from '../../services/serviceError';
import { DEFAULT_SHOP_TIMING } from '../../utils/shopTiming';

type CartContextValue = ReturnType<typeof useCheckoutFlow> & {
  authError: string;
  isAuthReady: boolean;
  refreshAuthSession: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

const DEFAULT_PROFILE: CustomerProfile = {
  name: '',
  phone: '',
  email: '',
  addresses: [],
  notificationSettings: {
    orderUpdates: true,
    offers: false,
  },
};

export function CartProvider({ children }: PropsWithChildren) {
  const offersState = useOffers();
  const [currentUserId, setCurrentUserId] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  const refreshAuthSession = useCallback(async () => {
    try {
      setAuthError('');
      const user = getCurrentAuthUser();
      if (!user) {
        setCurrentUserId('');
        setIsAuthReady(true);
        return;
      }

      await user.getIdToken(true);
      setCurrentUserId(user.uid);
      setIsAuthReady(true);
    } catch (error) {
      const typedError = toAppServiceError(
        error,
        'Unable to refresh your secure session right now.',
        'network',
      );
      setAuthError(typedError.message);
      setIsAuthReady(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthSession(snapshot => {
      setCurrentUserId(snapshot.currentUserId);
      setIsAuthReady(true);
      setAuthError('');
    });

    void refreshAuthSession();

    return () => {
      unsubscribe();
    };
  }, [refreshAuthSession]);

  const checkout = useCheckoutFlow({
    currentUserId,
    profileSaved: DEFAULT_PROFILE,
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
    isAuthReady,
    refreshAuthSession,
  }), [
    authError,
    checkout,
    isAuthReady,
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
