import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import {
  applyAppThemeToDocument,
  persistAppTheme,
  readStoredAppTheme,
  type AppTheme,
} from './theme';

type ThemeContextValue = {
  isDarkTheme: boolean;
  setTheme: (theme: AppTheme) => void;
  theme: AppTheme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const [theme, setTheme] = useState<AppTheme>(() => readStoredAppTheme());

  useEffect(() => {
    applyAppThemeToDocument(theme);
    persistAppTheme(theme);
  }, [theme]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      isDarkTheme: theme === 'dark',
      setTheme,
      theme,
      toggleTheme: () => {
        setTheme(currentTheme => (currentTheme === 'dark' ? 'light' : 'dark'));
      },
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider.');
  }

  return context;
};
