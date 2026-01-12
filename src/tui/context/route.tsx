import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type RouteData =
  | { type: "home"; initialPrompt?: string }
  | { type: "session"; sessionID: string }
  | { type: "settings" }
  | { type: "help" };

interface RouteContextValue {
  route: RouteData;
  navigate: (route: RouteData) => void;
  back: () => void;
  canGoBack: boolean;
}

const RouteContext = createContext<RouteContextValue | null>(null);

interface RouteProviderProps {
  children: ReactNode;
  initialRoute?: RouteData;
}

export function RouteProvider({
  children,
  initialRoute = { type: "home" },
}: RouteProviderProps) {
  const [route, setRoute] = useState<RouteData>(initialRoute);
  const [history, setHistory] = useState<RouteData[]>([]);

  const navigate = useCallback((newRoute: RouteData) => {
    setHistory((prev) => [...prev, route]);
    setRoute(newRoute);
  }, [route]);

  const back = useCallback(() => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setRoute(prev);
    }
  }, [history]);

  return (
    <RouteContext.Provider
      value={{
        route,
        navigate,
        back,
        canGoBack: history.length > 0,
      }}
    >
      {children}
    </RouteContext.Provider>
  );
}

export function useRoute() {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error("useRoute must be used within RouteProvider");
  }
  return context;
}

export function useRouteData<T extends RouteData["type"]>(
  type: T
): Extract<RouteData, { type: T }> {
  const { route } = useRoute();
  if (route.type !== type) {
    throw new Error(`Expected route type ${type}, got ${route.type}`);
  }
  return route as Extract<RouteData, { type: T }>;
}
