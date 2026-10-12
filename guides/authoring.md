# Troupe authoring guide

This guide is informative. It shows how to build common stories from Troupe's primitives. The [authoring brief](authoring-brief.md) is a one-page summary for people and for LLMs asked to write Troupe files. [Troupe Format](../spec/format.md) is the normative document; "Format 7.2" means its section 7.2.

## Patterns

Most needs compose from entries, variables, events and conditions.

### Author's notes and player limits

Players' lines and veils go in the session's `limits`, which hold for the whole chat. An author's note is a session entry on the root, placed in `system`:

```json
{ "id": "note", "position": "system", "text": "Keep the pace slow; let silences land." }
```

Replacing it later is another session entry with the same ID. A reminder every few rounds is `"when": "turn % 4 == 0"` with a numeric position.

### Goals and arcs

```text
{ "id": "goal_setup", "knownBy": ["elena"], "when": "state.phase == 'setup'", "text": "Elena wants to prove the plan works without Kai." },
{ "id": "goal_escape", "knownBy": ["elena"], "when": "state.phase == 'escape'", "text": "Elena will protect Kai at any cost." }
```

A one-way `enum` `phase` only moves forward through its `values`.

### Relationships

A character's feelings toward everyone else are its own keyed variable:

```json
{ "id": "feelings", "type": "int", "of": "others", "min": -100, "max": 100, "by": ["model"], "maxStep": 15,
  "description": "How {{char}} feels about each person." }
```

An entry on the character shows its feelings toward the player's character: `{"id": "toward", "knownBy": ["kai"], "text": "{{char}} toward {{user}}: {{own.feelings.user}}."}`.

### Clocks, fronts and derived time

```text
{ "id": "alarm_tick", "when": "turn > 0 && ago('alarm_tick') >= 3", "compute": { "alarm": "state.alarm + 1" } },
{ "id": "alarm_full", "when": "state.alarm >= 4", "once": true, "direct": "The alarm bells start ringing. Guards flood the halls." }
```

`alarm` is a one-way `int`. Time of day is a one-way `int` `clock` in hours with derived views: `{"id": "day", "type": "int", "derive": "state.clock / 24 + 1", "description": "The day."}`.

### Phases and beats

An `enum` `phase`, entries gated on it, and events that advance it when a beat is done. A beat written in plain words is a model-set one-way `bool`.

### Timed statuses

`ago()` covers change keys, so a status can expire without bookkeeping: `"when": "own.mood == 'upset' && ago('kai.mood') < 3"`. String literals like `'kai.mood'` need rewriting if Kai is renamed.

### Checks and dice

A check rolls when someone attempts something risky, and the reply narrates the result. A model records the attempt on the player's message, and an event `on: "player"` rolls for it. `attempt` is a scenario `enum` with `values` `["none", "lock"]` and `by: ["model"]`; `picked` is a scenario `bool` labeled "opens" and "holds":

```json
{ "id": "pick_lock", "on": "player", "when": "state.attempt == 'lock'",
  "set": { "attempt": "none" },
  "compute": { "picked": "roll(20) >= 12" },
  "direct": "The lock {{state.picked}}. Narrate it." }
```

The label makes the direction read "The lock opens." or "The lock holds.", and the roll is recorded, so the model can't change it. Random encounters are an event with weighted `outcomes`.

### A hidden truth

A mystery's culprit is chosen once by an event with one outcome per suspect, `"when": "state.culprit == ''"`, and `culprit` is a `spoiler`. Clues are scenario entries with `knownBy: ["narrator"]` gated on `state.culprit`, so the narrator plants them and the suspects never see them. Each suspect carries `{"knownBy": ["<id>", "narrator"], "when": "state.culprit == self"}` for their own guilt. A reveal pairs a private entry with a public one gated on a model-set `bool`, as Format Appendix B.2 does with `master_key` and `key_known`.

### Inventory

A `set` without `values` holds free-form items: `["rope", "a silver chalice"]`. For quantities, use an `int` with `of: "*"` and `min: 0`: `{"inventory.torch": 2}`. Setting a key back to 0 removes it, and keys render with underscores as spaces.

### Rosters and newcomers

Make the people who matter characters, with a `summary` for when they are offstage, and the rest world entries keyed on their names. An opening's `set` can list who starts present. Someone new who appears during a chat joins the session's characters, with a name, description and summary.

### Whereabouts and hidden characters

A scenario variable records where each character waits, and one event brings whoever is there into the scene when the location changes. Characters who go along with the players have `""`:

```json
{ "id": "where", "type": "string", "of": "cast", "initial": { "*": "", "ghost": "cellar" }, "by": ["model"],
  "description": "Where each character stays when not with {{user}}; empty for those who go along." }
```

```json
{ "id": "arrive", "when": "ago('scene.location') == 0 && scene.location != ''",
  "compute": { "scene.present": "scene.present.filter(c, state.where[c] == '') + state.where.filter(c, state.where[c] == scene.location)" } }
```

Mark the ghost's cast member `spoiler`, a secret until the players walk into the cellar. Until then it is offstage. Openings should set `scene.location`, so the event can sort presence from the start. Like any event, it fires at most once per round, so presence follows the first move in a round.

### Companions that remember

Give a companion `carry` variables for the relationship, such as `{"id": "closeness", "type": "int", "min": 0, "max": 100, "by": ["model"], "carry": true, "description": "How close {{char}} feels to {{user}}."}`, and let a model add memories as session entries with `carry`, and `pull` with a `title`. A chronicle (Format 13) then takes both into every later session, in any app.

### Time awareness

`elapsed`, `hour` and `weekday` let a companion notice time: `{"id": "late_night", "when": "hour >= 0 && hour < 5", "text": "It is the middle of the night where {{user}} is."}`.

### Point-in-time canon

A one-way `enum` `chapter`, with entries gated on it, keeps a canon character from knowing events after their moment in the story.

### Group chats from several bundles

Copy the characters into a new bundle, credit their authors in `credits`, add a scenario with a cast, and rename clashing IDs. In a bundle, a renamed ID appears in cast members, `knownBy`, speakers, example speakers, `scenario.worlds`, location `parent`, `of` lists, keyed variable keys, the character keys of `initial` objects, keys and `scene` values in openings and events, `{{@id}}`, `state` and `own` macro paths at any segment, with or without `@` (`{{state.trust.kai}}`, `{{own.feelings.kai}}`), and CEL member paths such as `state.kai.nerve`; string literals in CEL that name it need a look too. Each character brings its own entries, variables and events, and keeps using them through `own` and `self`.
