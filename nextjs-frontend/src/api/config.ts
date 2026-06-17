import { client } from "@/api/openapi-client/client.gen";

client.setConfig({
  throwOnError: true,
});

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
