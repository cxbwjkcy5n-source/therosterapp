import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, DARK_COLORS } from '@/constants/Colors';
import { apiGet, apiPut } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

type ColorScheme = typeof COLORS;

interface ThemeContextValue {
  colors: ColorScheme;
  isDark: boolean;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: COLORS,
  isDark: false,
  toggleDark: () => {},
});

const STORAGE_KEY = 'app_dark_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Load from AsyncStorage first (fast), then sync from API
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val === 'true') {
          console.log('[Theme] Loaded dark mode from AsyncStorage: true');
          setIsDark(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;

    apiGet<{ notifications_enabled: boolean; dark_mode_enabled: boolean }>('/api/preferences')
      .then((prefs) => {
        const dark = prefs?.dark_mode_enabled ?? false;
        console.log('[Theme] Loaded dark mode from API:', dark);
        setIsDark(dark);
        AsyncStorage.setItem(STORAGE_KEY, String(dark)).catch(() => {});
      })
      .catch((e) => {
        console.log('[Theme] Could not load preferences from API (non-fatal):', e?.message);
      });
  }, [user]);

  const toggleDark = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      console.log('[Theme] Dark mode toggled to:', next);
      AsyncStorage.setItem(STORAGE_KEY, String(next)).catch(() => {});
      apiPut('/api/preferences', { dark_mode_enabled: next }).catch((e: any) =>
        console.error('[Theme] Failed to save dark mode pref:', e)
      );
      return next;
    });
  }, []);

  const colors = isDark ? DARK_COLORS : COLORS;

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
