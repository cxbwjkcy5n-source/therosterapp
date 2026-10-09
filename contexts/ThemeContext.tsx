import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, DARK_COLORS } from '@/constants/Colors';
import { apiGet, apiPut, apiPatch } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

type ColorScheme = typeof COLORS;

interface ThemeContextValue {
  colors: ColorScheme;
  isDark: boolean;
  oledMode: boolean;
  toggleDark: () => void;
  setOledMode: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: COLORS,
  isDark: false,
  oledMode: false,
  toggleDark: () => {},
  setOledMode: () => {},
});

const STORAGE_KEY = 'app_dark_mode';
const OLED_STORAGE_KEY = 'app_oled_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [oledMode, setOledModeState] = useState(false);
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
    AsyncStorage.getItem(OLED_STORAGE_KEY)
      .then((val) => {
        if (val === 'true') {
          console.log('[Theme] Loaded OLED mode from AsyncStorage: true');
          setOledModeState(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;

    apiGet<{ notifications_enabled: boolean; dark_mode_enabled: boolean; oled_mode?: boolean }>('/api/preferences')
      .then((prefs) => {
        const dark = prefs?.dark_mode_enabled ?? false;
        const oled = prefs?.oled_mode ?? false;
        console.log('[Theme] Loaded dark mode from API:', dark, 'OLED:', oled);
        setIsDark(dark);
        setOledModeState(oled);
        AsyncStorage.setItem(STORAGE_KEY, String(dark)).catch(() => {});
        AsyncStorage.setItem(OLED_STORAGE_KEY, String(oled)).catch(() => {});
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
      // If turning off dark mode, also turn off OLED
      if (!next) {
        setOledModeState(false);
        AsyncStorage.setItem(OLED_STORAGE_KEY, 'false').catch(() => {});
        apiPatch('/api/user/preferences', { oled_mode: false }).catch(() => {});
      }
      return next;
    });
  }, []);

  const setOledMode = useCallback((enabled: boolean) => {
    console.log('[Theme] OLED mode set to:', enabled);
    setOledModeState(enabled);
    AsyncStorage.setItem(OLED_STORAGE_KEY, String(enabled)).catch(() => {});
    apiPatch('/api/user/preferences', { oled_mode: enabled }).catch((e: any) =>
      console.error('[Theme] Failed to save OLED mode pref:', e)
    );
  }, []);

  let colors: ColorScheme;
  if (isDark && oledMode) {
    colors = {
      ...DARK_COLORS,
      background: '#000000',
      surface: '#0A0A0A',
      surfaceSecondary: '#111111',
    };
  } else {
    colors = isDark ? DARK_COLORS : COLORS;
  }

  return (
    <ThemeContext.Provider value={{ colors, isDark, oledMode, toggleDark, setOledMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
