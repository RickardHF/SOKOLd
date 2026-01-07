# Project Constitution

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
- Support for `--verbose` and `--debug` flags

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
