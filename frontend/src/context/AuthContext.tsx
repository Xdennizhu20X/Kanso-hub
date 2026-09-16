'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';

interface Category {
  key: string;
  label: string;
  color: string;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  emailNotifications: boolean;
  pushNotifications: boolean;
  dailySummaryTime: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  githubUsername?: string | null;
  telegramChatId?: string | null;
  categories?: Record<string, Category>;
  preferences?: UserPreferences;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  updatePreferences: (preferences: Partial<UserPreferences>, extra?: { githubUsername?: string | null }) => Promise<void>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Apply theme to document
  const applyTheme = (theme?: 'dark' | 'light') => {
    if (typeof document === 'undefined') return;
    const activeTheme = theme || localStorage.getItem('lifeos_theme') || 'dark';
    if (activeTheme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  };

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.get<User>('/api/auth/me')
        .then(u => {
          setUser(u);
          if (u.preferences?.theme) {
            applyTheme(u.preferences.theme);
          }
        })
        .catch(() => {
          api.setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      applyTheme();
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/api/auth/login', { email, password });
    api.setToken(res.token);
    setUser(res.user);
    if (res.user.preferences?.theme) {
      applyTheme(res.user.preferences.theme);
    }
  };

  const register = async (email: string, name: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/api/auth/register', { email, name, password });
    api.setToken(res.token);
    setUser(res.user);
    if (res.user.preferences?.theme) {
      applyTheme(res.user.preferences.theme);
    }
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  const updatePreferences = async (prefs: Partial<UserPreferences>, extra?: { githubUsername?: string | null }) => {
    if (!user) return;
    const updatedPreferences = {
      ...(user.preferences || {
        theme: 'dark' as const,
        emailNotifications: true,
        pushNotifications: true,
        dailySummaryTime: '20:00',
      }),
      ...prefs,
    };
    const updatedUser = {
      ...user,
      preferences: updatedPreferences,
      ...(extra && extra.githubUsername !== undefined ? { githubUsername: extra.githubUsername } : {}),
    };
    setUser(updatedUser);
    if (prefs.theme) {
      applyTheme(prefs.theme);
      localStorage.setItem('lifeos_theme', prefs.theme);
    }
    try {
      await api.put('/api/auth/preferences', { preferences: prefs, ...(extra || {}) });
    } catch (e) {
      console.error('Failed to sync preferences:', e);
    }
  };


  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updatePreferences }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
