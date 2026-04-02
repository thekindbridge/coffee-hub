import { useMemo } from 'react';
import { useTheme } from './useTheme';
import type { AppTheme } from './tokens';

export function useThemedStyles<T>(factory: (theme: AppTheme) => T) {
  const { theme } = useTheme();

  return useMemo(() => factory(theme), [theme]);
}
