# Phase 4: Polish Work Breakdown

> **Duration**: Week 7-8 | **Priority**: 🟢 Medium

---

## Overview

Phase 4 completes the unified platform:
- .agent-skills integration
- Final unification
- Documentation
- Testing and polish

---

## Work Items

### WI-4.1: Skill Loader

**Status**: 🔴 TODO | **Effort**: 2 days | **Owner**: TBD

**Description**: Load skills from .agent-skills directory.

**Tasks**:
- [ ] Create `src/skills/loader.ts`
- [ ] Parse SKILL.md frontmatter
- [ ] Support compact and toon formats
- [ ] Create skill registry

**Acceptance Criteria**:
- All 46 skills load
- Formats parsed correctly
- Registry queryable

**Dependencies**: None

---

### WI-4.2: Skill Search and Matching

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Implement skill search and query matching.

**Tasks**:
- [ ] Create `src/skills/search.ts`
- [ ] Implement keyword search
- [ ] Implement query matching
- [ ] Return best match with score

**Acceptance Criteria**:
- Search finds relevant skills
- Matching selects best fit
- Performance acceptable

**Dependencies**: WI-4.1

---

### WI-4.3: Agent Routing

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Route tasks to appropriate agents based on skills.

**Tasks**:
- [ ] Create `src/skills/agent-routing.ts`
- [ ] Parse agent-routing.yaml
- [ ] Implement pattern matching
- [ ] Return agent assignments

**Acceptance Criteria**:
- Routing config loads
- Patterns match correctly
- Assignments returned

**Dependencies**: WI-4.1

---

### WI-4.4: Skill CLI Commands

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Add CLI commands for skill management.

**Tasks**:
- [ ] Create `src/cli/commands/skill.ts`
- [ ] Add `skill list` command
- [ ] Add `skill search` command
- [ ] Add `skill show` command
- [ ] Add `skill match` command

**Acceptance Criteria**:
- Commands work correctly
- Output formatted well
- Help text clear

**Dependencies**: WI-4.1, WI-4.2

---

### WI-4.5: Antigravity Auth

**Status**: 🔴 TODO | **Effort**: 2 days | **Owner**: TBD

**Description**: Add multi-account authentication from oh-my-opencode.

**Tasks**:
- [ ] Create `src/auth/antigravity/`
- [ ] Implement multi-account storage
- [ ] Add rate limit detection
- [ ] Implement account rotation
- [ ] Add health monitoring

**Acceptance Criteria**:
- Multiple accounts stored
- Rate limits detected
- Rotation works
- Health tracked

**Dependencies**: None

---

### WI-4.6: Auto-Update Checker

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Check for new versions and notify users.

**Tasks**:
- [ ] Create `src/hooks/auto-update-checker/`
- [ ] Query npm/GitHub for latest version
- [ ] Compare with installed version
- [ ] Display notification if update available
- [ ] Cache check result

**Acceptance Criteria**:
- Version check works
- Notification displays
- Cache prevents spam

**Dependencies**: WI-1.4

---

### WI-4.7: Tool Output Truncator

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Truncate large tool outputs to prevent context overflow.

**Tasks**:
- [ ] Create `src/hooks/tool-output-truncator.ts`
- [ ] Detect large outputs
- [ ] Apply intelligent truncation
- [ ] Preserve important parts
- [ ] Add truncation notice

**Acceptance Criteria**:
- Large outputs truncated
- Important content preserved
- User notified

**Dependencies**: WI-1.4

---

### WI-4.8: Unified Configuration

**Status**: 🔴 TODO | **Effort**: 1 day | **Owner**: TBD

**Description**: Finalize unified configuration schema.

**Tasks**:
- [ ] Create comprehensive JSON schema
- [ ] Document all options
- [ ] Add validation
- [ ] Create migration for old configs

**Acceptance Criteria**:
- Schema complete
- Validation works
- Migration smooth

**Dependencies**: All previous phases

---

### WI-4.9: Documentation

**Status**: 🔴 TODO | **Effort**: 2 days | **Owner**: TBD

**Description**: Complete all documentation.

**Tasks**:
- [ ] Update main README
- [ ] Write feature documentation
- [ ] Create migration guide
- [ ] Add API reference
- [ ] Include examples

**Acceptance Criteria**:
- README comprehensive
- Features documented
- Migration clear
- Examples work

**Dependencies**: All features complete

---

### WI-4.10: Final Testing

**Status**: 🔴 TODO | **Effort**: 2 days | **Owner**: TBD

**Description**: Comprehensive testing and bug fixing.

**Tasks**:
- [ ] Run full test suite
- [ ] Manual testing of all features
- [ ] Performance testing
- [ ] Fix discovered bugs
- [ ] Update changelog

**Acceptance Criteria**:
- All tests pass
- Features work as expected
- Performance acceptable
- Changelog updated

**Dependencies**: All features complete

---

## Testing Requirements

### Unit Tests
- [ ] Skill loading
- [ ] Skill search
- [ ] Agent routing
- [ ] Antigravity auth
- [ ] Auto-update
- [ ] Truncator

### Integration Tests
- [ ] Full skill workflow
- [ ] Multi-account rotation
- [ ] Complete unified platform

### E2E Tests
- [ ] New user setup
- [ ] Migration from existing
- [ ] Complete development task

---

## Deliverables

| Deliverable | Description | Due |
|-------------|-------------|-----|
| Skill System | Loader, search, routing | End of Day 4 |
| Antigravity Auth | Multi-account | End of Day 6 |
| Final Hooks | Auto-update, truncator | End of Day 7 |
| Documentation | Complete docs | End of Day 9 |
| Release | v1.0.0 | End of Day 10 |

---

## Definition of Done

- [ ] All 46 skills loadable
- [ ] Multi-account auth works
- [ ] Auto-update notifies
- [ ] Documentation complete
- [ ] All tests pass
- [ ] v1.0.0 ready for release
