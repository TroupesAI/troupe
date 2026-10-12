# AGENTS.md

Guidance for coding agents. Follow [CONTRIBUTING.md](CONTRIBUTING.md): it says what belongs in Format and the guides, and what a normative change touches. `bun run check` must pass before a change is done.

- This repository is the spec only. Don't add implementation code or library-specific notes; libraries live in their own repositories.
- The spec is a schema for files. Don't add how apps play them: prompt assembly, entry selection, event passes, rolls, model calls and output, UI or app actions.
- Don't change normative behavior as part of editorial or repository work. Propose it instead, with the reason.

## Writing the spec

- Plain, direct sentences. Define a term once, where it first matters, and use it consistently.
- Keep section numbers stable; cases and the guides cite them as `Format 7.2`.
- Record design decisions in Format Appendix C, and open questions in Format Appendix D, not in separate notes.
