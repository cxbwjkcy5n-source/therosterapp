import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Must be a plain string — never a URL object — iOS NSURLSession requires it
const API_URL = "https://uaxhw3cgtsaywuceh8acsw2e26ww2ycx.app.specular.dev";

export const BEARER_TOKEN_KEY = "roster_bearer_token";

// Platform-specific storage: localStorage for web, SecureStore for native
const storage = Platform.OS === "web"
  ? {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      deleteItem: (key: string) => localStorage.removeItem(key),
      setItemAsync: async (key: string, value: string) => localStorage.setItem(key, value),
      getItemAsync: async (key: string) => localStorage.getItem(key),
    }
  : SecureStore;

// iOS native fetch (NSURLSession) cannot coerce a URL object to a string.
// This wrapper ensures the first argument is always a plain string.
// NOTE: Never inject an Origin header on native — it is a browser-only header
// and causes Better Auth to treat the request as a cross-origin browser request,
// which stalls/rejects the session fetch.
const safeFetch: typeof fetch = (input, init?) => {
  const url = input instanceof URL ? input.toString() : typeof input === "string" ? input : (input as Request).url;
  return fetch(url, init);
};

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: "roster",
      storagePrefix: "roster",
      storage,
    }),
  ],
  fetchOptions: Platform.OS === "web"
    ? {
        auth: {
          type: "Bearer" as const,
          token: () => localStorage.getItem(BEARER_TOKEN_KEY) || "",
        },
      }
    : {
        customFetchImpl: safeFetch,
      },
});

export async function setBearerToken(token: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(BEARER_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token);
  }
}

export async function clearAuthTokens() {
  if (Platform.OS === "web") {
    localStorage.removeItem(BEARER_TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
  }
}

export { API_URL };
