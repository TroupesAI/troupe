# Troupe authoring guide

This guide is informative. It shows how to build common stories from Troupe's primitives. The [authoring brief](authoring-brief.md) is a one-page summary for people and for LLMs asked to write Troupe files. [Troupe Format](../spec/format.md) is the normative document; "Format 7.2" means its section 7.2.

## Patterns

Most needs compose from entries, variables and conditions.

### Author's notes and player limits

Players' lines and veils go in the session's `limits`, which hold for the whole chat. An author's note is a session entry on the root, placed in `system`:

```json
{ "id": "note", "position": "system", "text": "Keep the pace slow; let silences land." }
```

Replacing it later is another session entry with the same ID, and `"disabled": true` removes it. A reminder every few rounds is `"when": "turn % 4 == 0"` with a `depth`.

### Goals and arcs

A scenario `enum` `phase` tracks where the story is, and a model moves it on when its description says a phase is done:

```json
{ "id": "phase", "type": "enum", "values": ["setup", "heist", "escape"], "by": ["model"], "oneWay": true,
  "description": "The story's phase: setup until the crew enters the manor, heist until they hold the lantern, then escape." }
```

Entries gated on it give each phase its goals and direction:

```text
{ "id": "goal_setup", "knownBy": ["elena"], "when": "state.phase == 'setup'", "text": "Elena wants to prove the plan works without Kai." },
{ "id": "goal_escape", "knownBy": ["elena"], "when": "state.phase == 'escape'", "text": "Elena will protect Kai at any cost." }
```

`oneWay` keeps the phase moving forward through its `values`. A smaller beat written in plain words is a model-set one-way `bool`, as Format Appendix B.2 does with `kai_confessed`.

### Relationships

A character's feelings toward everyone in the cast are its own keyed variable:

```json
{ "id": "feelings", "type": "int", "of": "cast", "min": -100, "max": 100, "by": ["model"], "maxStep": 15,
  "description": "How {{char}} feels about each person." }
```

An entry on the character shows its feelings toward the player's character: `{"id": "toward", "knownBy": ["kai"], "text": "{{char}} toward {{user}}: {{own.feelings.user}}."}`. Its conditions read a key with brackets: `"when": "own.feelings[user] < -50"`.

### Inventory

A `set` without `values` holds free-form items: `["rope", "a silver chalice"]`. For quantities, use an `int` with `of: "*"` and `min: 0`, changed as `{"state.inventory.torch": 2}`. Setting a key back to 0 removes it, and keys render with underscores as spaces.

### Rosters and newcomers

Make the people who matter characters, with a `summary` for when they are offstage, and the rest world entries keyed on their names. An opening's `set` can list who starts present. Someone new who appears during a chat joins the session's characters, with a name, description and summary.

### Companions that remember

Give a companion its own variables for the relationship, such as `{"id": "closeness", "type": "int", "min": 0, "max": 100, "by": ["model"], "description": "How close {{char}} feels to {{user}}."}`, and add memories as session entries with `pull` and a `title` (Format 11.3), so each comes back only when it matters. A memory belongs to its branch, and a later entry with the same ID replaces it.

### Time awareness

`elapsed`, `hour` and `weekday` let a companion notice time. `hour` and `weekday` read the local time at the offset of the message's `at`, and are −1 when it has none: `{"id": "late_night", "when": "hour >= 0 && hour < 5", "text": "It is the middle of the night where {{user}} is."}`. `"when": "elapsed >= 86400"` notices that the player has been away for a day.

### Point-in-time canon

A one-way `enum` `chapter`, with entries gated on it, keeps a canon character from knowing events after their moment in the story.

### Group chats from several bundles

Copy the characters into a new bundle, credit their authors in `credits`, add a scenario with a cast, and rename clashing IDs. In a bundle, a renamed ID appears in:

- cast members, `knownBy`, speakers, example speakers, `scenario.worlds` and location `parent`;
- `of` lists and the keys of `initial` objects;
- opening `set` keys and values: `state.kai.nerve`, `state.trust.kai`, `scene.present`, `scene.location`;
- enum and set `values`, their `labels`, and string state values that hold character or location IDs;
- `state` and `own` macro paths at any segment, such as `{{state.trust.kai}}` and `{{own.feelings.kai}}`;
- CEL member paths such as `state.kai.nerve`, and string literals in CEL that name it, such as `'kai' in scene.present`.

Each character brings its own entries and variables, and keeps using them through `own` and `self`.
