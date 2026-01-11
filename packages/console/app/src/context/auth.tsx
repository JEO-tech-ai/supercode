import {
  createContext,
  useContext,
  createResource,
  type ParentComponent,
} from "solid-js";

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
}

const AuthContext = createContext<AuthContextValue>();

async function fetchAuthStatus(): Promise<AuthStatusResponse> {
  const response = await fetch("/auth/status");
  return response.json();
}

export const AuthProvider: ParentComponent = (props) => {
  const [authData, { refetch }] = createResource(fetchAuthStatus);

  const login = () => {
    window.location.href = "/auth/authorize";
  };

  const logout = async () => {
    await fetch("/auth/logout", { method: "POST" });
    await refetch();
  };

  const value: AuthContextValue = {
    user: () => authData()?.user ?? null,
    isLoading: () => authData.loading,
    isAuthenticated: () => authData()?.authenticated ?? false,
    login,
    logout,
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
