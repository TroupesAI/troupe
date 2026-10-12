# Troupe

An open file format for AI roleplay: characters, the worlds they live in, the scenarios that bring them together, the mechanics that drive a story, and sessions: the chats people play, with every outcome recorded.

**Status:** v0.12 draft. Breaking changes are allowed until 1.0, which is tagged once none is pending and the conformance suite covers the spec.

## A first look

A complete Troupe file: one character, and a scenario that starts a chat with her.

```json
{
  "troupe": "0.12",
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

The [beginner's guide](guides/beginners.md) grows this card into a full story, with lore, secrets, state and events.

## Specification

| | |
| --- | --- |
| [Troupe Format](spec/format.md) | The files and what every field means: bundles, characters, worlds, scenarios, entries, variables, events and sessions. |
| [Schemas](schemas/) | JSON Schemas, normative for structure (Format Appendix A). |
| [Conformance suite](conformance/) | Language-neutral test cases and the [protocol](conformance/README.md) a test runner follows. |
| [Examples](examples/) | The spec's worked examples as files. |

## Guides

These are informative.

- [Beginner's guide](guides/beginners.md): learn Troupe by building one story, step by step.
- [Authoring guide](guides/authoring.md): patterns for common stories.
- [Authoring brief](guides/authoring-brief.md): one page for people and LLMs writing Troupe files.
- [Character Card V2/V3 and Troupe](guides/character-cards.md): importing and exporting cards.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

The specification and guides (`spec/`, `guides/`) are licensed under [CC BY 4.0](spec/LICENSE). Everything else, including the schemas, the conformance suite, the examples and the scripts, is licensed under [Apache-2.0](LICENSE). The TroupesAI logo in `site/` is covered by neither.
