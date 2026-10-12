# Contributing

## Where things belong

- **[Troupe Format](spec/format.md)**: what a file contains and what each field means. Authors, editors, validators and converters need nothing else.
- **[Troupe Play](spec/play.md)**: behavior that decides what the model receives or what a session records, so every app plays a file the same way.
- **Guides** ([authoring](guides/authoring.md), [authoring brief](guides/authoring-brief.md), [implementer's](guides/implementers.md), [Character Card V2/V3](guides/character-cards.md), [beginner's](guides/beginners.md)): patterns, advice and mappings that don't affect interoperability, such as presentation, UX and when to run a tracker. They are informative and don't use RFC 2119 keywords.

Libraries and apps live in their own repositories. This one holds no implementation code; `scripts/check.ts` only checks the repository.

## Changing the spec

A normative change lands in one change set:

1. the text in `spec/format.md` or `spec/play.md`, with the rationale in Format Appendix C or Play Appendix A when it's a design decision;
2. the affected `schemas/`;
3. at least one conformance case in `conformance/cases` (format: [conformance/README.md](conformance/README.md));
4. `examples/`, when Format 1.4 or Appendix B changes (`bun run examples` re-extracts them), and the README's first example when Format 1.4 changes;
5. `guides/`, when the change affects what they say.

When the spec doesn't decide a question, fix the text; never record a reading only in a case. Compute expected rolls independently of the implementation you test with.

## Checks

Requires [Bun](https://bun.sh). `bun install`, then `bun run check` runs what CI runs: the schemas compile, and every TypeScript interface in the spec lists exactly its schema's properties; the examples, and every complete bundle in a Markdown document, validate; `examples/` and the README's first example match the spec; the version agrees everywhere; cases match `conformance/case.schema.json`, expect `SCHEMA` exactly when the schemas reject their inputs, are named `<area>/<topic>.json` and name files that exist; and relative links, anchors and `Format`/`Play`/section citations resolve.

## Versions

Format and Play share one version, `major.minor`. A minor version bump changes, together:

- the version lines of `spec/format.md` and `spec/play.md`, with their dates, and the README's status line;
- every schema URL (`https://troupes.ai/schema/<minor>/…`): the schemas' `$id`s and the `$schema` and `$id` examples in the spec;
- `troupe` in every bundle, session and chronicle: the examples, the cases' raw `parse` inputs and expected `equals`, and the README and guides, including the example in Format 3's interface;
- `conformance/cases/parsing/versions.json`, whose inputs name the versions around the current one;
- a new changelog heading.

`bun run check` reports a version out of step in the version lines, schema URLs, examples, cases, and JSON blocks in Markdown. Raw `parse` inputs and other text need a look by hand.
