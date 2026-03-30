import type { PropsWithChildren } from 'react';
import { CartProvider } from './CartProvider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <CartProvider>
      {children}
    </CartProvider>
  );
}
