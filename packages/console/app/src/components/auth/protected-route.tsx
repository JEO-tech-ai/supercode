import { Component, Show, createEffect, type ParentComponent } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useAuth } from "~/context/auth";

export const ProtectedRoute: ParentComponent = (props) => {
  const auth = useAuth();
  const navigate = useNavigate();

  createEffect(() => {
    if (!auth.isLoading() && !auth.isAuthenticated()) {
      navigate("/auth/login", { replace: true });
    }
  });

  return (
    <Show
      when={!auth.isLoading()}
      fallback={
        <div class="flex min-h-screen items-center justify-center">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <Show when={auth.isAuthenticated()}>{props.children}</Show>
    </Show>
  );
};
