import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { ThemeProvider } from "@supercoin/ui";
import "./app.css";

export default function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <Router
        root={(props) => (
          <Suspense fallback={<div class="flex items-center justify-center h-screen">Loading...</div>}>
            {props.children}
          </Suspense>
        )}
      >
        <FileRoutes />
      </Router>
    </ThemeProvider>
  );
}
