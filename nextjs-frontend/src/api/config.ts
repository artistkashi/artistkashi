import { client } from "@/api/openapi-client/client.gen";
import { getItem, STORAGE_KEYS } from "@/lib/storage";

client.setConfig({
  throwOnError: true,
});

if (typeof window === "undefined") {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  client.setConfig({ baseURL: new URL(apiUrl).origin });
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
  // no-op: the interceptor reads from storage automatically
  // kept for backwards-compat / manual override
  if (token) {
    client.setConfig({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
};

// extract backend error message so error.message is always the backend message
// instead of the generic axios "Request failed with status code 4xx"
client.instance.interceptors.response.use(undefined, (error) => {
  const backendMessage = error?.response?.data?.message;
  if (backendMessage) error.message = backendMessage;
  return Promise.reject(error);
});
