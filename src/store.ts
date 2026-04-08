import { create } from 'zustand';

interface AuthState {
  user: { id: number; username: string } | null;
  token: string | null;
  login: (user: { id: number; username: string }, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  login: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
}));

interface AppState {
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  setTheme: (theme: 'light' | 'dark') => void;
  setLang: (lang: 'zh' | 'en') => void;
}

export const useAppStore = create<AppState>((set) => {
  const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  const savedLang = (localStorage.getItem('lang') as 'zh' | 'en') || 'zh';
  
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  return {
    theme: savedTheme,
    lang: savedLang,
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
  };
});
