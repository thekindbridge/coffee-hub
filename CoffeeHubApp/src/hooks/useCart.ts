import { useCartStore } from '../store/CartStore';

export function useCart() {
  return useCartStore();
}
