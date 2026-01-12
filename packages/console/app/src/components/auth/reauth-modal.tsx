import { Show } from "solid-js";
import { useAuth } from "../../context/auth";

/**
 * Re-authentication Modal
 * Displays when the session has expired and user needs to log in again
 */
export function ReauthModal() {
  const auth = useAuth();

  return (
    <Show when={auth.requiresReauth()}>
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
          <div class="mb-4 flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <svg
                class="h-5 w-5 text-yellow-600 dark:text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Session Expired
            </h2>
          </div>

          <p class="mb-6 text-gray-600 dark:text-gray-300">
            Your session has expired. Please log in again to continue.
          </p>

          <div class="flex gap-3">
            <button
              type="button"
              onClick={() => auth.login()}
              class="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Log In Again
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
