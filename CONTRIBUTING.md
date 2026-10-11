# Contributing

## Where things belong

- **[Troupe Format](spec/format.md)**: what a file contains and what each field means. Authors, editors, validators and converters need nothing else.
- **[Troupe Play](spec/play.md)**: behavior that decides what the model receives or what a session records, so every app plays a file the same way.
- **Guides** ([authoring](guides/authoring.md), [implementer's](guides/implementers.md), [Character Card V2/V3](guides/character-cards.md), [beginner's](guides/beginners.html)): patterns, advice and mappings that don't affect interoperability, such as presentation, UX and when to run a tracker. They are informative and don't use RFC 2119 keywords.

Libraries and apps live in their own repositories. This one holds no implementation code; `scripts/check.ts` only checks the repository.

## Changing the spec

A normative change lands in one change set:

1. the text in `spec/format.md` or `spec/play.md`, with the rationale in Format Appendix C or Play Appendix A when it's a design decision;
2. the affected `schemas/`;
3. at least one conformance case in `conformance/cases` (format: [conformance/README.md](conformance/README.md));
4. `examples/`, when Format 1.4 or Appendix B changes (`bun run examples` re-extracts them);
5. `guides/`, when the change affects what they say.

When the spec doesn't decide a question, fix the text; never record a reading only in a case. Compute expected rolls independently of the implementation you test with.

## Checks

Requires [Bun](https://bun.sh). `bun install`, then `bun run check` runs what CI runs: the schemas compile; the examples, and every complete bundle in the spec and guides, validate; `examples/` matches the spec; the version agrees everywhere; cases parse; and relative links and anchors resolve.

## Versions

Format and Play share one version, `major.minor`. A minor version bump changes, together:

- the version line of `spec/format.md` and `spec/play.md`, and the beginner's guide's masthead, hero and smallest-card example;
- every schema `$id` (`https://troupe.example/schema/<minor>/…`) and `troupe` in every example and case.

The changelog records each version.
