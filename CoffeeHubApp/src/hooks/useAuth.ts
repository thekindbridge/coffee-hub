import { useAuthStore } from '../store/AuthStore';

export function useAuth() {
  return useAuthStore();
}
