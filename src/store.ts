import { create } from 'zustand';

interface AuthState {
  user: { id: number; username: string; role: string; email?: string; is_paid?: number | boolean } | null;
  token: string | null;
  favoriteIds: number[];
  unreadCount: number;
  login: (user: { id: number; username: string; role: string; email?: string; is_paid?: number | boolean }, token: string) => void;
  logout: () => void;
  setFavoriteIds: (ids: number[]) => void;
  toggleFavoriteId: (id: number) => void;
  setUnreadCount: (count: number) => void;
  setUser: (user: { id: number; username: string; role: string; email?: string; is_paid?: number | boolean }) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  favoriteIds: [],
  unreadCount: 0,
  login: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null, favoriteIds: [], unreadCount: 0 });
  },
  setFavoriteIds: (ids) => set({ favoriteIds: ids }),
  toggleFavoriteId: (id) => set((state) => ({
    favoriteIds: state.favoriteIds.includes(id)
      ? state.favoriteIds.filter(fid => fid !== id)
      : [...state.favoriteIds, id]
  })),
  setUnreadCount: (count) => set({ unreadCount: count }),
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
}));

export type AIProvider = "gemini" | "openai" | "qwen" | "custom";

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

interface AppState {
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  aiConfig: AIConfig;
  setTheme: (theme: 'light' | 'dark') => void;
  setLang: (lang: 'zh' | 'en') => void;
  setAIConfig: (config: AIConfig) => void;
}

export const useAppStore = create<AppState>((set) => {
  const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  const savedLang = (localStorage.getItem('lang') as 'zh' | 'en') || 'zh';
  const savedAIConfig = JSON.parse(localStorage.getItem('aiConfig') || '{"provider": "gemini"}');
  
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  return {
    theme: savedTheme,
    lang: savedLang,
    aiConfig: savedAIConfig,
    setTheme: (theme) => {
      localStorage.setItem('theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      set({ theme });
    },
    setLang: (lang) => {
      localStorage.setItem('lang', lang);
      set({ lang });
    },
    setAIConfig: (aiConfig) => {
      localStorage.setItem('aiConfig', JSON.stringify(aiConfig));
      set({ aiConfig });
    },
  };
});
