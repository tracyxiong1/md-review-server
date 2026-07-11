import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

const THEME_CHANGE_EVENT = 'md-review-theme-change';

const getSystemTheme = (): 'light' | 'dark' => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

const getEffectiveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
};

export const useDarkMode = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage for user preference
    const savedTheme = localStorage.getItem('md-review-theme') as Theme | null;
    // If no saved preference, use system
    return savedTheme || 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    const effectiveTheme = getEffectiveTheme(theme);

    if (effectiveTheme === 'dark') {
      root.classList.add('dark-mode');
    } else {
      root.classList.remove('dark-mode');
    }
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      setTheme((event as CustomEvent<Theme>).detail);
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  }, []);

  // Listen to system theme changes when theme is set to 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = document.documentElement;
      const effectiveTheme = getSystemTheme();

      if (effectiveTheme === 'dark') {
        root.classList.add('dark-mode');
      } else {
        root.classList.remove('dark-mode');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const currentEffective = getEffectiveTheme(prevTheme);
      const newTheme = currentEffective === 'light' ? 'dark' : 'light';

      // Save user's explicit choice to localStorage
      localStorage.setItem('md-review-theme', newTheme);
      window.dispatchEvent(new CustomEvent<Theme>(THEME_CHANGE_EVENT, { detail: newTheme }));
      return newTheme;
    });
  };

  const resetToSystem = () => {
    // Remove from localStorage to go back to system preference
    localStorage.removeItem('md-review-theme');
    window.dispatchEvent(new CustomEvent<Theme>(THEME_CHANGE_EVENT, { detail: 'system' }));
    setTheme('system');
  };

  const effectiveTheme = getEffectiveTheme(theme);

  return {
    theme,
    effectiveTheme,
    toggleTheme,
    resetToSystem,
    isDark: effectiveTheme === 'dark',
    isSystem: theme === 'system',
  };
};
