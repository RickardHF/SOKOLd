import { writeFile, joinPath, ensureDir } from '../../utils/filesystem.js';

export class TemplateManager {
  constructor() {
    // Templates are embedded directly in the class methods
  }

  getConstitutionTemplate(): string {
    return `# Project Constitution

## Core Principles

### I. Cross-Platform Compatibility
- All code MUST work identically on Windows, macOS, and Linux
- Use platform-agnostic path handling
- No platform-specific dependencies without alternatives

### II. CLI-First Design
- All functionality MUST be accessible via command line
- Support both interactive and scripted usage
- Follow POSIX conventions where applicable

### III. Test-Driven Development
- Write tests before implementation code
- Follow Red-Green-Refactor cycle
- Maintain high test coverage

### IV. Distribution & Packaging
- Provide multiple installation methods
- Support offline usage where possible
- Minimize runtime dependencies

### V. Observability & Debugging
- Structured logging at multiple verbosity levels
- Clear, actionable error messages
- Support for \`--verbose\` and \`--debug\` flags

### VI. Versioning & Stability
- Follow Semantic Versioning
- Maintain changelog
- Document breaking changes

### VII. Simplicity & Best Practices
- YAGNI: Don't add features until needed
- Prefer standard library over dependencies
- Use conventional configuration formats

## Decision Log

Record major architectural decisions here with rationale.

| Date | Decision | Rationale |
|------|----------|-----------|
| | | |
`;
  }

  getSpecTemplate(): string {
    return `# Feature Specification: [Feature Name]

## User Scenarios & Testing

### User Story 1 - [Story Title] (Priority: P1)

[Brief description of user goal]

**Acceptance Scenarios**:

1. **Given** [precondition], **When** [action], **Then** [expected result]
2. **Given** [precondition], **When** [action], **Then** [expected result]

## Requirements

### Functional Requirements

- **FR-001**: System MUST [requirement]
- **FR-002**: System MUST [requirement]

### Non-Functional Requirements

- **NFR-001**: [Performance/Security/etc. requirement]

## Success Criteria

- **SC-001**: [Measurable success criterion]
`;
  }

  getPlanTemplate(): string {
    return `# Implementation Plan: [Feature Name]

**Branch**: \`feature/[name]\` | **Date**: [YYYY-MM-DD]

## Summary

[Brief description of what will be implemented]

## Technical Context

**Language/Version**: [Language] [Version]
**Primary Dependencies**: [List]
**Testing**: [Framework]

## Project Structure

\`\`\`text
src/
├── [planned structure]
tests/
├── [planned structure]
\`\`\`

## Tasks Overview

1. [ ] Setup phase
2. [ ] Core implementation
3. [ ] Testing
4. [ ] Documentation
`;
  }

  getTasksTemplate(): string {
    return `# Tasks: [Feature Name]

**Input**: Design documents
**Prerequisites**: plan.md, spec.md

## Format: \`- [ ] [ID] [P?] Description\`

- **[P]**: Can run in parallel

---

## Phase 1: Setup

- [ ] T001 Create project structure
- [ ] T002 Install dependencies

## Phase 2: Core Implementation

- [ ] T003 [P] Implement feature A
- [ ] T004 [P] Implement feature B

## Phase 3: Testing

- [ ] T005 Write unit tests
- [ ] T006 Write integration tests

---

## Notes

- Mark tasks as [X] when complete
- [P] tasks can run in parallel
`;
  }

  getAllTemplates(): Record<string, string> {
    return {
      'spec-template.md': this.getSpecTemplate(),
      'plan-template.md': this.getPlanTemplate(),
      'tasks-template.md': this.getTasksTemplate(),
    };
  }

  async copyTemplatesToTarget(targetDir: string): Promise<string[]> {
    const templates = this.getAllTemplates();
    const copied: string[] = [];

    await ensureDir(targetDir);

    for (const [name, content] of Object.entries(templates)) {
      const targetPath = joinPath(targetDir, name);
      await writeFile(targetPath, content);
      copied.push(name);
    }

    return copied;
  }
}
