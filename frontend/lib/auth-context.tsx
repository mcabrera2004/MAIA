"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { UserRole, Session } from "./api/types";

interface AuthState {
  userToken: string | null;
  userRole: UserRole | null;
  userEmail: string | null;
  sessions: Record<string, { sessionId: string; sessionToken: string }>;
}

interface AuthContextValue extends AuthState {
  setUser: (token: string, role: UserRole, email: string) => void;
  setSession: (subject: string, sessionId: string, sessionToken: string) => void;
  getSessionToken: (subject: string) => string | null;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_STORAGE_KEY = "edu_ai_auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    userToken: null,
    userRole: null,
    userEmail: null,
    sessions: {},
  });
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState(parsed);
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isHydrated]);

  const setUser = useCallback((token: string, role: UserRole, email: string) => {
    setState((prev) => ({
      ...prev,
      userToken: token,
      userRole: role,
      userEmail: email,
    }));
  }, []);

  const setSession = useCallback((subject: string, sessionId: string, sessionToken: string) => {
    setState((prev) => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [subject]: { sessionId, sessionToken },
      },
    }));
  }, []);

  const getSessionToken = useCallback(
    (subject: string) => {
      return state.sessions[subject]?.sessionToken || null;
    },
    [state.sessions]
  );

  const logout = useCallback(() => {
    setState({
      userToken: null,
      userRole: null,
      userEmail: null,
      sessions: {},
    });
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  // Don't render children until hydrated to avoid hydration mismatch
  if (!isHydrated) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        setUser,
        setSession,
        getSessionToken,
        logout,
        isAuthenticated: !!state.userToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
