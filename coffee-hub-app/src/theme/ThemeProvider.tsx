import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import {
  createContext,
  useCallback,
  useEffect,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { getThemeByMode, type AppTheme, type ThemeMode } from './tokens';

const THEME_STORAGE_KEY = 'coffee-hub-theme-mode';

type ThemeContextValue = {
  mode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  theme: AppTheme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getInitialThemeMode = (): ThemeMode => (
  Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>(getInitialThemeMode);

  const setThemeMode = useCallback((nextMode: ThemeMode) => {
    setMode(nextMode);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch(() => {
      console.warn('Failed to persist theme mode.');
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setThemeMode]);

  useEffect(() => {
    void AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(storedMode => {
        if (storedMode === 'light' || storedMode === 'dark') {
          setMode(storedMode);
        }
      })
      .catch(() => {
        console.warn('Failed to restore theme mode.');
      });
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    setThemeMode,
    theme: getThemeByMode(mode),
    toggleTheme,
  }), [mode, setThemeMode, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeContext = () => {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error('useThemeContext must be used within ThemeProvider.');
  }

  return value;
};
