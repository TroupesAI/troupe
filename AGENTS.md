# AGENTS.md

Guidance for coding agents. Follow [CONTRIBUTING.md](CONTRIBUTING.md): it says what belongs in Format, Play and the implementer's guide, and what a normative change touches. `bun run check` must pass before a change is done.

- This repository is the spec only. Don't add implementation code or library-specific notes; libraries live in their own repositories.
- Don't change normative behavior as part of editorial or repository work. Propose it instead, with the reason.

## Writing the spec

- Plain, direct sentences. Define a term once, where it first matters, and use it consistently.
- Keep section numbers stable; cases and the guides cite them as `Format 7.2` and `Play 3.3`.
- Record design decisions in Format Appendix C or Play Appendix A, and open questions in Format Appendix D, not in separate notes.
