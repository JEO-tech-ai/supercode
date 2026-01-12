# OAuth Authentication Improvement Plan

## Objective
Improve the OAuth authentication mechanisms in `@supercoin` by integrating robust OAuth 2.0 flows for **Gemini (Google)** and **Claude (Anthropic)**, following the provided "OAuth Concepts and AI Service Implementation Guide".

## Reference Material
- **Gemini API OAuth**: Use Google Cloud Console, Generative AI scopes, and `google-auth-oauthlib`.
- **Claude API OAuth**: Use Claude Pro/Max OAuth tokens (via `credentials.json` or direct OAuth flow if available/reverse-engineered). Note that official API is Key-based, but requirements specify OAuth for Pro/Max users.
- **Security**: Implement state validation, token hashing, and secure storage.

## Execution Steps

### Phase 1: Analysis & Setup
- [ ] **01-analysis.md**: Analyze existing `packages/auth` structure.
    - Review `github.ts` (existing provider).
    - Review `authorize.ts` and `callback.ts` flows.
    - Identify extension points for new providers.
- [ ] Create detailed task list.

### Phase 2: Design
- [x] **02-design-gemini.md**: detailed design for Gemini OAuth.
- [x] **03-design-claude.md**: detailed design for Claude OAuth.
- [x] **06-design-codex.md**: design for Codex (OpenAI) integration.
- [x] **07-design-antigravity.md**: design for Antigravity (Google Multi-Account) integration.

### Phase 3: Implementation
- [ ] **04-implementation.md**: Step-by-step implementation log.
    - Refactor `packages/auth` structure.
    - Implement `providers/github.ts` (Migration).
    - Implement `providers/google.ts` (Gemini & Antigravity base).
    - Implement `providers/claude.ts`.
    - Implement `providers/codex.ts`.
    - Implement `providers/antigravity.ts` (Load balancing logic).
    - Update Routes (`authorize.ts`, `callback.ts`).
    - Update `token-manager.ts`.

### Phase 4: Verification
- [ ] **05-verification.md**: Test plan and results.

    - Verify Google login.
    - Verify Token refresh.
    - Verify Claude token usage.

## Current Status
- [x] Project Structure Identified (`supercoin/packages/auth`).
- [x] Documentation Directory Created (`supercoin/docs/oauth-improvement`).
- [x] Analysis completed (`01-analysis.md`).
- [x] Designs completed (`02-design-gemini.md`, `03-design-claude.md`).
- [x] Implementation Plan created (`04-implementation-plan.md`).
- [x] Security Guidelines created (`05-security.md`).

## Next Actions
- Begin Phase 3: Implementation (coding).
