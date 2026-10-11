# Troupe

An open file format for AI roleplay: characters, the worlds they live in, the scenarios that bring them together, the mechanics that drive a story, and the chat sessions played from them.

**Status:** v0.11 draft. Breaking changes are allowed until 1.0 ([road to 1.0](spec/format.md#appendix-d-road-to-10)).

## Specification

| | |
| --- | --- |
| [Troupe Format](spec/format.md) | The files and what every field means: bundles, characters, worlds, scenarios, entries, variables, events, sessions and chronicles. |
| [Troupe Play](spec/play.md) | How apps play the files, so that every app gives the model the same content: starting sessions, state and events, rolls, entry activation, prompt contents and knowledge. |
| [Schemas](schemas/) | JSON Schemas, normative for structure (Format Appendix A). |
| [Conformance suite](conformance/) | Language-neutral test cases and the [protocol](conformance/README.md) a test runner follows. |
| [Examples](examples/) | The spec's worked examples as files. |

## Guides

These are informative.

- [Beginner's guide](guides/beginners.md): learn Troupe by building one story, step by step.
- [Authoring guide](guides/authoring.md): patterns for common stories, and a one-page brief for people and LLMs writing Troupe files.
- [Implementer's guide](guides/implementers.md): advice for apps on presentation and the choices the spec leaves to them.
- [Character Card V2/V3 and Troupe](guides/character-cards.md): importing and exporting cards.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

The specification and guides (`spec/`, `guides/`) are licensed under [CC BY 4.0](spec/LICENSE). The schemas, conformance cases, examples and scripts are licensed under [Apache-2.0](LICENSE).
