import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type CartContextValue = {
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  clearCart: () => void;
  itemCount: number;
  items: CartItem[];
  removeItem: (itemId: string) => void;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(currentItem => currentItem.id === item.id);

      if (!existingItem) {
        return [...currentItems, { ...item, quantity: 1 }];
      }

      return currentItems.map(currentItem =>
        currentItem.id === item.id
          ? { ...currentItem, quantity: currentItem.quantity + 1 }
          : currentItem,
      );
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems(currentItems => currentItems.filter(item => item.id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo(
    () => ({
      addItem,
      clearCart,
      itemCount: items.reduce((count, item) => count + item.quantity, 0),
      items,
      removeItem,
      subtotal: items.reduce((total, item) => total + item.price * item.quantity, 0),
    }),
    [addItem, clearCart, items, removeItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCartStore() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCartStore must be used within a CartProvider.');
  }

  return context;
}
