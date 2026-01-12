import {
  createContext,
  useContext,
  createSignal,
  createEffect,
  onMount,
  type ParentComponent,
} from "solid-js";
import { isServer } from "solid-js/web";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthStatusResponse {
  authenticated: boolean;
  user: AuthUser | null;
}

interface AuthContextValue {
  user: () => AuthUser | null;
  isLoading: () => boolean;
  isAuthenticated: () => boolean;
  login: () => void;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>();

export const AuthProvider: ParentComponent = (props) => {
  const [user, setUser] = createSignal<AuthUser | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);

  const fetchAuthStatus = async () => {
    if (isServer) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/auth/status");
      const data: AuthStatusResponse = await response.json();
      setUser(data.user);
      setIsAuthenticated(data.authenticated);
    } catch (error) {
      console.error("Failed to fetch auth status:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  onMount(() => {
    fetchAuthStatus();
  });

  const login = () => {
    if (!isServer) {
      window.location.href = "/auth/authorize";
    }
  };

  const logout = async () => {
    if (isServer) return;

    try {
      await fetch("/auth/logout", { method: "POST" });
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refetch: fetchAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
