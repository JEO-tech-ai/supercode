# Design: Claude (Anthropic) OAuth Integration

## Overview
Enable integration with Claude Pro/Max accounts using OAuth tokens, based on the provided guide. Note that this is distinct from the standard API Key usage and targets users with direct subscriptions.

## Specification

### 1. OAuth Configuration
- **Token Endpoint**: `https://console.anthropic.com/api/oauth/token`
- **API Endpoint**: `https://api.anthropic.com/v1/messages`
- **Headers**:
  - `anthropic-version`: `2023-06-01`
  - `Authorization`: `Bearer <access_token>`

### 2. Integration Strategy
Since there is no public "Authorize" URL documented for third-party apps to trigger a consent screen (unlike Google), the integration might rely on:
1.  **Manual Token Input**: User provides `access_token` and `refresh_token` (extracted via CLI or browser).
2.  **CLI flow**: If `supercoin` has a CLI, it can trigger `claude login`.

**For the Web/Server Context (`packages/auth`)**:
We will implement the **Token Management** aspect:
- Storage of `access_token` and `refresh_token`.
- Automatic Refreshing logic.

### 3. Token Refresh Logic
- **Trigger**: When API call returns `401 Unauthorized`.
- **Action**:
  - POST to `https://console.anthropic.com/api/oauth/token`
  - Body:
    ```json
    {
      "grant_type": "refresh_token",
      "refresh_token": "<stored_refresh_token>",
      "client_id": "claude-code-cli-client-id" // As per guide
    }
    ```
  - Response: New `access_token`.

### 4. Implementation Details
- **File**: `src/claude.ts`
- **Functions**:
  - `refreshClaudeToken(refreshToken)`
  - `callClaudeApi(prompt, tokens)`

## Security
- Tokens must be stored encrypted.
- This integration relies on the `claude-code-cli-client-id`, which implies acting as the CLI.

## Alternative
- If "Login with Claude" is required for app identity, this is likely not supported. This design assumes the goal is **using Claude capabilities** via the user's account.
