# Design: Codex (OpenAI) OAuth Integration

## Overview
Integrate OpenAI (Codex) authentication to allow users to use Codex capabilities. Based on the "Codex OAuth" guide, this primarily involves the "ChatGPT OAuth Login" flow.

## Specification

### 1. OAuth Configuration
- **Auth URL**: Varies, but typically `https://auth0.openai.com/authorize` or similar for ChatGPT.
    - *Note*: As a third-party app, we typically use the standard OpenAI API or require a Personal Access Token / API Key unless we are integrating as a plugin.
    - **Strategy**: Since `supercoin` seems to be an agentic platform, we will implement support for **Storing** the Codex Token (`access_token`) and **Refreshing** it if possible, or triggering the flow.
- **CLI Context**: The guide emphasizes `codex login` which uses `localhost:1455`.
    - If `supercoin` has a CLI (`packages/cli`), we can implement a command `supercoin auth codex` that mimics this flow.
- **Server Context**: `packages/auth` service.
    - We can add a provider `openai`.
    - **Scopes**: `offline_access`, `model.read`, `model.request`.

### 2. Token Management
- **Storage**: `auth.json` structure (`access_token`, `expires_in`).
- **Refresh**: Automatic refresh logic if `refresh_token` is present.

### 3. Implementation Details
- **File**: `src/providers/codex.ts`
- **Functions**:
    - `exchangeCodexToken(code)`
    - `refreshCodexToken(refreshToken)`
    - `getUserProfile()` (OpenAI User Endpoint)

## Note
The "Codex" OAuth flow described in the prompt is specific to the Codex CLI tool. Replicating it exactly on a server might require different client credentials. We will assume standard OpenAI OAuth or API Key storage for the server.
