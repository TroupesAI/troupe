# Character Card V2/V3 and Troupe

This guide is informative. It maps [Character Card V2](https://github.com/malfoyslastname/character-card-spec-v2/blob/main/spec_v2.md) and [V3](https://github.com/kwaroran/character-card-spec-v3/blob/main/SPEC_V3.md) cards to Troupe and back, for importers and exporters. [Troupe Format](../spec/format.md) is normative.

## Importing Character Card V2/V3

Each card becomes a bundle with one character and a scenario `main` that holds its openings.

| Source | Troupe |
| --- | --- |
| `name`, `nickname` | `name` (the nickname if set), the other in `aliases` |
| `description`, `personality` | `description`, with personality under `## Personality` |
| `first_mes`, `alternate_greetings` | The scenario's `openings` `greeting_1`, `greeting_2`, … |
| `scenario` | The scenario's `premise` |
| `group_only_greetings` | Openings of a scenario whose cast includes the group |
| `mes_example` | `examples`, split at `<START>` and parsed by speaker |
| `system_prompt` | An entry with `position: "system"` and `knownBy: ["<id>"]`; `{{original}}` is dropped |
| `post_history_instructions` | An entry with `position: 0` and `knownBy: ["<id>"]` |
| `extensions.depth_prompt` | An entry at its depth with `knownBy: ["<id>"]`; the role is dropped |
| `extensions.talkativeness` | `ext` |
| `creator_notes`, `tags`, `creator`, `character_version` | The scenario's `briefing`, `tags`, `authors`, `version` |
| `source` | Links in `credits` |
| `assets` icon / background | `avatar` / a location `image`; other assets in `ext` |
| Lorebook entries | Character entries, or a world named after the book |
| `keys`, `constant`, `enabled` | `keys`, no keys, `disabled` |
| SillyTavern regex keys `/p/flags` | `/(?flags)p/` |
| `case_sensitive`, `match_whole_words: false` | Regex keys `/(?-i)…/`, `/…/` |
| `secondary_keys` AND ANY / NOT ANY / AND ALL / NOT ALL, `@@additional_keys`, `@@exclude_keys` | `when` with `hit()`: `hit('a') \|\| hit('b')`, `!hit('a') && !hit('b')`, `hit('a') && hit('b')`, `!(hit('a') && hit('b'))` |
| `insertion_order` | the entry's place in `entries` |
| `priority` (V2), importance | `priority`, rescaled to 0–100 |
| Position before/after character, `@D` depth, `@@depth` | `"context"`, a number |
| `scan_depth`, `@@scan_depth` | `scanDepth` |
| `probability` | `chance` = probability ÷ 100 |
| `group`, `groupWeight`, `groupOverride` | `group`, `weight`, a higher `priority` |
| `vectorized` | `pull`, with `title` from the entry's comment or first key |
| `sticky`, `cooldown`, `delay` (in messages) | `sticky`, `cooldown` in rounds (about half), `when: "turn >= N"` |
| `@@activate_only_after N`, `@@activate_only_every N` | `when: "turn >= N"`, `when: "turn % N == 0"` |
| `@@is_greeting N` (0 is `first_mes`) | `when: "opening == 'greeting_<N+1>'"` |
| `@@ignore_on_max_context` | `priority: 0` |
| `{{char}}`, `{{user}}`, `{{// …}}` | the same |
| `<bot>`, `<user>` | `{{char}}`, `{{user}}` |
| `{{pick::…}}`, `{{random::…}}` | `{{pick::…}}`, fixed for the session |
| Recursion, other macros, decorators, regex scripts | Reported; the source is kept in `ext`. Give an entry that recursion activated the keys of the entries that mention it. |
| SillyTavern chat JSONL | A session: `is_user` lines become `player` messages, `name` becomes `speaker`, swipes become siblings |

## Exporting to Character Card V3

A bundle's first character exports with a lossy mapping: `name`, `description`, the openings with `content` of the first scenario whose cast includes it as `first_mes` and `alternate_greetings`, its `premise` as `scenario`, `authors` as `creator`, examples as `mes_example`, entries without `when` as a `character_book` (keys, constant, position and depth), and the whole bundle under `extensions.troupe`. Apps that read `extensions.troupe` restore the original exactly.

To let Character Card V3 apps read a Troupe PNG (Format 14.4), an exporter can add a `ccv3` chunk with this card beside the `troupe` chunk. Troupe readers ignore it.
