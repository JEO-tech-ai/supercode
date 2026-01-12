# Analysis of Current Auth Implementation

## Overview
The current authentication system in `@supercoin/auth` is tightly coupled to GitHub OAuth.

## Current Architecture

### Files
- **`src/index.ts`**: Main entry point. Defines `AuthBindings` (env vars) and `AuthConfig`. Only `GITHUB_` credentials exist.
- **`src/github.ts`**: Contains GitHub-specific logic (`fetchGitHubUser`, `exchangeCodeForToken`).
- **`src/routes/authorize.ts`**: Hardcoded to redirect to `https://github.com/login/oauth/authorize`. Generates PKCE state.
- **`src/routes/callback.ts`**: Hardcoded to exchange code with GitHub, fetch GitHub user, and upsert user in DB based on `githubId`.

### Database Schema
- `users` table has `githubId`. It will need `googleId` (or generic `providerId` + `provider` column, or jsonb `oauthData`) to support multiple providers.
- Current upsert logic:
  ```typescript
  where: eq(users.githubId, String(githubUser.id))
  ```

## Required Changes

### 1. Configuration (`types.ts`, `index.ts`)
- Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- Add `CLAUDE_CLIENT_ID`, `CLAUDE_CLIENT_SECRET` (if applicable) or `CLAUDE_OAUTH_TOKEN` handling mechanisms.

### 2. Provider Abstraction
- Create `src/providers/` directory? Or just `src/google.ts`, `src/claude.ts`.
- Each provider needs:
  - `getAuthUrl(config, state)`
  - `exchangeCodeForToken(code, config)`
  - `getUserProfile(accessToken)`

### 3. Routing
- **Authorize**: `GET /authorize?provider={github|google|claude}`.
- **Callback**: `GET /callback` needs to know which provider to use.
  - Option A: Different callback URLs (`/callback/github`, `/callback/google`).
  - Option B: Store provider in cookie/state.
  - *Recommendation*: Use `provider` query param or dedicated paths. Dedicated paths are safer for redirect URI whitelisting.

### 4. Database
- Check `@supercoin/database` schema. Need to verify if we can add columns or if we should use a separate `oauth_accounts` table.

## Next Steps
- Design Gemini and Claude flows specifically.
