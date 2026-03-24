import type { PropsWithChildren } from 'react';

import { AuthProvider } from './AuthStore';
import { CartProvider } from './CartStore';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  );
}
