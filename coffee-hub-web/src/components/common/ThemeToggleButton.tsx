import { Moon, SunMedium } from 'lucide-react';
import { useTheme } from '../../features/theme/ThemeProvider';

export const ThemeToggleButton = () => {
  const { isDarkTheme, toggleTheme } = useTheme();
  const Icon = isDarkTheme ? SunMedium : Moon;
  const label = isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="coffee-icon-btn"
      aria-label={label}
      title={label}
    >
      <Icon size={18} />
    </button>
  );
};
