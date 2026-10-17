# AGENTS.md

Guidance for coding agents. `bun run check` must pass before a change is done.

- This repository is the spec only: a schema for files. Don't add implementation code, library-specific notes, or how apps play files, such as prompt assembly, entry selection, rules engines, random number generation, model calls, UI or app actions.
- Troupe is in early development: breaking changes are welcome, with no proposal or migration needed.
- Before a minor version bump, tag the last commit of the old version and push the tag, such as `v0.12`: the site serves each version's schemas from its tag. A tagged version's schemas never change, and the site build fails if they do, so once the current version is tagged, the next schema change bumps the version.

## Writing the spec

- Plain, direct sentences. Define a term once, where it first matters, and use it consistently.
- Sections may be renumbered. Cases, the guides, the schemas and the scripts cite them as `Format 7.2`, and the spec as `section 7.2`, so a renumbering updates every citation and `#anchor` with it. `bun run check` only catches citations of sections that no longer exist, not ones that now point at the wrong section.
- Record design decisions in Format Appendix C, not in separate notes.
