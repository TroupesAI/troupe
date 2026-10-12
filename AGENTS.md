# AGENTS.md

Guidance for coding agents. Follow [CONTRIBUTING.md](CONTRIBUTING.md): it says what belongs in Format and the guides, and what a normative change touches. `bun run check` must pass before a change is done.

- This repository is the spec only: a schema for files. Don't add implementation code, library-specific notes, or how apps play files, such as prompt assembly, entry selection, event passes, random number generation, model calls, UI or app actions.
- Don't change normative behavior as part of editorial or repository work. Propose it instead, with the reason.

## Writing the spec

- Plain, direct sentences. Define a term once, where it first matters, and use it consistently.
- Sections may be renumbered. Cases, the guides, the schemas and the scripts cite them as `Format 7.2`, and the spec as `section 7.2`, so a renumbering updates every citation and `#anchor` with it. `bun run check` only catches citations of sections that no longer exist, not ones that now point at the wrong section.
- Record design decisions in Format Appendix C, not in separate notes.
