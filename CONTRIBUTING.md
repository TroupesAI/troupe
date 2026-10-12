# Contributing

## Where things belong

- **[Troupe Format](spec/format.md)**: what a file contains, what each field means and when a file is valid. It is a schema: it never says how an app plays files, such as how it builds prompts, chooses entries, runs events, calls models or shows things to people.
- **Guides** ([authoring](guides/authoring.md), [authoring brief](guides/authoring-brief.md), [Character Card V2/V3](guides/character-cards.md), [beginner's](guides/beginners.md)): patterns and mappings for people who write and convert files. They are informative and don't use RFC 2119 keywords.

Libraries, apps and advice on playing files live in their own repositories. This one holds no implementation code; `scripts/` only checks the repository, and `site/` only renders it as the website at docs.troupes.ai.

## Changing the spec

A normative change lands in one change set:

1. the text in `spec/format.md`, with the rationale in Format Appendix C when it's a design decision;
2. the affected `schemas/`;
3. at least one conformance case in `conformance/cases` (format: [conformance/README.md](conformance/README.md));
4. `examples/`, when Format 1.4 or Appendix B changes (`bun run examples` re-extracts them), and the first example of the README and the beginner's guide when Format 1.4 changes;
5. `guides/`, when the change affects what they say.

When the spec doesn't decide a question, fix the text; never record a reading only in a case.

## Checks

Requires [Bun](https://bun.sh). `bun install`, then `bun run check` runs what CI runs. The header of [`scripts/check.ts`](scripts/check.ts) lists what it checks.

## Versions

The spec has one version, `major.minor`. A minor version bump changes, together:

- the version line of `spec/format.md`, with its date, and the README's status line;
- every schema URL (`https://docs.troupes.ai/schema/<minor>/…`): the schemas' `$id`s and the `$schema` and `$id` examples in the spec;
- `troupe` in every bundle, session and chronicle: the examples, the cases' raw `parse` inputs, and the README and guides, including the example in Format 3's interface;
- `conformance/cases/parsing/versions.json`, whose inputs name the versions around the current one.

`bun run check` reports a version out of step in the version line, schema URLs, examples, cases, and JSON blocks in Markdown. Raw `parse` inputs and other text need a look by hand.
