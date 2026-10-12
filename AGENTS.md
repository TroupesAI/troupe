# AGENTS.md

Guidance for coding agents. Follow [CONTRIBUTING.md](CONTRIBUTING.md): it says what belongs in Format and the guides, and what a normative change touches. `bun run check` must pass before a change is done.

- This repository is the spec only: a schema for files. Don't add implementation code, library-specific notes, or how apps play files, such as prompt assembly, entry selection, event passes, random number generation, model calls, UI or app actions.
- Don't change normative behavior as part of editorial or repository work. Propose it instead, with the reason.

## Writing the spec

- Plain, direct sentences. Define a term once, where it first matters, and use it consistently.
- Keep section numbers stable; cases and the guides cite them as `Format 7.2`.
- Record design decisions in Format Appendix C, not in separate notes.
