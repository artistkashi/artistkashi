import { client } from "@/api/openapi-client/client.gen";

client.setConfig({
  throwOnError: true,
});

if (typeof window === "undefined") {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  client.setConfig({ baseURL: new URL(apiUrl).origin });
}

export const setAuthToken = (token?: string | null) => {
  client.setConfig({
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
    },
  });
};

// extract backend error message so error.message is always the backend message
// instead of the generic axios "Request failed with status code 4xx"
client.instance.interceptors.response.use(undefined, (error) => {
  const backendMessage = error?.response?.data?.message;
  if (backendMessage) error.message = backendMessage;
  return Promise.reject(error);
});
