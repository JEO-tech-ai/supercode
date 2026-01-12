# Design: Gemini (Google) OAuth Integration

## Overview
Integrate Google OAuth 2.0 to allow users to authenticate and authorize Gemini API access.

## Specification

### 1. OAuth Configuration
- **Authorization URL**: `https://accounts.google.com/o/oauth2/v2/auth`
- **Token URL**: `https://oauth2.googleapis.com/token`
- **Scopes**:
  - `https://www.googleapis.com/auth/generative-language` (Gemini)
  - `email`, `profile` (for user identity)

### 2. Flow
1. **User Request**: `GET /authorize?provider=google`
2. **Server**:
   - Generates PKCE state/verifier.
   - Redirects to Google Auth URL with:
     - `client_id`
     - `redirect_uri` (e.g., `.../callback/google`)
     - `response_type=code`
     - `scope` (above)
     - `access_type=offline` (Critical for Refresh Token)
     - `prompt=consent` (Force consent to ensure refresh token is returned)
3. **User**: Approves access.
4. **Google**: Redirects to `.../callback/google?code=...`
5. **Server**:
   - Validates state.
   - Exchanges code for `access_token` and `refresh_token`.
   - Fetches user profile.
   - Upserts user.
   - **Crucial**: Stores `refresh_token` securely (encrypted) associated with the user, because Gemini API access requires long-term usage.

### 3. Token Management
- Access Token: Short-lived (~1 hour).
- Refresh Token: Long-lived. Used to get new access tokens.
- **Storage**: Need a place to store these tokens. `users` table or `connected_accounts` table.
- **Usage**: When calling Gemini API, check if access token is valid. If not, use refresh token.

### 4. Implementation Details
- **File**: `src/google.ts`
- **Functions**:
  - `getGoogleAuthUrl()`
  - `exchangeGoogleCode()`
  - `fetchGoogleUser()`
  - `refreshGoogleToken()`

## References
- Provided "Gemini API OAuth Implementation" guide.
