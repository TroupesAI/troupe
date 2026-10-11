# Troupe authoring guide

This guide is informative. It shows how to build common stories from Troupe's primitives, and gives a one-page brief for people and for LLMs asked to write Troupe files. [Troupe Format](../spec/format.md) and [Troupe Play](../spec/play.md) are the normative documents; "Format 12.5" means section 12.5 of Troupe Format.

## Patterns

Most needs compose from entries, variables, events and conditions.

### Author's notes and player limits

Players' lines and veils go in the session's `limits`, which apps apply to every generation, media included. An author's note is a session entry on the root, placed in `system`:

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
{ "id": "alarm_tick", "when": "ago('alarm_tick') >= 3", "compute": { "alarm": "state.alarm + 1" } },
{ "id": "alarm_full", "when": "state.alarm >= 4", "once": true, "direct": "The alarm bells start ringing. Guards flood the halls." }
```

`alarm` is a one-way `int`. Time of day is a one-way `int` `clock` in hours with derived views: `{"id": "day", "type": "int", "derive": "state.clock / 24 + 1", "description": "The day."}`.

### Phases and beats

An `enum` `phase`, entries gated on it, and events that advance it when a beat is done. A beat written in plain words is a model-set one-way `bool` (Play 3.4).

### Timed statuses

`ago()` covers change keys, so a status can expire without bookkeeping: `"when": "own.mood == 'upset' && ago('kai.mood') < 3"`. String literals like `'kai.mood'` need rewriting if Kai is renamed.

### Checks and dice

A check rolls when someone attempts something risky, and the reply narrates the result. The tracker records the attempt on the player's message, and an event `on: "player"` rolls for it before the reply. `attempt` is a scenario `enum` with `values` `["none", "lock"]` and `by: ["model"]`; `picked` is a scenario `bool` labeled "opens" and "holds":

```json
{ "id": "pick_lock", "on": "player", "when": "state.attempt == 'lock'",
  "set": { "attempt": "none" },
  "compute": { "picked": "roll(20) >= 12" },
  "direct": "The lock {{state.picked}}. Narrate it." }
```

This needs an app that runs the tracker after player messages (Play 3.4). Random encounters are an event with weighted `outcomes`.

### A hidden truth

A mystery's culprit is chosen once by an event with one outcome per suspect, `"when": "state.culprit == ''"`, and `culprit` is a `spoiler`. Clues are scenario entries with `knownBy: ["narrator"]` gated on `state.culprit`, so in `mixed` mode the narrator plants them and the suspects never see them. Each suspect carries `{"knownBy": ["<id>", "narrator"], "when": "state.culprit == self"}` for their own guilt. A reveal pairs a private entry with a public one gated on a model-set `bool`, as Format Appendix B.2 does with `master_key` and `key_known`.

### Inventory

A `set` without `values` holds free-form items: `["rope", "a silver chalice"]`. For quantities, use an `int` with `of: "*"` and `min: 0`: `{"inventory.torch": 2}`. Setting a key back to 0 removes it, and keys render with underscores as spaces.

### Rosters and newcomers

Make the people who matter characters, with a `summary` for when they are mentioned offstage, and the rest world entries keyed on their names. Openings decide who starts present. The tracker may introduce someone new, who joins the session's characters with their own description and entries; a `tracker` entry tells it when.

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

Mark the ghost's cast member `spoiler`, and nobody sees it in the cast list before the players walk into the cellar. Until then it is offstage, so the model knows nothing about it. Openings should set `scene.location`, so the event sorts presence at the root. Like any event, it fires at most once per round, so presence follows the first move in a round.

### Companions that remember

Give a companion `carry` variables for the relationship, such as `{"id": "closeness", "type": "int", "min": 0, "max": 100, "by": ["model"], "carry": true, "description": "How close {{char}} feels to {{user}}."}`, and let the tracker add memories as session entries with `carry` and `pull`. A chronicle (Format 13) then takes both into every later session, in any app.

### Time awareness

`elapsed`, `hour` and `weekday` let a companion notice time: `{"id": "late_night", "when": "hour >= 0 && hour < 5", "text": "It is the middle of the night where {{user}} is."}`.

### Point-in-time canon

A one-way `enum` `chapter`, with entries gated on it, keeps a canon character from knowing events after their moment in the story.

### Group chats from several bundles

Copy the characters into a new bundle, credit their authors in `credits`, add a scenario with a cast, and rename clashing IDs (Format 12.5). Each character brings its own entries, variables and events, and keeps using them through `own` and `self`.

## Authoring brief

One page for people and for LLMs asked to write Troupe files.

**A complete card:**

```json
{
  "troupe": "0.11",
  "kind": "bundle",
  "characters": [{
    "id": "mira",
    "name": "Mira",
    "description": "A sarcastic starship engineer.",
    "entries": [
      { "id": "ship", "keys": ["Kestrel"], "text": "The Kestrel is Mira's patched-up freighter." },
      { "id": "debt", "knownBy": ["mira"], "text": "Mira owes the Corvane syndicate money." }
    ]
  }],
  "scenarios": [{
    "id": "kestrel",
    "openings": [{ "id": "docked", "content": [{ "speaker": "mira", "text": "*She doesn't look up.* It's supposed to sound like that." }] }]
  }]
}
```

**Shapes.** IDs start with a lowercase letter and use only `a–z`, `0–9` and `_`, at most 64 characters. Openings belong to scenarios and are `{"id", "content"}`, or `{"id", "title"}` for one the model writes; `content` and event `message` are arrays of parts, `[{"speaker": "mira", "text": "…"}]`, never strings. `examples` is an array of exchanges, each an array of `{"speaker": "char" | "user" | id, "text"}`. Text is Markdown, never HTML; put a character's actions in italics in their own part.

**Macros.** `{{char}}` is the character the text belongs to and `{{user}}` the player's character. `{{state.bell}}` and `{{own.nerve}}` show values; `{{@kai}}` shows a name. Name other characters with `{{@kai}}` rather than writing "Kai", so renames and recasts keep working.

**Entries:** `{"id", "text"}` is always on. Add `keys` to activate on words, `position: "system"` for rules, `knownBy: ["id"]` for secrets or one character's instructions, `when` for conditions, `priority` (0–100, 100 never dropped).

**Scenarios** hold `openings` and, for stories, `cast` (an object without `character` is a player seat; the default is one seat and every character), `premise`, `entries`, `variables` and `events`.

**Variables** need `id`, `type` (`bool`, `int`, `number`, `string`, `enum` with `values`, or `set`) and `description`. Give `by: ["model"]` for values the story should update, and `of: "characters"` for one value per character. Read a scenario's variable as `state.bell`, a character's own as `own.nerve`, and another character's as `state.kai.nerve`.

**Events** need `id` and `when`. `set` takes plain values; `compute` takes CEL strings. Durations count rounds: one player message and the replies to it. An event `on: "player"` runs before the reply, so it can roll for what the player attempted and `direct` the reply.

**Traps:**

1. `set` takes plain values: `"set": {"hp": 10}`. Expressions go in `compute`: `"compute": {"hp": "state.hp - 1"}`.
2. A character's entries reach every character present unless `knownBy` is set. Put secrets in `knownBy` entries.
3. Inside CEL, strings use single quotes: `"when": "state.phase == 'escape'"`. Look up a computed key with brackets: `state.trust[char]`.
4. Numbers in CEL arithmetic match the variable's type: `state.trust - 0.1` for a `number`, `state.hp - 1` for an `int`.
5. `chance` is 0–1, not a percentage. `weight` and `priority` are integers.
6. A numeric `position` is a depth in history, not an order; write `4`, not `"4"`.
7. Without `by`, only openings and events can change a variable.
8. An entry, a variable and an event of the same owner can't share an ID.
9. `knownBy: ["narrator"]` is for the narrator alone; an explicit `knownBy` hides an entry from the narrator unless it lists `narrator`. Narrator-only clues belong to the scenario, because a character's entries only count while they are present.
10. Characters can't be called `char`, `user`, `narrator`, `session`, `state`, `scene`, `players` or `own`; no ID can be a CEL word such as `var`, `loop`, `function` or `package`.
11. Leave the player's character out unless the story defines it; then mark its cast member `player`.
12. Don't write `null`. Leave fields out.

Validate the result against `bundle.schema.json` and fix every error before returning it.
