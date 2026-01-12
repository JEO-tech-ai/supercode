# Security Best Practices for OAuth Implementation

## Overview
This document outlines security measures for the OAuth integration, ensuring robust protection against common attacks.

## 1. CSRF Protection (State Parameter)
- **Mechanism**: Use the `state` parameter to bind the authorization request to the user agent.
- **Implementation**:
  - `pkce.ts` generates a cryptographically secure random state.
  - The state is signed/encoded and includes a timestamp.
  - Upon callback, the state is verified against a `HttpOnly` cookie (`pkce_verifier`).
- **Google Requirement**: Google strongly recommends using State for CSRF protection.

## 2. PKCE (Proof Key for Code Exchange)
- **Mechanism**: Use `code_verifier` and `code_challenge` to prevent authorization code interception.
- **Google Integration**:
  - Send `code_challenge` and `code_challenge_method=S256` in the Authorization URL.
  - Send `code_verifier` in the Token Exchange request.
- **Current Codebase**: `pkce.ts` provides `generatePKCEPair`. We must ensure `google.ts` uses this.

## 3. Token Storage
- **Access Tokens**: Short-lived. Can be stored in memory or short-lived session storage.
- **Refresh Tokens**: **Critical Asset**.
  - Must be stored encrypted in the database.
  - **Never** expose to the client side.
  - Use `AES-256-GCM` or similar for encryption at rest.

## 4. Environment Variables
- `CLIENT_SECRET`s must be injected via environment variables (`AuthBindings`).
- **Never** commit secrets to git.
- Use `.env.example` for templates.

## 5. Scope Minimization
- Request only the scopes necessary.
- **Gemini**: `https://www.googleapis.com/auth/generative-language`.
- **Claude**: N/A (Token based).

## Checklist
- [ ] Verify `state` validation on callback.
- [ ] Ensure `code_verifier` is passed to Google Token Endpoint.
- [ ] Implement encryption for `refresh_token` storage (if storing).
