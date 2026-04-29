import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Must be a plain string — never a URL object — iOS NSURLSession requires it
const API_URL = "https://bhg6y5gqjyccbp6dujnuccj4vfw7s38p.app.specular.dev";

export const BEARER_TOKEN_KEY = "roster_bearer_token";

// Platform-specific storage: localStorage for web, SecureStore for native
const storage = Platform.OS === "web"
  ? {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      deleteItem: (key: string) => localStorage.removeItem(key),
    }
  : SecureStore;

// iOS native fetch (NSURLSession) cannot coerce a URL object to a string.
// This wrapper ensures the first argument is always a plain string.
const safeFetch: typeof fetch = (input, init?) => {
  if (Platform.OS === "ios" && input instanceof URL) {
    console.log("[Auth] iOS safeFetch: coercing URL object to string:", input.toString());
    return fetch(input.toString(), init);
  }
  return fetch(input, init);
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
        credentials: "include",
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
