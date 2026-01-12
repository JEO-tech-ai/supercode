# Design: Antigravity (Google) OAuth Integration

## Overview
Antigravity uses Google OAuth but via a specific plugin (`opencode-antigravity-auth`). This design covers integrating this "Dual Quota" and "Load Balancing" capable auth into `supercoin`.

## Specification

### 1. OAuth Configuration
- **Provider**: Google.
- **Scopes**: Same as Gemini (`https://www.googleapis.com/auth/generative-language`), plus potentially others for "Antigravity" specific access if it's a separate service (the text implies it uses Gemini 3/Claude models via Google).
- **Callback**: `localhost:36742` (for the CLI plugin).

### 2. Multi-Account Architecture
The guide highlights a **Multi-Account** strategy for Rate Limit handling.
- **Data Structure**:
    ```json
    {
      "accounts": [
        { "email": "...", "refreshToken": "...", "accessToken": "..." }
      ],
      "strategy": "sticky" | "round-robin"
    }
    ```
- **Server Implementation**:
    - The `users` table or a `user_keys` table needs to support *multiple* Google accounts linked to a single `supercoin` user.
    - `packages/auth` should allow linking additional accounts (`POST /link/google`).

### 3. Load Balancing Logic
- **File**: `src/providers/antigravity.ts` or `src/strategies/load-balancer.ts`.
- **Logic**:
    - `getValidToken()`: Checks rate limits, switches account if needed.
    - `sticky`: Use same account until failure.
    - `round-robin`: Rotate on every request.

### 4. Implementation Details
- **Route**: `GET /authorize?provider=antigravity` (aliases to Google but maybe with different scopes or state to indicate "linking").
- **Storage**: Encrypted storage of multiple refresh tokens.

## References
- "Antigravity OAuth Authentication" guide.
