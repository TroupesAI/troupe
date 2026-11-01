# Character Card V2/V3 and Troupe

This guide maps [Character Card V2](https://github.com/malfoyslastname/character-card-spec-v2/blob/main/spec_v2.md) and [V3](https://github.com/kwaroran/character-card-spec-v3/blob/main/SPEC_V3.md) cards to Troupe and back, for importers and exporters. It is informative; [Troupe Format](../spec/format.md) is normative.

## Importing Character Card V2/V3

Each card becomes a story with one character and a scenario `main` that holds its openings. Card data with no Troupe field is kept in the `ext` of the object it belongs to, under `card`.

| Source | Troupe |
| --- | --- |
| `name`, `nickname` | `name` (the nickname if set), the other in `aliases` |
| `description`, `personality` | `description`, with personality under `## Personality` |
| `first_mes`, `alternate_greetings` | The scenario's `openings` `greeting_1`, `greeting_2`, … |
| `scenario` | The scenario's `premise` |
| `group_only_greetings` | Openings of a second scenario, `ensemble`, whose cast the author completes |
| `mes_example` | `examples`, split at `<START>` and parsed by speaker |
| `system_prompt` | An entry with `position: "system"` and `knownBy: ["<id>"]`; `{{original}}` is dropped |
| `post_history_instructions` | An entry with `depth: 0` and `knownBy: ["<id>"]`; `{{original}}` is dropped |
| `extensions.depth_prompt` | An entry with its `depth` and `knownBy: ["<id>"]`; the role is dropped |
| `extensions.talkativeness` | `ext` |
| `creator_notes`, `tags`, `creator`, `character_version` | The scenario's `briefing`; the story's `tags`, `authors`, `version` |
| `source` | Links in `credits` |
| `assets` icon / background | `avatar` / a location `image`; other assets in `ext` |
| Lorebook entries | Character entries, or a world named after the book |
| `keys`; `constant` or `@@activate`; `enabled: false` or `@@dont_activate` without `@@activate` | `keywords`; no keywords; `disabled`. An entry with no keys that is neither constant, vectorized nor marked `@@activate` never activates, so it is `disabled` too |
| SillyTavern regex keys `/p/flags` | The same keyword, keeping only the flags `i`, `m` and `s`; a keyword with other forms (Format 14), such as a lookahead or a backreference, is rewritten or kept in `ext` |
| `case_sensitive`, `match_whole_words: false` | A regex keyword of the escaped key: `/key/` when case-sensitive, else `/key/i`, with `\b` before and after it for whole words, which suits keys in ASCII letters |
| `secondary_keys` AND ANY / NOT ANY / AND ALL / NOT ALL, `@@additional_keys`, `@@exclude_keys` | `when` with `hit()`: `hit('a') \|\| hit('b')`, `!hit('a') && !hit('b')`, `hit('a') && hit('b')`, `!(hit('a') && hit('b'))` |
| `insertion_order` | the entry's place in `entries` |
| `priority` | `priority`, rescaled to 0–100 |
| Position before/after character | `"context"` |
| Position `@D` at a depth, `@@depth` | `depth` |
| `scan_depth`, `@@scan_depth` | `scanDepth` |
| `probability`, unless `useProbability` is `false` | `chance` = probability (0–100) |
| `group`, `group_weight`, `group_override` | `group` (as an ID), `weight`, a higher `priority`; of several comma-separated groups, the first, with the others in `ext` |
| `vectorized` | `retrievable`, with `title` from the entry's comment or first key |
| `sticky`, `cooldown`, `delay` (in messages) | `sticky`, `cooldown`, `when: "round >= N"`, each converted to rounds (about half the messages) |
| `@@activate_only_after N`, `@@activate_only_every N` | `when: "round >= N"`, `when: "round % N == 0"` |
| `@@is_greeting N` (0 is `first_mes`) | `when: "opening == 'greeting_<N+1>'"` |
| `@@ignore_on_max_context` | `priority: 0` |
| `{{char}}`, `{{user}}` in any case, such as `{{Char}}`; `{{// …}}` | `{{char}}`, `{{player}}`, `{{// …}}`, since SillyTavern macros ignore case |
| `<char>`, `<bot>`, `<user>` in any case | `{{char}}`, `{{char}}`, `{{player}}` |
| `{{pick:…}}`, `{{random:…}}`, with `:` or `::` | `{{pick::a::b}}`, split at `::`, or at unescaped commas when there is no `::`; outside roots it picks again each time the text resolves, unlike SillyTavern's stable `pick` |
| Other macros, such as `{{time}}` and `{{roll:…}}` | Escaped as `\{{…}}`, or rewritten as plain text; the source is kept in `ext` |
| Recursion, other decorators, regex scripts | Not mapped; the source is kept in `ext`. To replace recursion, add to an entry the keywords of the entries whose text mentions one of its keywords. |
| SillyTavern chat JSONL | A session. The chat's first character message, the greeting, becomes a root made from the matching opening: a system message with `opening`, and its swipes roots made from the other greetings. `is_user` lines become `player` messages spoken by the persona, a header character named after the `name` of its `is_user` lines, with a description the importer writes, listed in `players`; other lines `model` messages, with the character whose name matches `name` as `speaker` and `char`, and swipes become siblings. `is_system` lines are `hidden`. Player and model text is stored as written. |

## Exporting to Character Card V3

A story's first character exports with a lossy mapping, the import table in reverse where it can be. The original story, exactly as it was, goes under `extensions.troupe`.

| Troupe | Character Card V3 |
| --- | --- |
| `name`, the first alias, `description`, `examples`, `avatar` | `nickname` and `name`, or `name` alone without aliases; `description`, `mes_example`, the icon asset |
| The openings with `content` of the first scenario whose cast includes it; its `premise`, `briefing` | `first_mes` and `alternate_greetings`; `scenario`, `creator_notes` |
| The story's `authors`, `tags`, `version` | `creator`, `tags`, `character_version` |
| Its own entry with `position: "system"`, known only by it | `system_prompt` |
| Its own entry with `depth: 0`, known only by it | `post_history_instructions` |
| Its other entries without `when` | `character_book` entries: keys, constant, position, and `enabled: false` for `disabled`; in the entry's `extensions`, as SillyTavern reads them, `depth` with `position: 4`, `probability`, `sticky` and `cooldown` in messages (about double the rounds), and `vectorized` for `retrievable` |
| Its entries whose `when` is one of the `hit()` forms above | `character_book` entries likewise, with `secondary_keys` and `selective: true`, and the matching `selectiveLogic` in `extensions` |
