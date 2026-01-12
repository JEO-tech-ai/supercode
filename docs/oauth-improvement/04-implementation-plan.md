# Implementation Plan

## Phase 1: Environment & Configuration
1.  Update `src/index.ts`:
    - Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
    - Add `CLAUDE_CLIENT_ID` (optional, default to CLI ID), `CLAUDE_CLIENT_SECRET` (if any).
    - Update `AuthConfig` interface.

## Phase 2: Provider Modules
2.  Create `src/google.ts`:
    - Implement `getGoogleAuthUrl`.
    - Implement `exchangeGoogleCode`.
    - Implement `fetchGoogleUser`.
    - **Reference**: `src/github.ts`.

3.  Create `src/claude.ts`:
    - Implement `refreshClaudeToken`.
    - Implement `ClaudeOAuthManager` class (adapted from Python guide).

## Phase 3: Route Refactoring
4.  Refactor `src/routes/authorize.ts`:
    - Accept `provider` query parameter.
    - Switch logic:
      - `github`: existing logic.
      - `google`: call `getGoogleAuthUrl` and redirect.
    - Alternatively, create specific endpoints: `/auth/google`, `/auth/github`.

5.  Refactor `src/routes/callback.ts`:
    - Determine provider (e.g., from path or state).
    - Switch logic for code exchange.
    - Normalize user data (map Google profile to User entity).

## Phase 4: Database & Session
6.  Schema Update (Required):
    - Update `User` table to support multiple providers (e.g., `googleId`, `anthropicId`).
    - Or create `Account` table: `userId`, `provider`, `providerAccountId`, `accessToken`, `refreshToken`, `expiresAt`.

## Phase 5: Verification
7.  Manual testing with provided cURL commands/Flows.
