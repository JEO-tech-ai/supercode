import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { ThemeProvider } from "@supercoin/ui";
import { AuthProvider } from "./context/auth";
import { ReauthModal } from "./components/auth/reauth-modal";
import "./app.css";

export default function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <AuthProvider>
        <Router
          root={(props) => (
            <Suspense fallback={<div class="flex items-center justify-center h-screen">Loading...</div>}>
              {props.children}
            </Suspense>
          )}
        >
          <FileRoutes />
        </Router>
        <ReauthModal />
      </AuthProvider>
    </ThemeProvider>
  );
}
