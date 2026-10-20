# Troupe

An open file format for AI roleplay: characters, the worlds they live in, the scenarios that bring them together, the state a story tracks, and sessions: the chats people play, with every change recorded.

**Status:** v0.14 draft. Breaking changes are allowed until 1.0, which is tagged once none is pending and the conformance suite covers the spec.

## A first look

A complete Troupe file: one character, and a scenario that starts a chat with her.

```json
{
  "troupe": "0.14",
  "kind": "bundle",
  "characters": [
    { "id": "elena", "name": "Elena Voss", "description": "A meticulous thief and mapmaker. Calm, exacting, dry humor." }
  ],
  "scenarios": [
    {
      "id": "workshop",
      "openings": [
        { "id": "late", "content": [{ "speaker": "elena", "text": "You're late. Sit down, and don't touch the maps." }] }
      ]
    }
  ]
}
```

The [beginner's guide](guides/beginners.md) grows this card into a full story, with lore, secrets and state.

## Specification

- [Troupe Format](spec/format.md): the files and what every field means: bundles, characters, worlds, scenarios, entries, variables and sessions.
- [Schemas](schemas/): JSON Schemas, normative for structure (Format Appendix A).
- [Conformance suite](conformance/): language-neutral test cases and the [protocol](conformance/README.md) a test runner follows.
- [Examples](examples/): the spec's worked examples as files.

## Guides

These are informative.

- [Beginner's guide](guides/beginners.md): learn Troupe by building one story, step by step.
- [Authoring guide](guides/authoring.md): patterns for common stories.
- [Authoring brief](guides/authoring-brief.md): one page for people and LLMs writing Troupe files.
- [Character Card V2/V3 and Troupe](guides/character-cards.md): importing and exporting cards.

## Contributing

Checks need [Bun](https://bun.sh): `bun install`, then `bun run check` runs the repository checks. The site in `site/` has its own packages: there, `bun install`, then `bun run dev` previews it and `bun run check` and `bun run build` run its checks. CI runs all of these.

## License

The specification and guides (`spec/`, `guides/`) and the examples generated from the specification (`examples/`) are licensed under [CC BY 4.0](spec/LICENSE). Everything else, including the schemas, the conformance suite and the scripts, is licensed under [Apache-2.0](LICENSE). The TroupesAI logo and the icons made from it in `site/` are covered by neither.
