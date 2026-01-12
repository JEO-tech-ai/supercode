import {
  createContext,
  useContext,
  createSignal,
  onMount,
  onCleanup,
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

interface RefreshResponse {
  success?: boolean;
  error?: string;
  message?: string;
}

interface AuthContextValue {
  user: () => AuthUser | null;
  isLoading: () => boolean;
  isAuthenticated: () => boolean;
  requiresReauth: () => boolean;
  login: () => void;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue>();

// Session refresh interval (5 minutes)
const SESSION_REFRESH_INTERVAL = 5 * 60 * 1000;

export const AuthProvider: ParentComponent = (props) => {
  const [user, setUser] = createSignal<AuthUser | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [requiresReauth, setRequiresReauth] = createSignal(false);

  let refreshInterval: ReturnType<typeof setInterval> | undefined;

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
      setRequiresReauth(false);
    } catch (error) {
      console.error("Failed to fetch auth status:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh the session token
   * Returns true if successful, false if re-authentication is required
   */
  const refreshSession = async (): Promise<boolean> => {
    if (isServer) return false;

    try {
      const response = await fetch("/auth/refresh", { method: "POST" });
      const data: RefreshResponse = await response.json();

      if (!response.ok || data.error === "reauthentication_required") {
        // Session expired or invalid - need to re-authenticate
        setRequiresReauth(true);
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to refresh session:", error);
      return false;
    }
  };

  /**
   * Start periodic session refresh
   */
  const startSessionRefresh = () => {
    if (isServer) return;

    // Clear any existing interval
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    // Refresh session periodically
    refreshInterval = setInterval(() => {
      if (isAuthenticated()) {
        refreshSession();
      }
    }, SESSION_REFRESH_INTERVAL);
  };

  onMount(() => {
    fetchAuthStatus().then(() => {
      if (isAuthenticated()) {
        startSessionRefresh();
      }
    });
  });

  onCleanup(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  const login = () => {
    if (!isServer) {
      // Clear the reauth flag when user initiates login
      setRequiresReauth(false);
      window.location.href = "/auth/authorize";
    }
  };

  const logout = async () => {
    if (isServer) return;

    try {
      await fetch("/auth/logout", { method: "POST" });
      setUser(null);
      setIsAuthenticated(false);
      setRequiresReauth(false);

      // Stop session refresh
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = undefined;
      }
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated,
    requiresReauth,
    login,
    logout,
    refetch: fetchAuthStatus,
    refreshSession,
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
