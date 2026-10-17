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
| `post_history_instructions` | An entry with `depth: 0` and `knownBy: ["<id>"]` |
| `extensions.depth_prompt` | An entry with its `depth` and `knownBy: ["<id>"]`; the role is dropped |
| `extensions.talkativeness` | `ext` |
| `creator_notes`, `tags`, `creator`, `character_version` | The scenario's `briefing`; the bundle's `tags`, `authors`, `version` |
| `source` | Links in `credits` |
| `assets` icon / background | `avatar` / a location `image`; other assets in `ext` |
| Lorebook entries | Character entries, or a world named after the book |
| `keys`, `constant`, `enabled` | `keys`, no keys, `disabled` |
| SillyTavern regex keys `/p/flags` | The same key, keeping only the flags `i`, `m` and `s` |
| `case_sensitive`, `match_whole_words: false` | A regex key of the escaped key: `/\bkey\b/` for a case-sensitive whole word, `/key/i` for part of a word, `/key/` for both |
| `secondary_keys` AND ANY / NOT ANY / AND ALL / NOT ALL, `@@additional_keys`, `@@exclude_keys` | `when` with `hit()`: `hit('a') \|\| hit('b')`, `!hit('a') && !hit('b')`, `hit('a') && hit('b')`, `!(hit('a') && hit('b'))` |
| `insertion_order` | the entry's place in `entries` |
| `priority` (V2), importance | `priority`, rescaled to 0–100 |
| Position before/after character | `"context"` |
| Position `@D` at a depth, `@@depth` | `depth` |
| `scan_depth`, `@@scan_depth` | `scanDepth` |
| `probability` | `chance` = probability (0–100) |
| `group`, `groupWeight`, `groupOverride` | `group`, `weight`, a higher `priority` |
| `vectorized` | `pull`, with `title` from the entry's comment or first key |
| `sticky`, `cooldown`, `delay` (in messages) | `sticky`, `cooldown`, `when: "turn >= N"`, counted in rounds (about half the messages) |
| `@@activate_only_after N`, `@@activate_only_every N` | `when: "turn >= N"`, `when: "turn % N == 0"` |
| `@@is_greeting N` (0 is `first_mes`) | `when: "opening == 'greeting_<N+1>'"` |
| `@@ignore_on_max_context` | `priority: 0` |
| `{{char}}`, `{{user}}` in any case, such as `{{Char}}`; `{{// …}}` | `{{char}}`, `{{user}}`, `{{// …}}`, since SillyTavern macros ignore case |
| `<bot>`, `<user>` | `{{char}}`, `{{user}}` |
| `{{pick::…}}`, `{{random::…}}` | `{{pick::…}}` |
| Other macros, such as `{{time}}`, `{{roll:…}}` and `{{original}}` | Escaped as `\{{…}}`, or rewritten as plain text; the source is kept in `ext` |
| Recursion, decorators, regex scripts | Not mapped; the source is kept in `ext`. To replace recursion, add to an entry the keys of the entries whose text mentions it. |
| SillyTavern chat JSONL | A session. The chat's first character message, the greeting, becomes a root made from the matching opening: a system message with `opening`, and its swipes roots made from the other greetings. `is_user` lines become `player` messages, other lines `model` messages, with the character whose name matches `name` as `speaker` and `char`, and swipes become siblings. Player and model text is stored as written. |

## Exporting to Character Card V3

A bundle's first character exports with a lossy mapping, the import table in reverse where it can be. The original bundle, exactly as it was, goes under `extensions.troupe`.

| Troupe | Character Card V3 |
| --- | --- |
| `name`, `aliases`, `description`, `examples`, `avatar` | `name`, `nickname` (the first alias), `description`, `mes_example`, the icon asset |
| The openings with `content` of the first scenario whose cast includes it; its `premise`, `briefing` | `first_mes` and `alternate_greetings`; `scenario`, `creator_notes` |
| The bundle's `authors`, `tags`, `version` | `creator`, `tags`, `character_version` |
| Its own entry with `position: "system"`, known only by it | `system_prompt` |
| Its own entry with `depth: 0`, known only by it | `post_history_instructions` |
| Its other entries without `when` | `character_book` entries: keys, constant, position or depth, probability, sticky and cooldown in messages (about double the rounds), `enabled: false` for `disabled` |
| Its entries whose `when` is one of the `hit()` forms above | `character_book` entries likewise, with secondary keys and the matching selective logic |
