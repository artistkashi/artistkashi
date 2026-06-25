import { client } from "@/api/openapi-client/client.gen";
import { getItem, removeItem, STORAGE_KEYS } from "@/lib/storage";

client.setConfig({
  throwOnError: true,
});

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
if (typeof window === "undefined") {
  client.setConfig({ baseURL: new URL(API_BASE).origin });
}

// Dynamically attach the auth token on every request via interceptor.
// This avoids stale headers from setConfig() and prevents "Authorization: undefined".
client.instance.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const setAuthToken = (token?: string | null) => {
  if (token) {
    client.setConfig({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
};

function clearAuthStorage() {
  removeItem(STORAGE_KEYS.AUTH_TOKEN);
  removeItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN);
  removeItem(STORAGE_KEYS.AUTH_USER);
}

// When a 401 response is received (and it's not an auth endpoint), try to revoke
// the session on the backend before clearing local state. This prevents orphaned
// sessions when localStorage gets cleared or the server invalidates the token.
client.instance.interceptors.response.use(undefined, async (error) => {
  const isAuth = error?.config?.url?.includes("/auth/") ?? false;

  if (
    error?.response?.status === 401 &&
    !isAuth &&
    typeof window !== "undefined"
  ) {
    const refreshToken = getItem(STORAGE_KEYS.AUTH_REFRESH_TOKEN);
    if (refreshToken) {
      try {
        await fetch(`${API_BASE.replace("/api/v1", "")}/api/v1/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch {
        // best-effort: backend may already have revoked this session
      }
    }
    clearAuthStorage();
    // Notify auth-store to clear React state
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  }

  const backendMessage = error?.response?.data?.message;
  if (backendMessage) error.message = backendMessage;
  return Promise.reject(error);
});
