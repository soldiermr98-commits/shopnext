import { create } from 'zustand';

export interface ThemeColors {
  primary: string;
  primaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  tertiary: string;
  tertiaryContainer: string;
  background: string;
  surface: string;
  borderRadius: string; // e.g. "0.75rem"
}

export const DEFAULT_THEME: ThemeColors = {
  primary: '#00236f',
  primaryContainer: '#1e3a8a',
  secondary: '#b61722',
  secondaryContainer: '#da3437',
  tertiary: '#00311f',
  tertiaryContainer: '#004a31',
  background: '#f8f9ff',
  surface: '#f8f9ff',
  borderRadius: '0.75rem',
};

interface ThemeStore {
  isDarkMode: boolean;
  colors: ThemeColors;
  draftColors: ThemeColors;
  toggleDarkMode: () => void;
  setDraftColor: <K extends keyof ThemeColors>(key: K, value: ThemeColors[K]) => void;
  applyLivePreview: () => void;
  publishTheme: () => void;
  revertTheme: () => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  isDarkMode: typeof window !== 'undefined' ? localStorage.getItem('digistyle_dark') === 'true' : false,
  colors: DEFAULT_THEME,
  draftColors: DEFAULT_THEME,

  toggleDarkMode: () => {
    const nextDark = !get().isDarkMode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('digistyle_dark', String(nextDark));
      if (nextDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }
    set({ isDarkMode: nextDark });
  },

  setDraftColor: (key, value) => {
    set((state) => ({
      draftColors: { ...state.draftColors, [key]: value },
    }));
    get().applyLivePreview();
  },

  applyLivePreview: () => {
    if (typeof window === 'undefined') return;
    const { draftColors } = get();
    const root = document.documentElement;
    root.style.setProperty('--primary', draftColors.primary);
    root.style.setProperty('--primary-container', draftColors.primaryContainer);
    root.style.setProperty('--secondary', draftColors.secondary);
    root.style.setProperty('--secondary-container', draftColors.secondaryContainer);
    root.style.setProperty('--tertiary', draftColors.tertiary);
    root.style.setProperty('--tertiary-container', draftColors.tertiaryContainer);
  },

  publishTheme: () => {
    const { draftColors } = get();
    localStorage.setItem('digistyle_custom_theme', JSON.stringify(draftColors));
    set({ colors: draftColors });
    get().applyLivePreview();
  },

  revertTheme: () => {
    const { colors } = get();
    set({ draftColors: colors });
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-container', colors.primaryContainer);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--secondary-container', colors.secondaryContainer);
    root.style.setProperty('--tertiary', colors.tertiary);
    root.style.setProperty('--tertiary-container', colors.tertiaryContainer);
  },

  initTheme: () => {
    if (typeof window === 'undefined') return;
    const isDark = localStorage.getItem('digistyle_dark') === 'true';
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    set({ isDarkMode: isDark });

    const saved = localStorage.getItem('digistyle_custom_theme');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        set({ colors: parsed, draftColors: parsed });
        get().applyLivePreview();
      } catch {
        // use default
      }
    }
  },
}));
