"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { unwrap } from "@/api/client-service";
import { setAuthToken } from "@/api/config";
import {
  login as loginSdk,
  logout as logoutSdk,
  me as meSdk,
  register as registerSdk,
} from "@/api/openapi-client";
import { client } from "@/api/openapi-client/client.gen";
import type { UserCreate, UserRead } from "@/api/openapi-client";
import {
  getItem,
  getJSON,
  removeItem,
  setItem,
  setJSON,
  STORAGE_KEYS,
} from "@/lib/storage";

interface AuthContextType {
  user: UserRead | null;
  login: (email: string, password: string) => Promise<UserRead>;
  signup: (input: UserCreate) => Promise<UserRead>;
  googleLogin: (credential: string) => Promise<UserRead>;
  setPassword: (password: string) => Promise<void>;
  getAuthProviders: () => Promise<{
    providers: Array<{
      id: string;
      user_id: string;
      provider: "password" | "google";
      provider_user_id: string | null;
    }>;
    has_password: boolean;
  }>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  requestVerification: (email: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const readStoredUser = (): UserRead | null => {
  if (typeof window === "undefined") return null;
  return getJSON<UserRead>(STORAGE_KEYS.AUTH_USER);
};

const persistSession = (
  user: UserRead,
  token: string,
  refresh_token: string
) => {
  try {
    setJSON(STORAGE_KEYS.AUTH_USER, user);
    setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    setItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN, refresh_token);
  } catch {
    //ignore
  }
};

const clearSession = () => {
  removeItem(STORAGE_KEYS.AUTH_USER);
  removeItem(STORAGE_KEYS.AUTH_TOKEN);
  removeItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const storedToken = getItem(STORAGE_KEYS.AUTH_TOKEN);
      const storedRefreshToken = getItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN);

      if (!storedToken || !storedRefreshToken) {
        clearSession();

        if (active) {
          setUser(null);
          setToken(null);
          setRefreshToken(null);
          setIsLoading(false);
        }

        return;
      }

      const storedUser = readStoredUser();
      if (storedUser) setUser(storedUser);

      try {
        setAuthToken(storedToken);

        const current = await unwrap(meSdk());
        if (!active) return;

        setUser(current);
        setToken(storedToken);
        setRefreshToken(storedRefreshToken);
        persistSession(current, storedToken, storedRefreshToken);
      } catch {
        clearSession();
        if (active) {
          setUser(null);
          setToken(null);
          setRefreshToken(null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const afterLogin = async (
    tokenData: { access_token: string; refresh_token: string }
  ): Promise<UserRead> => {
    if (!tokenData.access_token || !tokenData.refresh_token)
      throw new Error("Login failed");

    setAuthToken(tokenData.access_token);

    const current = await unwrap(meSdk());
    if (!current) throw new Error("Failed to retrieve user profile");

    setUser(current);
    setToken(tokenData.access_token);
    setRefreshToken(tokenData.refresh_token);
    persistSession(current, tokenData.access_token, tokenData.refresh_token);

    return current;
  };

  const login = async (email: string, password: string) => {
    const tokenData = await unwrap(
      loginSdk({ body: { username: email, password } })
    );
    return afterLogin(tokenData);
  };

  const googleLogin = async (credential: string) => {
    const response = await client.post({
      url: "/api/auth/google",
      body: { credential },
      headers: { "Content-Type": "application/json" },
    }) as unknown as { data: { data: { access_token: string; refresh_token: string } } };

    const tokenData = response.data?.data;
    if (!tokenData?.access_token || !tokenData?.refresh_token) {
      throw new Error("Google login failed");
    }

    return afterLogin(tokenData);
  };

  const setPassword = async (password: string) => {
    const response = await client.post({
      url: "/api/auth/set-password",
      body: { password },
    }) as unknown as { data: { success: boolean; message?: string } };

    if (!response.data?.success) {
      throw new Error(response.data?.message ?? "Failed to set password");
    }
  };

  const getAuthProviders = async () => {
    const response = await client.get({
      url: "/api/auth/providers",
    }) as unknown as {
      data: {
        data: {
          providers: Array<{
            id: string;
            user_id: string;
            provider: "password" | "google";
            provider_user_id: string | null;
          }>;
          has_password: boolean;
        };
      };
    };

    return (
      response.data?.data ?? { providers: [], has_password: false }
    );
  };

  const forgotPassword = async (email: string) => {
    const response = await client.post({
      url: "/api/auth/forgot-password",
      body: { email },
    }) as unknown as { data: { message?: string } };

    if (!response.data) {
      throw new Error("Failed to send reset email");
    }
  };

  const resetPassword = async (token: string, password: string) => {
    const response = await client.post({
      url: "/api/auth/reset-password",
      body: { token, password },
    }) as unknown as { data: { message?: string } };

    if (!response.data) {
      throw new Error("Failed to reset password");
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const response = await client.post({
      url: "/api/auth/change-password",
      body: { current_password: currentPassword, new_password: newPassword },
    }) as unknown as { data: { message?: string } };

    if (!response.data) {
      throw new Error("Failed to change password");
    }
  };

  const requestVerification = async (email: string) => {
    const response = await client.post({
      url: "/api/auth/request-verification",
      body: { email },
    }) as unknown as { data: { message?: string } };

    if (!response.data) {
      throw new Error("Failed to request verification");
    }
  };

  const verifyEmail = async (token: string) => {
    const response = await client.post({
      url: "/api/auth/verify",
      body: { token },
    }) as unknown as { data: { message?: string } };

    if (!response.data) {
      throw new Error("Failed to verify email");
    }
  };

  const signup = async (input: UserCreate) => {
    await unwrap(
      registerSdk({
        body: input,
      })
    );
    return login(input.email, input.password);
  };

  const logout = async () => {
    if (!token || !refreshToken) {
      clearSession();
      setUser(null);
      return;
    }

    try {
      await logoutSdk({
        body: {
          refresh_token: refreshToken,
        },
      });
    } finally {
      clearSession();
      setUser(null);
      setToken(null);
      setRefreshToken(null);
      setAuthToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        googleLogin,
        setPassword,
        getAuthProviders,
        forgotPassword,
        resetPassword,
        changePassword,
        requestVerification,
        verifyEmail,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
