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
  image_url?: string;
  description?: string;
  is_veg?: boolean;
  rating?: number;
  spice_level?: number;
  quantity: number;
};

type CartContextValue = {
  addItem: (item: Omit<CartItem, 'quantity'>, delta?: number) => void;
  cartQuantityById: Map<string, number>;
  clearCart: () => void;
  itemCount: number;
  items: CartItem[];
  removeItem: (itemId: string) => void;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, delta = 1) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(currentItem => currentItem.id === item.id);
      const nextQuantity = (existingItem?.quantity ?? 0) + delta;

      if (nextQuantity <= 0) {
        return currentItems.filter(currentItem => currentItem.id !== item.id);
      }

      if (!existingItem) {
        return [...currentItems, { ...item, quantity: nextQuantity }];
      }

      return currentItems.map(currentItem =>
        currentItem.id === item.id
          ? { ...currentItem, ...item, quantity: nextQuantity }
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
      cartQuantityById: new Map(items.map(item => [item.id, item.quantity])),
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
