import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { getThemeByMode, type AppTheme, type ThemeMode } from './tokens';

const THEME_STORAGE_KEY = 'coffee-hub-theme-mode';
const LOCKED_THEME_MODE: ThemeMode = 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  theme: AppTheme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>(LOCKED_THEME_MODE);

  const setThemeMode = useCallback((_nextMode: ThemeMode) => {
    setMode(LOCKED_THEME_MODE);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, LOCKED_THEME_MODE).catch(() => undefined);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(LOCKED_THEME_MODE);
  }, [setThemeMode]);

  useEffect(() => {
    void AsyncStorage.setItem(THEME_STORAGE_KEY, LOCKED_THEME_MODE).catch(() => undefined);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    setThemeMode,
    theme: getThemeByMode(LOCKED_THEME_MODE),
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
