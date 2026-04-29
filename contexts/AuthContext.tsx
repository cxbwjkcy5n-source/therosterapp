import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { authClient, setBearerToken, clearAuthTokens } from "@/lib/auth";
import { nativeAppleSignIn } from "@/lib/appleAuth";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isReady: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function openOAuthPopup(provider: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const popupUrl = `${window.location.origin}/auth-popup?provider=${provider}`;
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      popupUrl,
      "oauth-popup",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    if (!popup) {
      reject(new Error("Failed to open popup. Please allow popups."));
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "oauth-success" && event.data?.token) {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        resolve(event.data.token);
      } else if (event.data?.type === "oauth-error") {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        reject(new Error(event.data.error || "OAuth failed"));
      }
    };

    window.addEventListener("message", handleMessage);

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener("message", handleMessage);
        reject(new Error("Authentication cancelled"));
      }
    }, 500);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);   // true only during initial session check
  const [isReady, setIsReady] = useState(false);  // true once initial check is done

  useEffect(() => {
    // Initial session check on mount
    fetchUser();

    const subscription = Linking.addEventListener("url", (event) => {
      const url = event.url || "";
      const isAuthCallback = url.includes("auth-callback") || url.includes("token=") || url.includes("code=");
      if (isAuthCallback) {
        console.log("[Auth] Auth callback deep link received, refreshing user session:", url);
        fetchUser();
      }
    });

    const intervalId = setInterval(() => {
      fetchUser();
    }, 5 * 60 * 1000);

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, []);

  const fetchUser = async (): Promise<User | null> => {
    try {
      const session = await authClient.getSession();
      if (session?.data?.user) {
        const u = session.data.user as User;
        setUser(u);
        if (session.data.session?.token) {
          await setBearerToken(session.data.session.token);
        }
        return u;
      } else {
        setUser(null);
        await clearAuthTokens();
        return null;
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
      return null;
    } finally {
      // Always mark as ready and not loading after first call
      setLoading(false);
      setIsReady(true);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log("[Auth] Attempting email sign in");
      await authClient.signIn.email({ email, password });
      const u = await fetchUser();
      if (u) {
        console.log("[Auth] Sign in successful, navigating to home");
        router.replace("/(tabs)/(home)");
      } else {
        throw new Error("Sign in succeeded but session could not be retrieved.");
      }
    } catch (error) {
      console.error("Email sign in failed:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      console.log("[Auth] Attempting email sign up");
      await authClient.signUp.email({ email, password, name });
      const u = await fetchUser();
      if (u) {
        console.log("[Auth] Sign up successful, navigating to home");
        router.replace("/(tabs)/(home)");
      } else {
        throw new Error("Sign up succeeded but session could not be retrieved.");
      }
    } catch (error) {
      console.error("Email sign up failed:", error);
      throw error;
    }
  };

  const signInWithSocial = async (provider: "apple" | "google") => {
    if (Platform.OS === "web") {
      const token = await openOAuthPopup(provider);
      await setBearerToken(token);
      const u = await fetchUser();
      if (u) router.replace("/(tabs)/(home)");
    } else {
      const { error } = await authClient.signIn.social({
        provider,
        callbackURL: "roster://auth-callback",
      });
      if (error) {
        throw new Error(error.message || "Social sign in failed");
      }
      // For native OAuth, the deep link listener will call fetchUser
      // But also try immediately in case the session is already set
      const u = await fetchUser();
      if (u) router.replace("/(tabs)/(home)");
    }
  };

  const signInWithGoogle = () => signInWithSocial("google");

  const signInWithApple = async () => {
    if (Platform.OS === "ios") {
      // Native Apple Sign In on iOS — uses platform-split module to avoid web bundle issues
      const identityToken = await nativeAppleSignIn();
      const { error } = await authClient.signIn.social({
        provider: "apple",
        idToken: identityToken,
      });
      if (error) {
        throw new Error(error.message || "Apple sign in failed");
      }
      const u = await fetchUser();
      if (u) {
        console.log("[Auth] Apple sign in successful, navigating to home");
        router.replace("/(tabs)/(home)");
      }
    } else {
      // Web / Android: OAuth redirect flow
      await signInWithSocial("apple");
    }
  };

  const signOut = async () => {
    console.log("[Auth] Signing out");
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("Sign out failed (API):", error);
    } finally {
      setUser(null);
      await clearAuthTokens();
      router.replace("/auth-screen");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isReady,
        signInWithEmail,
        signUpWithEmail,
        signInWithApple,
        signInWithGoogle,
        signOut,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
