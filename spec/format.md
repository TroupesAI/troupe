# Troupe Format

**Version 0.12 (draft)** · October 12, 2026

Troupe is an open file format for AI roleplay: characters, the worlds they live in, the scenarios that bring them together, the mechanics that drive a story, and sessions: the chats people play, with every outcome recorded. One file can hold a single character or a full multi-character story.

This document defines the files and what every field means.

> **Status.** This is a draft. Breaking changes are allowed until 1.0. A conformance suite accompanies this draft.

## Contents

1. [Overview](#1-overview)
2. [Conventions](#2-conventions)

**Part I: Authoring**

3. [Bundle](#3-bundle)
4. [Character](#4-character)
5. [World](#5-world)
6. [Scenario](#6-scenario)
7. [Entries](#7-entries)
8. [Variables](#8-variables)
9. [Events](#9-events)
10. [Macros](#10-macros)
11. [Conditions](#11-conditions)

**Part II: Sessions**

12. [Session format](#12-session-format)
13. [Reserved](#13-reserved)

**Part III: Interchange**

14. [Files and packaging](#14-files-and-packaging)
15. [Extensions and versioning](#15-extensions-and-versioning)
16. [Security and limits](#16-security-and-limits)
17. [Conformance](#17-conformance)

**Appendices:** [A Schemas](#appendix-a-json-schemas) · [B Examples](#appendix-b-examples) · [C Design decisions](#appendix-c-design-decisions) · [D Future work](#appendix-d-future-work) · [E References](#appendix-e-references)

---

## 1. Overview

### 1.1 Goals

- **Recorded.** Every outcome is recorded in the session, so its state never depends on how it was played.
- **Small.** A few primitives that compose.
- **Multi-character.** Casts, several players, narrators and per-character knowledge are built in, and characters stay self-contained when combined.
- **Mechanics without code.** Stats, clocks, inventories, beats and random outcomes are declared, never scripted.
- **Model-agnostic and safe to share.** Files hold data and sandboxed conditions, never scripts or model-specific syntax.

Non-goals: how apps play files (prompt assembly, entry selection, running events, model calls and their output), prompt templates and sampler settings, image and voice generation, app UI, accounts, sync and scripting.

### 1.2 Documents

This document and its JSON Schemas (Appendix A) are the normative parts of Troupe: the files, their fields and what they mean, identifiers and references, packaging, versioning, limits, and the checks a valid file passes. The schemas are normative for structure, the prose for meaning. Appendices B to D and the [guides](../README.md#guides) are informative; Appendix E lists references. "Format 7.2" means section 7.2 of this document, as the guides and the conformance suite cite it.

### 1.3 Object model

```text
Bundle  (.troupe.json)
├── characters[]   identity, entries, own mechanics
├── worlds[]       locations, entries, own mechanics
└── scenarios[]    cast, openings, entries, variables, events

Session  (.troupe-session.jsonl)  a header and a forest of messages
```

Five ideas carry the format:

1. **Entries** are all conditional text for the model: lore, instructions, secrets, goals, notes and memories (section 7).
2. **Variables** hold typed state. Events, players or a model change them, and every change is recorded (section 8).
3. **Events** react to state with changes, messages and directions (section 9).
4. **Conditions** in CEL gate entries and events (section 11).
5. **Sessions** are message trees that record every outcome (section 12).

### 1.4 A first example

This is a complete card: a character, and a scenario that starts a chat with them. Each opening is an alternative first message.

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

Appendix B builds up to a full story with lore, a group, state and events.

---

## 2. Conventions

### 2.1 Requirement keywords

MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are used as described in RFC 2119 and RFC 8174, and only when written in capitals.

### 2.2 Values

- Documents are I-JSON (RFC 7493): UTF-8 without a byte order mark, no duplicate member names, no surrogate or noncharacter code points, written or escaped, numbers that fit an IEEE 754 double, and integer fields and `int` values within ±(2^53 − 1). Writers write integers without a fraction or exponent.
- **Empty values.** `null` never appears in a field this spec defines or in a state value, and `""`, `[]` and `{}` never appear in an optional field other than `ext`: an optional field without a value is left out. State values and `scenario.worlds` are the exception: there `""`, `[]` and `{}` are values. Names and variable descriptions are never empty.
- **Defaults are normative.** Every default stated in this document or its TypeScript comments applies when a field is absent. Every boolean defaults to `false`, and one written `false` is the same as an absent one.

### 2.3 Identifiers

| Kind | Grammar |
| --- | --- |
| Author IDs: characters, worlds, scenarios, locations, entries, openings, variables, events, groups, variable keys | `^[a-z][a-z0-9_]{0,63}$` |
| Message and bundle IDs | `^[A-Za-z0-9_-]{1,64}$` |

- Author IDs MUST NOT be a CEL reserved word: `as`, `break`, `const`, `continue`, `else`, `false`, `for`, `function`, `if`, `import`, `in`, `let`, `loop`, `namespace`, `null`, `package`, `return`, `true`, `var`, `void`, `while`.
- Characters, worlds and scenarios MUST NOT use the IDs `char`, `user`, `narrator`, `session`, `state`, `scene`, `players` or `own`. Variables MUST NOT be named `scene` or `own`.

| IDs | Unique among |
| --- | --- |
| Characters, worlds, scenarios | All of them, compared in this order: the bundle's characters, worlds and scenarios, then the session's characters and worlds; a session character replacing a bundle character is no duplicate (section 12.2) |
| Scenario variables | Also every character and world ID in the bundle or session |
| Entries, variables and events | Each other within the same owner, compared in that order: a variable or event that reuses an earlier ID is the duplicate. Session entries are unique within each message (section 12.3) |
| Locations | The bundle and the session, compared in world order: the bundle's worlds in array order, then the session's |
| A scenario's cast members and `worlds` | The scenario: each names a character or world once |
| Openings | The same scenario |
| Messages | The session |

### 2.4 References

- Objects refer to each other by plain ID.
- Things owned by a character, world or scenario are named `<owner>/<id>`: entries (`veyra/late_bells`), and the events of characters and worlds (`kai/bolts`). Entries added by messages have the owner `session`. A scenario's own events are named by their plain ID.
- State uses dots instead (section 8): `bell`, `trust.kai`, `kai.nerve`.

### 2.5 Text

Model-facing text is Markdown (CommonMark 0.31.2). Timestamps are RFC 3339 in UTC, with an uppercase `T`, ending in `Z` and without leap seconds, and language tags BCP 47 in canonical case.

---

# Part I: Authoring

## 3. Bundle

A bundle states the spec version and publishing metadata once, then lists its contents in any mix.

```ts
interface Bundle {
  $schema?: string;
  troupe: string;                  // spec version, e.g. "0.12"
  kind: "bundle";
  id?: string;                     // a random ID, such as a UUID; lets sessions find the bundle
  name?: string;                   // the title
  tagline?: string;                // one line about the bundle
  version?: string;                // for people: "1.2", "winter edit"
  authors?: string[];              // who made it
  credits?: string;                // Markdown for people, not models: license, sources, thanks
  language?: string;               // BCP 47
  tags?: string[];
  rating?: "general" | "mature" | "explicit";
  warnings?: string[];             // content warnings, free text
  cover?: string;                  // image (section 14.2)
  characters?: Character[];
  worlds?: World[];
  scenarios?: Scenario[];
  ext?: Ext;
}
```

---

## 4. Character

A character is anyone in a story, played by a model or a person. Everything a character needs travels with it: its entries and its own variables and events.

```ts
interface Character {
  id: string;
  name: string;                    // what people and models call them
  aliases?: string[];              // other names, including a full name
  description: string;             // Markdown
  summary?: string;                // short version, for when they are offstage
  examples?: Line[][];             // sample exchanges
  entries?: Entry[];               // lore, direction, secrets, goals (section 7)
  variables?: Variable[];          // the character's own state, read as own.<id> (section 8)
  events?: Event[];
  avatar?: string;
  ext?: Ext;
}

interface Line {
  speaker?: string;                // "char", "user" or a character ID; absent for narration
  text: string;
  ext?: Ext;
}
```

- **`description`** is everything the model needs to play the character, appearance included. Heading names carry no meaning.
- **`examples`** show how the character talks. `char` is this character and `user` the player's. Examples are never part of history.

---

## 5. World

A world is a setting that scenarios share, with its own entries and mechanics.

```ts
interface World {
  id: string;
  name: string;
  description?: string;            // always-on overview
  locations?: Location[];
  entries?: Entry[];
  variables?: Variable[];          // e.g. time of day, read as own.<id> by the world's entries
  events?: Event[];
  ext?: Ext;
}

interface Location {
  id: string;
  name: string;
  description?: string;
  parent?: string;                 // the containing location; no cycles
  image?: string;
  ext?: Ext;
}
```

---

## 6. Scenario

A scenario is what people open: who is in the story, how it starts, its mechanics and its direction.

```ts
interface Scenario {
  id: string;
  name?: string;
  tagline?: string;
  premise?: string;                // the situation
  briefing?: string;               // for the players, not models
  mode?: "characters" | "narrator";   // "characters"
  narrator?: string;               // what text calls the narrator, in the story's language; "the narrator"
  cast?: CastMember[];             // section 6.1
  worlds?: string[];               // world IDs; every bundle world; [] for none
  openings?: Opening[];            // none = the player writes first
  entries?: Entry[];
  variables?: Variable[];          // shared state, read as state.<id>
  events?: Event[];
  ext?: Ext;
}

interface CastMember {
  character?: string;              // absent = a seat (section 6.1)
  player?: boolean;                // with character: a seat a person plays as written
  notes?: string;                  // scenario-specific context
  spoiler?: boolean;               // a spoiler for players until first present
  ext?: Ext;
}

interface Opening {
  id: string;
  title?: string;                  // the opening's name, for people, not models
  set?: Record<string, Json>;      // starting values, including scene.location and scene.present
  content?: Part[];                // the first message; absent = a model writes it
  ext?: Ext;
}
```

### 6.1 Cast

- The default cast is one player seat followed by every bundle character, in bundle order. A cast may hold only seats. Characters outside the cast take no part in the scenario.
- **Seats** are cast members without `character`, filled by a character the person brings, and members with `player`, which a person plays as written. A seat that no player fills is left out of the cast.

### 6.2 Modes

- **`characters`**: each model-played character speaks in its own messages, written for that character alone. A narrator may also take turns describing the scene.
- **`narrator`**: one voice, the **single voice**, writes the whole scene, including every character's lines.

Every model message is **written for** one character, the narrator or the single voice; its `char` names the character (section 12).

### 6.3 Openings

- Each opening that is played starts its own root message (section 12.1); conditions see the chosen one as `opening`.
- `set` gives starting values, written like a change (section 8.5), with full keys: `{"scene.location": "vault", "bell": 11, "kai.nerve": 2}`. `own.` isn't resolved there.
- **Without `content`**, a model writes the first message, shaped by the opening's `set` and by entries that test `opening`: `{"id": "tavern", "title": "At the tavern", "set": {"scene.location": "tavern"}}`.

### 6.4 What a session uses

The entries, variables and events **in use** in a session are those of the scenario, its worlds, the session's worlds, every cast character, and the session's own entries, each from the message that adds it, on that message's path (section 12.3). Each keeps its owner (section 8.2).

---

## 7. Entries

An entry is a piece of text that reaches the model when its conditions hold: lore, a standing instruction, a style reminder, a secret, a goal, a note, a memory. Every entry has the same shape wherever it lives, and an owner's entries are in the order they are meant to be read.

```ts
interface Entry {
  id: string;
  text: string;
  title?: string;                  // a short name, by which it can be retrieved

  // activation (section 7.2)
  keys?: string[];                 // words that activate it
  pull?: boolean;                  // retrieved on demand when relevant; needs a title
  when?: string;                   // CEL condition that must hold
  scanDepth?: number;              // integer 0–100; messages scanned for keys; 4

  // timing, in rounds (section 12.1)
  once?: boolean;                  // activates at most once on a path
  sticky?: number;                 // integer ≥ 1; stays active this many rounds after activating
  cooldown?: number;               // integer ≥ 1; then can't activate for this many rounds
  chance?: number;                 // 0–1; 1

  // competition
  group?: string;                  // at most one entry per group of the same owner is active
  weight?: number;                 // integer 1–1,000,000; odds among equal priority; 1
  priority?: number;               // integer 0–100; 50

  position?: "system" | "context" | number;   // "context"; an integer ≥ 0 is a depth in history
  knownBy?: string[];              // characters who know it; everyone
  disabled?: boolean;
  ext?: Ext;
}
```

### 7.1 Where entries live

| Owner | Applies |
| --- | --- |
| A world | while the world is in use |
| A character | while the character is present, or a message is written for it |
| A scenario | always |
| A message (`session`) | from that message onward on its path (section 12.3) |

### 7.2 Activation

- An entry **without `keys` or `pull`** is always on, subject to `when`.
- An entry **with `keys`** activates when one appears in its **scanned text**: the last `scanDepth` messages on the path that aren't hidden and have content, each text part known to whoever the message is written for (section 12.5) as its speaker's name and its text. Keys match whole words, ignoring case; a key containing Han, Hiragana, Katakana, Hangul, Thai, Lao, Khmer, Myanmar or Tibetan characters matches anywhere. A key of at least three characters that starts and ends with `/` is a regex (section 16), case-insensitive unless it clears the flag, that matches anywhere: `/dragons?/`, `/(?-i)Kai/`.
- An entry **with `pull`** is retrieved when it is relevant, by its `title` or its text, such as on a model's request or by a search.
- **`when`** narrows any kind. `hit("word")` checks the scanned text as keys do, so `"when": "hit('glass') && !hit('guard')"` expresses AND and NOT; `hit('')` is false.
- **Timing.** `once`, `sticky` and `cooldown` count from the messages that record the entry in `activated` (section 12.4). `chance` is the probability that the entry activates when it otherwise would.
- **`group`** lets at most one entry of the same owner's group be active at a time, the one of highest `priority`, chosen by `weight` among equals.
- **`priority`** is importance: when not every entry can be used, the least important give way first, and an entry of priority 100 never does.

### 7.3 Placement

- `"system"`: standing direction, such as tone, rules or an author's note.
- `"context"` (default): what the model needs to know.
- A number *d*: inside the history, the messages on the path, with *d* of them after it; 0 is after the last, and a depth greater than the history places it before the first.

### 7.4 Knowledge

`knownBy` lists the characters who know an entry, and `narrator` in it names the narrator. Without it, everyone knows the entry; `["narrator"]` makes it narrator-only. The narrator knows everything except content whose `knownBy` leaves it out, and the single voice of `narrator` mode knows everything. Section 12.5 says who knows a message's parts.

---

## 8. Variables

State is what a story tracks: a bell count, trust, an inventory, a phase. Every variable is declared with its type, valid values and who may change it.

```ts
interface Variable {
  id: string;
  type: "bool" | "int" | "number" | "string" | "enum" | "set";
  values?: string[];               // distinct; enum and set only (below)
  labels?: Record<string, string>; // display names for bool, enum and set values; bool uses only "true" and "false"
  min?: number | string;           // int and number only (below)
  max?: number | string;
  initial?: Json;                  // the type's default
  derive?: string;                 // CEL: computed from other state, never recorded
  of?: "characters" | "cast" | "others" | "*" | string[];   // one value per key (section 8.3)
  description: string;             // what it means and what moves it
  by?: ("player" | "model")[];     // who else may change it (below); nobody
  maxStep?: number;                // > 0, int and number only
  oneWay?: boolean;                // only moves forward
  ask?: string;                    // a question asked when a session starts
  spoiler?: boolean;               // the value and its changes are spoilers for players until the story ends
  ext?: Ext;
}
```

### 8.1 Declaring

- **Types.** `bool`, `int`, `number` and `string` hold one JSON value. `enum` holds one of `values`, which it requires. `set` holds distinct strings: members of `values` when given, otherwise any strings. Only `enum` and `set` take `values`. For `int`, numeric `min`, `max` and `maxStep` are integers. `string` variables can't be `oneWay`.
- **Defaults.** Without `initial`: `false`; `0` raised to `min` or lowered to `max`; `""`; the first of `values`; `[]`.
- **`by`** says who besides the rules is meant to change the variable: `player`, the people playing, and `model`, a model's output. Changes `by: "rules"`, from openings and events, and the players' answers to `ask` may change any variable.
- **`min` and `max`** are numbers, or name another numeric variable of the same owner, an `int` for an `int`, that is neither keyed nor derived and whose own bounds, as written, are numbers, such as `"max": "max_hp"`; its current value, or its new value when the same change sets it (section 8.6), is the bound.
- **`maxStep`** is the largest step one change `by: "model"` is meant to take; **`oneWay`** means numbers only rise, a bool only turns true, a set only gains members, and an enum only moves later in `values`. Both apply to each key of a keyed variable. A root's changes are exempt from `oneWay`, so a story may start below a variable's default.
- **Recorded changes apply as written** (section 8.6): no check compares them with `by`, `maxStep` or `oneWay`, which guide whoever records a change.
- **`derive`** makes a read-only variable computed from other state whenever it is read, such as `"derive": "state.clock / 24 + 1"` for the day. Derived variables have no `initial`, `by`, `ask`, `of`, `maxStep` or `oneWay`, can't be changed, and can't read other derived variables (`CEL_ERROR`). A `derive` is evaluated at the evaluation point of whatever reads it, with `self` its owner, `char` `""`, and no `hit()`. Its value is normalized like a recorded value (section 8.6); one whose expression fails at runtime, or that then isn't a valid value (section 8.5), is absent.
- **`ask`** is a question for the players when a session starts; their answer is recorded on the root as a `by: "player"` change. `ask` is not allowed with `of`.

### 8.2 Ownership

A variable belongs to the scenario, world or character that declares it.

| Declared by | Read as | In its owner's own text, conditions and event writes | Change key |
| --- | --- | --- | --- |
| a scenario | `state.bell` | `state.bell` (and `own.bell`) | `bell` |
| a character or world | `state.kai.nerve` | `own.nerve` | `kai.nerve` |

In an owner's own events, a key written `own.nerve` means `kai.nerve`; recorded changes always use the full key. Session entries have no `own`: in their text `{{own.…}}` is left as written, and in their conditions `own` is a `CEL_ERROR`.

### 8.3 Keyed variables

`of` makes a variable a map with one value per key, of any type.

| `of` | Keys |
| --- | --- |
| `"characters"` | every cast character that doesn't fill a seat (sections 6.1, 12.2); a scenario cast character a person takes over (section 12.2) keeps its key |
| `"cast"` | every cast character, players included |
| `"others"` | every cast character except the variable's owner, players included |
| a list, such as `["watch", "guild"]` | those keys |
| `"*"` | any author ID; keys appear when a change sets them, such as `"inventory.torch": 2` |

- Read a key as `state.trust.kai` or `own.feelings.elena`; change it as `trust.kai` or `own.feelings.elena`. In CEL, look up a computed key with brackets: `state.trust[char]`, `own.feelings[user]`. Change keys always name keys literally, so `trust.char` names a key `char`.
- `initial` is one value for every key, or an object, with at least one member, of values by key with `*` as an optional default; keys outside the key set are ignored, and a key without a value or `*` takes the type's default. Every key of the key set, a joiner's included, holds its initial value until a change sets it.
- Keys of `"*"` maps start absent, and `"*"` takes no `initial`. For bounds, `maxStep` and `oneWay`, an absent key counts as the type's default (section 8.1), and setting a key to the default removes it; in CEL an absent key is absent, so test it with `has()` or `in`. Their keys are in code point order.

### 8.4 The scene

The scene is built-in state: `scene.location`, a location ID or `""`, and `scene.present`, the characters who are there, kept in cast order (section 8.6). Every change may set it. Characters who aren't present are offstage.

### 8.5 Keys and values

Opening and event `set`, `compute` and recorded changes write state by key:

- **Keys** are a scenario variable's ID, or an owner and a variable ID, followed by a key for keyed variables: `bell`, `trust.kai`, `kai.nerve`, `kai.feelings.elena`, `scene.location`, `scene.present`.
- **Values** are absolute.
- **Validity.** A key is valid when it is `scene.location` or `scene.present`, or names a variable in use that isn't derived and, for a keyed variable, a key the variable allows. A value is valid when it has the variable's type, uses only listed members, is finite, is an integer within ±(2^53 − 1) for `int` (compared by value, so `8.0`, though writers write `8`, is the integer 8), and is within the value limits of section 16. A numeric value outside `min` and `max` is still valid; it is clamped (section 8.6). A set with duplicate members is valid too; it is normalized. `scene.location` is a location ID of the bundle or session, or `""`; `scene.present` is a list of strings (section 8.6).

### 8.6 State at a message

The state at a message is computed by applying, in order:

1. every variable's initial value; no location; the whole cast present except the joiners (section 12.2);
2. the `changes` of every message on the path from the root to that message, in path order, and within a message in array order.

Recorded and derived values are normalized by every rule below, key by key in code point order of the full keys, and initial values by rules *a* and *c*:

- *a.* A set loses duplicates, keeping each member's first occurrence; a set with `values` is then ordered as declared, and one without keeps that order; `scene.present` loses duplicates and IDs that name no cast character, and is ordered by cast order.
- *b.* A `number` is rounded to the nearest double to the decimal that ECMAScript `Number.prototype.toFixed(6)` produces.
- *c.* A number is raised to `min`, then lowered to `max`; a bound named by a variable that the same change sets is that variable's normalized new value, even when its key comes later, and for initial values it is that variable's normalized initial value. A value already stored isn't clamped again when its bound changes later.

Derived variables are computed from that state when read (section 8.1). Recorded changes are never re-derived: the state of a session doesn't depend on the events, chances or models that produced its changes.

---

## 9. Events

Events are story beats written as rules: when a condition holds, change state, add a message, or direct the next reply.

```ts
interface Event {
  id: string;
  when: string;                    // CEL
  on?: "player" | "model";         // only after this kind of message; any
  once?: boolean;                  // fires at most once on a path
  cooldown?: number;               // integer ≥ 1; rounds blocked after firing
  chance?: number;                 // 0–1; 1
  set?: Record<string, Json>;      // literal values
  compute?: Record<string, string>;   // CEL expressions for computed values
  message?: Part[];                // a message added after the trigger
  direct?: string;                 // a one-time instruction for the next model reply
  end?: boolean;                   // the story is finished
  outcomes?: Outcome[];            // one is chosen at random each time it fires
  ext?: Ext;
}

interface Outcome {
  weight?: number;                 // integer 1–1,000,000; 1
  set?: Record<string, Json>;
  compute?: Record<string, string>;
  message?: Part[];
  direct?: string;
  end?: boolean;
  ext?: Ext;
}
```

- **`set` takes plain values; `compute` takes CEL.** `"set": {"scene.location": "vault"}`, `"compute": {"trust.elena": "state.trust.elena - 0.1"}`. No two keys of one `set` or `compute` name the same full key, such as `own.nerve` and `kai.nerve` (`UNKNOWN_VARIABLE`).
- **Firing.** `when`, `on`, `once`, `cooldown` and `chance` say when an event is meant to fire: after a root, a player or model message, or a records-only message, when `when` holds there; `on` narrows this to player or model messages. It fires at most once per round, only once on a path with `once`, and not within `cooldown` rounds of its last firing.
- **Recording.** A firing is recorded on the message that triggered it as a change `{"by": "rules", "event": name, "set": {…}}`, even when it changes nothing. A firing of an event with `outcomes`, and only such a firing, records the chosen outcome's index as `outcome`. Event messages are system messages, children of the triggering message.
- **`direct`** stays pending until a model message that isn't hidden follows the firing on the path.
- **`end`** marks the story finished at the message where it fired and at every message after it on a path. It changes nothing else.

---

## 10. Macros

Macros are the only substitution in text. `@` turns IDs into names.

| Macro | Resolves to |
| --- | --- |
| `{{char}}` | The character the text belongs to (below) |
| `{{user}}` | The player's character being answered (below) |
| `{{@<id>}}` | That character's name, e.g. `{{@kai}}` |
| `{{state.<path>}}`, `{{own.<path>}}` | A state value, e.g. `{{state.bell}}`, `{{own.nerve}}`, `{{state.trust.char}}` |
| `{{@state.<path>}}`, `{{@own.<path>}}` | The value, with each string that is a character ID, else a location ID, rendered as its name |
| `{{scene.location}}`, `{{@scene.location}}` | The current location's ID, or its name |
| `{{@scene.present}}`, `{{@players}}` | The names of the characters present, or of the players' characters |
| `{{pick::<a>::<b>…}}` | One of the options, chosen at random each time the text resolves |
| `{{// <comment>}}` | Nothing; a note for authors |

- **`{{char}}`** in a message part, an event's `message` included, is the part's `speaker`, else the message's `char`, else it is left as written; in a character's other text, that character; in a cast member's `notes`, its character; in other text, the character a message is written for, or the scenario's `narrator` for the narrator and the single voice. In a state path, a `char` segment after the variable's ID means the same character.
- **`{{user}}`** is the speaker of the first speaking part of the latest player message on the path that has a speaking part, else the first player's character, else it is left as written. In a state path, a `user` segment after the variable's ID means the same character.
- A `char` or `user` path segment that means no character names no key, so the macro renders as nothing.
- **Rendering.** A value with a label renders as its label, with the label's macros resolved; a label substituted while resolving them renders as written. In `{{@…}}`, a label wins over a character's or location's name; a substituted value is never scanned for macros again. Numbers render as ECMAScript `Number.prototype.toString`, booleans as `true` or `false`, lists as items joined by `, ` (an empty list as nothing), and maps as `Name: value` pairs joined by `, `, with keys that are character IDs shown by name and other keys with underscores as spaces. Map keys render in declared order (cast order for characters), and `"*"` keys in code point order.
- **Unresolved.** Text between `{{` and `}}` that is no macro, such as `{{unknown}}`, and a macro naming a variable that isn't declared, as section 11.2 counts declarations, are left as written (`UNKNOWN_MACRO`); an absent key of a declared variable, a path below a value that isn't a map, or a variable whose owner isn't in use renders as nothing.
- **Which state.** Macros in a message resolve at that message: against its state, with `{{user}}` from the path to it. Elsewhere they resolve at the evaluation point (section 11.1). In message parts and in a scenario's text, `own` means `state`.
- **Where.** Macros resolve only in descriptions, summaries, dialogue examples, premises, briefings, notes, entry texts, message parts (openings' and event messages' included), event directions, variable descriptions, questions, labels, and image `alt`. Every other string, such as names, aliases, titles, taglines, warnings, keys, `limits` and expressions, is used as written.
- **Player and model text** is stored escaped: in message parts' `text` and `alt`, in message `summary` text, and in the `text`, `description` and `summary` of entries and characters a model adds, writers MUST write each `\` as `\\` and each `{{` as `\{{`, in one left-to-right pass. Names, aliases, titles, keys and expressions are stored as written. Resolving the escaped text gives back exactly what was written, so macros never take effect in it.
- **Parsing** is one left-to-right scan. At each `{{`, the longest form in the table, with no spaces outside comments and options, is a macro; otherwise the first `{` is kept and scanning resumes at the next character. A comment runs from `{{//` to the next `}}`. A pick has at least two options, none empty, and options can't contain `::` or `}}`. `\{{` produces a literal `{{`, and `\\` a literal `\`.
- **Stored text keeps its macros.** They resolve when text is shown or sent.

---

## 11. Conditions

Conditions (`when`), `derive` and `compute` use the Common Expression Language (CEL): small, sandboxed and non-Turing-complete.

### 11.1 Environment

Every expression is evaluated at a message, its **evaluation point**: for an entry's `when` and for text used in writing a new message, that message's parent; for an event, the message that triggered it; for a derived variable read in the state at a message (section 8.6), that message.

| Name | Value |
| --- | --- |
| `state.<id>` | Each scenario variable at the evaluation point: `bool`, `int`, `number` (double), `string` and `enum` (string), `set` (list of strings); keyed variables are maps |
| `state.<owner>.<id>` | Each variable of a character or world in use |
| `own.<id>` | The variables of the expression's owner; for a scenario, its own |
| `scene.location`, `scene.present` | The scene |
| `scene.within` | The current location, then its ancestors, innermost first |
| `turn` | Rounds so far (section 12.1) |
| `elapsed` | Whole seconds between the evaluation point's `at` and its parent's, rounded down; 0 if either is missing or the gap is negative |
| `hour`, `weekday` | The evaluation point's local hour (0–23) and ISO weekday (1–7) in the session's `timezone`; −1 if its `at` or the `timezone` is missing, or the zone isn't a known IANA name |
| `opening` | The path's opening ID, or `""` |
| `scenario` | The scenario being played |
| `char` | The character the message is written for (section 6.2); `""` for the narrator, the single voice and events |
| `user` | The player's character `{{user}}` means, or `""` |
| `self` | The owner of the expression: a character, world or scenario ID, or `session` |
| `players` | The players' character IDs |
| `last.from`, `last.char` | The evaluation point message's `from` and `char`; `""` when it has no `char` |
| `count(name)` | How many times an event fired, an entry activated, or a change key appeared in a recorded change on the path, matched exactly; 0 for anything else |
| `ago(name)` | Rounds from that event's, entry's or key's latest firing, activation or change on the path to the evaluation point; 1000000000 if never |
| `hit(key)` | Entries only: whether `key` matches the entry's scanned text, as keys do (section 7.2) |
| `roll(n)` | Event and outcome `compute` only: a random whole number from 1 to `n`, an `int`; `n` below 1 is a runtime error |
| `min(a, b)`, `max(a, b)`, `abs(x)` | For numbers of one type |

```text
state.bell >= 10 && scene.location == "vault"
char == self && own.nerve >= 2
"manor" in scene.within && ago("patrol") > 5
"rope" in state.inventory || count("veyra/rope_shop") > 0
state.trust[char] >= 0.8 && hour < 6
```

### 11.2 Rules

- Every expression type-checks: `state` against the scenario's variables and the variables of every character and world of the bundle and session, header characters in place of those they replace, and `own` against the expression owner's. A bundle without a session is checked once for each scenario.
- Conditions have type `bool`; `derive` and `compute` expressions have their variable's type, except that an `int` may set a `number`.
- Ordering comparisons (`<`, `<=`, `>`, `>=`) between an `int` and a `double` MUST work: `state.trust.kai >= 1`. Everything else takes operands of one type: write `state.bell == 7` and `state.trust.kai - 0.1`.
- Evaluation follows the CEL language definition, including its errors, such as integer overflow and division by zero. A runtime error makes a condition false; `&&` and `||` absorb an error when their other operand decides the result.
- `state`, `own`, `scene` and `last` are only selected from, as in `state.bell`: never indexed by computed strings or used as values. Keyed variables are maps, indexed with brackets (section 8.3). A comprehension over a map visits its keys in code point order.
- Expressions use only `bool`, `int`, `double`, `string`, list and map values, and list and map literals hold values of one type. `bytes`, `uint` and `null` literals and type names used as values are a `CEL_ERROR`.
- Available functions are only `size`, `has`, `all`, `exists`, `exists_one`, `map`, `filter`, `in`, `contains`, `startsWith`, `endsWith`, `matches`, the conversions `int()`, `double()`, `string()` and `bool()`, and the functions above. Conversions don't take strings, except `string()` of a string, and `string()` doesn't take a double.
- A comprehension's **body** is its predicate and, for `map`, its transform. Bodies nest at most two deep: a comprehension in another's body counts, one in its target doesn't. Inside a body, `roll()` isn't called and `+` doesn't join strings or lists.
- `matches()` takes a string literal as its pattern, a regex as section 16 defines, and `hit()` a string literal key.
- Selecting an absent value, such as a derived variable that failed, a variable whose owner isn't in use or an absent key, is a runtime error. `has()` of such a selection is true exactly when selecting it isn't a runtime error, whatever the value, and is never an error itself.
- An expression that breaks any of these rules is a `CEL_ERROR`, and so is a `hit()` or `matches()` pattern that isn't a valid regex.

---

# Part II: Sessions

## 12. Session format

A session is a JSON Lines file: a header line, then one message per line. Messages form a forest: each opening tried, and each first message a player writes without one, is a root; alternative replies and branches are siblings, and the transcript is the path from a root to the head. Lines end with `\n` or `\r\n`, the last line may end without one, and no line is empty.

```ts
interface SessionHeader {
  $schema?: string;
  troupe: string;
  kind: "session";
  bundle?: string;                 // the bundle's id; inside a package, its bundle.json is played
  limits?: Limits;                 // the players' lines and veils
  scenario: string;                // scenario ID
  timezone?: string;               // IANA time zone, for hour and weekday
  characters?: Character[];        // players', joiners' and replacements (section 12.2)
  players?: string[];              // distinct characters people control, in seat order
  worlds?: World[];                // worlds added to the session
  head?: string;                   // the last message on the current path; the last message line
  ext?: Ext;
}

interface Limits {
  lines?: string[];                // never depict
  veils?: string[];                // may happen, but only offscreen
  ext?: Ext;
}

interface Message {
  id: string;
  parent?: string;                 // absent on roots
  opening?: string;                // on roots made from an opening, which are system messages
  from: "player" | "model" | "system";
  char?: string;                   // model messages only: the character it was written for; absent for the narrator and the single voice
  content: Part[];                 // empty only for a records-only message (section 12.4)
  at?: string;                     // when the message was written
  changes?: Change[];
  activated?: string[];            // the entries that activated for it, as distinct references
  entries?: Entry[];               // entries added from here on (section 12.3)
  summary?: Summary;
  pinned?: boolean;
  hidden?: boolean;
  ext?: Ext;
}

type Part =                         // writers create only these two types (section 15); every part MAY also carry ext; no speaker = narration
  | { type?: "text"; text: string; speaker?: string; knownBy?: string[] }
  | { type: "image"; src: string; alt?: string; speaker?: string; knownBy?: string[] };

interface Change {
  by: "rules" | "player" | "model";   // openings and events; the people playing; a model's output
  set: Record<string, Json>;       // full key → new value
  event?: string;                  // the event that fired; only with by: "rules"
  outcome?: number;                // the chosen outcome's index; only with event
  ext?: Ext;
}

interface Summary {
  text: string;
  from: string;                    // first message covered; this message is the last
  knownBy?: string[];              // who knows it (section 12.4)
  ext?: Ext;
}
```

### 12.1 Messages

- Every `parent` names a message on an earlier line.
- A **root** is a system message made from an opening, or a player message. A root made from an opening has `opening` set and holds the opening's `content` as written, or none. A root records the start in its changes, in order: the opening's `set` and who is present at the start, `by: "rules"`, or, on a player's root, its own changes; then the players' answers to `ask` questions, `by: "player"`.
- **Rounds** count player messages on a path: a message's `turn` is the number of player messages from the root to it, inclusive, and a message being written has its parent's. `turn`, `ago`, `sticky` and the `cooldown` of entries and events count rounds, as differences of `turn`.

### 12.2 Players and cast

- **Replacements.** A header character with the ID of a bundle character replaces it for the whole session: it keeps that character's place in the cast and every reference to it. The replaced bundle character takes no part in the session and isn't checked with it. One that replaces a character outside the scenario cast otherwise counts as a new header character. Two header characters that replace the same bundle character are a `DUPLICATE_ID`.
- `players` lists the characters people control, in seat order:
  - An ID defined in the header's `characters`, other than a replacement of a cast member, fills the next empty seat; when every seat is filled, it adds a seat after the scenario cast.
  - A cast member marked `player` fills its own seat and is a player whether listed or not; those `players` doesn't list follow the listed ones, in cast order.
  - Listing any other cast member means a person took that character over.
- The session's **cast** is the scenario cast with seats filled, then the added seats, then the **joiners**: header `characters` that aren't players or replacements of cast members, which joined or appeared during the session.
- Header characters and `players` hold for the whole session, on every branch; presence is recorded on each path (section 8.4).

### 12.3 Session entries

A message may add entries, owned by `session`. They apply from that message onward on its path, so they belong to their branch. A later message's entry with the same ID replaces it from there on, and `disabled: true` removes it. A replacement takes each field it lacks (absent, or a `false` boolean), other than `disabled`, from the entry it replaces, such as `knownBy`, `title` and `pull`; one that has `pull` still states its own `title` (section 7). An entry that follows a `disabled` version replaces nothing.

### 12.4 Other message fields

- **`activated`** lists, on a model message, the entries that reached the model for it, those retrieved by `pull` included. An entry kept active by `sticky` isn't listed again.
- **`pinned`** marks a message that matters for as long as it is on the path, however far back it lies.
- **`hidden`** messages stay on the path, and their changes, firings, activations and rounds count, but no character, the narrator or the single voice knows their parts, and keys don't match them.
- **`summary`** condenses the messages from `from` to its message, as the file holds them. Without `knownBy`, it is known by the characters who know every part it covers, hidden messages' parts aside, and by the narrator only if the narrator knows every such part (section 12.5).
- **Records-only messages.** A system message with empty `content` carries `changes`, such as a player's edits to state, and, on a root made from an opening without `content`, `opening`; it has no `summary`, `activated` or `char`, has `entries` only on a root, and isn't pinned.

### 12.5 Knowledge

A message part is known by its speaker, by the characters present after its message's changes and, except on a root, by those present before them: the **witness rule**. A part's `knownBy` replaces this with exactly the listed characters. The narrator and the single voice know parts as they know entries (section 7.4), and a pinned message is known as its parts are. Knowledge is about characters; secrets between the people playing are out of scope.

---

## 13. Reserved

This section held chronicles, which are future work (Appendix D). Its number is kept so that later sections keep theirs.

---

# Part III: Interchange

## 14. Files and packaging

### 14.1 Forms

| Form | Extension | Contents |
| --- | --- | --- |
| Single file | `.troupe.json` | One bundle. Files are URLs or data URIs. |
| Package | `.troupe` | A ZIP archive with `bundle.json`, the files it references, and optionally sessions |
| Session | `.troupe-session.jsonl` | One session outside a package |

### 14.2 Files

Fields that hold a file (`cover`, `avatar`, location `image` and image parts) hold a PNG, JPEG, WebP, AVIF or GIF image, as a path from the package root, an `https:` URL, or a `data:` URI with base64 content and the lowercase media type `image/png`, `image/jpeg`, `image/webp`, `image/avif` or `image/gif`.

### 14.3 Packages

- `bundle.json` is at the root. Sessions are stored under `sessions/` with the `.troupe-session.jsonl` extension. The package's other files are the files that the bundle or sessions reference.
- Every file under `sessions/` with that extension is a session of the package. The package's files have paths matching `^[A-Za-z0-9_-][A-Za-z0-9._-]*(/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$`, with segments of at most 255 bytes. Every other entry, such as a directory (a name ending in `/`) or a file an archiver adds, isn't part of the package.
- No ZIP entry has an absolute path, a `..` segment or a backslash, is a symbolic link, is encrypted, uses a compression method other than store and deflate, or has the name of another entry compared case-insensitively.

---

## 15. Extensions and versioning

- **Extensions.** Every object of a bundle or session that this document defines with an interface MAY carry `ext`, keyed by an extension name matching `^[a-z0-9][a-z0-9.-]{0,63}$`, such as `risu.regex`. The `troupe.` prefix is reserved for the draft extensions of Appendix D. Writers MUST NOT add fields anywhere else, and MUST keep every `ext` of a file they rewrite unchanged, as a JSON value.
- **Unknown fields.** A property is unknown when its object's interface doesn't define it; for a part, the interface its `type` selects. An unknown property carries no meaning, and is an `UNKNOWN_FIELD` located at the property; `SCHEMA` is judged with unknown properties removed. A part whose `type` is present and isn't `"text"` or `"image"` is unknown as a whole, an `UNKNOWN_FIELD` at its `type`, so a message, opening or event message holding only such parts has no content. Writers MUST keep such parts of a file they rewrite unchanged.
- **Versions** are `major.minor`, compared as two integers, so `0.10` is newer than `0.9`. From 1.0, minor versions only add what files of an older minor can do without; before 1.0, any minor version may break. A file of a version other than this document's is `UNSUPPORTED_VERSION`.

---

## 16. Security and limits

Files hold data and sandboxed expressions (section 11), never scripts, and their size and the work they ask for are bounded. Their text is Markdown, which can hold raw HTML, links and images; how they are shown is the app's.

- **Regexes.** A regex, as a key or a `matches()` pattern, is RE2 syntax without `\C`, with groups nested at most 100 deep and counted repetitions that multiply through nesting to at most 1000, so `(a{10}){200}` is too many. Every such regex runs in linear time on an engine such as RE2.
- **Limits.** Files stay within these limits:

| Item | Size limit |
| --- | --- |
| Bundle JSON | 32 MiB |
| Session file / messages | 256 MiB / 100,000 |
| ZIP entries in a package / unpacked size | 10,000 / 512 MiB |
| Image size | 8,192 × 8,192 pixels |
| JSON nesting depth | 64 |
| Entries / variables / events in a bundle, all owners, and separately in the characters and worlds a session adds | 10,000 / 1,000 / 1,000 |
| A text value: a part's `text`, an entry's `text` or a description, in UTF-8 | 1 MiB |
| Session entries on a path, the latest per ID | 10,000 |
| One CEL expression or regex key | 4 KiB |
| Characters in a session's cast | 256 |
| A string state value, in UTF-8 | 4 KiB |
| Distinct members of a set value, or keys of a `"*"` map after a change | 256 |

---

## 17. Conformance

### 17.1 Requirements

A **conforming file** validates against the schemas, passes the checks below, stays within the limits of section 16, and follows section 15. A conforming **writer** writes only conforming files, except that a file it rewrites keeps its parts of an unknown type (section 15), whose `UNKNOWN_FIELD` it then still has. A conforming **reader** accepts every conforming file of its version and gives its fields the meaning this document defines; from 1.0, it also accepts conforming files of an older minor version of its major version. Each check has a code, for validators to report it with. Every check runs on the document as written, so one value can fail several.

### 17.2 Checks

| Code | Check |
| --- | --- |
| `PARSE` | The input is I-JSON (section 2.2), or session lines of I-JSON (section 12), a Troupe document of the `kind` its form holds (section 14.1), within the limits of section 16 other than the value limits, and a package follows section 14.3 |
| `UNSUPPORTED_VERSION` | `troupe`, when present, is this document's version (section 15); a missing `troupe`, or one that isn't `major.minor`, is only `SCHEMA` |
| `SCHEMA` | The document validates against its schema, with `format` asserted, apart from unknown properties (section 15) |
| `UNKNOWN_FIELD` | Every property is one this document defines (section 15) |
| `DUPLICATE_ID` | IDs are unique as section 2.3 and section 12.2 require |
| `UNKNOWN_SCENARIO` | The header's `scenario` names a scenario |
| `UNKNOWN_CHARACTER` | Cast members name bundle characters; `knownBy` (where `narrator` is also allowed), speakers, example speakers (or `char`, `user`), message `char`, members of `scene.present` values and character keys of `initial` objects name characters in the bundle or session |
| `UNKNOWN_WORLD` | `scenario.worlds` names bundle worlds |
| `UNKNOWN_LOCATION` | Locations in values and `parent` exist, without cycles |
| `UNKNOWN_OPENING` | A root's `opening` exists |
| `UNKNOWN_NAME` | `activated` and `event` references, and literal names in `count` and `ago`, name entries, events or keys in use |
| `UNKNOWN_VARIABLE` | Keys in openings, events and changes are valid keys (section 8.5), counting variables as section 11.2 does, no two keys of one `set` or `compute` name the same full key, and variables named by `min` and `max` are valid bounds (section 8.1) |
| `INVALID_VALUE` | `initial`, opening and event `set` values and recorded values are valid values for their variables (section 8.5), and no change takes a `"*"` map past its limit (section 16); `outcome` is present exactly when the fired event has `outcomes`, and names one; unknown locations and characters in values are reported only as `UNKNOWN_LOCATION` and `UNKNOWN_CHARACTER` |
| `UNKNOWN_MESSAGE` | `parent` names a message on an earlier line, the header's `head` and summary `from` name messages, and `from` is on the path to its summary |
| `INVALID_PLAYER` | `players` names header characters or cast members |
| `CEL_ERROR` | Every expression parses and type-checks, and no `derive` reads a derived variable; comprehensions, `hit()` and `matches()` follow section 11.2 |
| `REGEX_ERROR` | Every regex key is valid (section 16) |
| `UNKNOWN_MACRO` | Macros are valid and name existing characters and variables; text that isn't one is left as written (section 10) |

---

## Appendix A: JSON Schemas

The JSON Schema 2020-12 files are normative for structure. Each `$id` names the schema and its minor version, and is where the schema is published, such as `https://docs.troupes.ai/schema/0.12/bundle.schema.json`.

| File | Validates |
| --- | --- |
| [`bundle.schema.json`](../schemas/bundle.schema.json) | A bundle, and the definitions the other schemas share |
| [`session-header.schema.json`](../schemas/session-header.schema.json) | The first line of a session |
| [`message.schema.json`](../schemas/message.schema.json) | Every later line of a session: a message |

---

## Appendix B: Examples

### B.1 A card with lore

A companion with keyed lore, a style rule, a secret, two written openings, and a third the model writes.

```json
{
  "troupe": "0.12",
  "kind": "bundle",
  "characters": [
    {
      "id": "mira",
      "name": "Mira",
      "description": "A sarcastic starship engineer who talks to engines more kindly than to people.",
      "entries": [
        { "id": "style", "position": "system", "text": "Write Mira's replies in first person, short and dry." },
        { "id": "ship", "keys": ["Kestrel", "ship"], "text": "The Kestrel is a patched-up freighter Mira has kept flying for nine years." },
        { "id": "sister", "keys": ["sister", "Juna"], "text": "Mira's sister Juna went missing near the Veil two years ago." },
        { "id": "debt", "knownBy": ["mira"], "text": "Mira owes the Corvane syndicate more than the Kestrel is worth." }
      ]
    }
  ],
  "scenarios": [
    {
      "id": "kestrel",
      "openings": [
        { "id": "docked", "content": [{ "speaker": "mira", "text": "*She doesn't look up from the reactor.* If you're here about the noise, it's supposed to sound like that." }] },
        { "id": "adrift", "content": [{ "text": "The lights flicker. Somewhere aft, something groans." }, { "speaker": "mira", "text": "Good news: we're alive. Bad news: everything else." }] },
        { "id": "shore_leave", "title": "Shore leave" }
      ],
      "entries": [
        { "id": "shore", "position": "system", "when": "opening == 'shore_leave' && turn == 0", "text": "Open on shore leave: Mira and {{user}} at a crowded spaceport bar." }
      ]
    }
  ]
}
```

### B.2 A story: The Lantern Heist

Two thieves hired by the player to steal a duke's storm lantern before the twelfth bell. Shown as `bundle.json` inside a package, so file names are package paths.

```json
{
  "$schema": "https://docs.troupes.ai/schema/0.12/bundle.schema.json",
  "troupe": "0.12",
  "kind": "bundle",
  "id": "4b7d2c1e-9a3f-4e8b-b6d0-2f5a8c9e1d37",
  "name": "The Lantern Heist",
  "tagline": "Steal a storm in a bottle before the harbor bells ring twelve.",
  "version": "1.0",
  "authors": ["Sakura"],
  "credits": "CC BY 4.0. Harbor map after an idea by the Tuesday group.",
  "language": "en",
  "tags": ["heist", "fantasy", "ensemble"],
  "rating": "general",
  "cover": "cover.webp",

  "characters": [
    {
      "id": "elena",
      "name": "Elena",
      "aliases": ["Elena Voss", "the Cartographer"],
      "description": "## Appearance\nTall woman in her forties, ink-stained fingers, a waxed oilskin coat.\n\n## Personality\nCalm, exacting, dry humor. Distrusts improvisation and anyone who rushes.\n\n## Background\nA former royal surveyor, dismissed after mapping a vault she later robbed.",
      "summary": "A meticulous thief who plans every job down to the bell.",
      "examples": [
        [
          { "speaker": "user", "text": "Can we just go?" },
          { "speaker": "char", "text": "Three doors, two guards, one chance. No." }
        ]
      ],
      "entries": [
        { "id": "master_key", "knownBy": ["elena"], "text": "Elena still has the surveyor's master key to the Duke's vault, and hasn't told anyone." }
      ],
      "avatar": "elena.webp"
    },
    {
      "id": "kai",
      "name": "Kai",
      "description": "A wiry, sun-browned acrobat in a patched red jacket who talks too much and owes everyone money. Reckless, warm, quick to joke and quicker to run.",
      "summary": "A reckless acrobat with debts and a quick grin.",
      "variables": [
        {
          "id": "nerve", "type": "int", "min": 0, "max": 3, "by": ["model"], "maxStep": 1,
          "description": "How close Kai is to losing his nerve and running: 0 is steady, 3 is about to bolt."
        }
      ],
      "entries": [
        { "id": "voice", "knownBy": ["kai"], "position": 4, "text": "{{char}} calls people 'boss' and talks in quick, joking bursts." },
        { "id": "deal", "knownBy": ["kai"], "text": "The Duke paid Kai to lead the crew into a trap at the vault door. He is starting to regret it." },
        { "id": "rattled", "knownBy": ["kai"], "when": "own.nerve >= 2", "text": "{{char}} is rattled: he jokes too fast and keeps looking for exits." }
      ],
      "avatar": "kai.webp"
    }
  ],

  "worlds": [
    {
      "id": "veyra",
      "name": "Port Veyra",
      "description": "A storm-battered harbor city ruled by a Duke whose lantern is said to calm the sea.",
      "locations": [
        { "id": "manor", "name": "The Duke's manor" },
        { "id": "rooftops", "name": "Manor rooftops", "parent": "manor" },
        { "id": "vault", "name": "Lantern vault", "description": "A half-flooded cellar.", "parent": "manor" }
      ],
      "entries": [
        { "id": "storm_lantern", "keys": ["lantern"], "priority": 80, "text": "The lantern holds a captured storm. If its glass cracks, the harbor floods within the hour." },
        { "id": "weather_rain", "group": "weather", "weight": 3, "sticky": 6, "cooldown": 4, "text": "Rain keeps falling, slicking every roof and muffling footsteps." },
        { "id": "weather_fog", "group": "weather", "sticky": 6, "cooldown": 4, "text": "Fog rolls in from the harbor; nobody can see past ten paces." }
      ]
    }
  ],

  "scenarios": [
    {
      "id": "heist",
      "premise": "Port Veyra, the night of the Tide Festival. {{user}} has hired two thieves to steal the Duke's storm lantern before the harbor bells ring twelve.",
      "briefing": "You are the crew's boss. Elena plans; Kai improvises. Someone in this crew is not what they seem.",
      "cast": [
        { "notes": "The crew's boss, who hired them both." },
        { "character": "elena" },
        { "character": "kai", "notes": "Tonight Kai is jumpy and keeps glancing toward the harbor." }
      ],
      "variables": [
        {
          "id": "bell", "type": "int", "initial": 6, "min": 6, "max": 12,
          "description": "The last harbor bell that has rung tonight. Goes up by one when about an hour of story time passes.",
          "by": ["model"], "maxStep": 2, "oneWay": true
        },
        {
          "id": "trust", "type": "number", "of": "characters", "initial": { "*": 0.5, "elena": 0.7, "kai": 0.4 }, "min": 0, "max": 1,
          "description": "How much this character trusts {{user}}, from 0 to 1. Rises when promises are kept or risks are shared; falls on lies and reckless orders.",
          "by": ["model"], "maxStep": 0.2, "spoiler": true
        },
        {
          "id": "approach", "type": "enum", "values": ["quiet", "loud"],
          "labels": { "quiet": "Slip in unseen", "loud": "Make a scene and grab it" },
          "description": "How {{user}} wants the job done.",
          "ask": "How do you want to play this job?"
        },
        {
          "id": "key_revealed", "type": "bool", "oneWay": true, "by": ["model"],
          "description": "Elena has told the crew she has the vault's master key."
        },
        {
          "id": "kai_confessed", "type": "bool", "oneWay": true, "by": ["model"],
          "description": "Kai has confessed the Duke's deal to {{user}}."
        }
      ],
      "entries": [
        { "id": "style", "position": "system", "text": "Write in second person, present tense. Keep scenes tense and end each reply on a choice for {{user}}." },
        { "id": "clock", "text": "The last bell to ring was the {{state.bell}}th. The plan: {{state.approach}}." },
        { "id": "late", "position": "system", "when": "state.bell >= 10", "text": "Time is short. Every exchange should cost the crew something." },
        { "id": "key_known", "when": "state.key_revealed", "text": "Elena has the surveyor's master key to the vault." },
        { "id": "confess", "knownBy": ["kai"], "position": 2, "when": "state.trust.kai >= 0.8", "text": "Kai trusts {{user}} enough to confess the Duke's deal if asked directly." }
      ],
      "events": [
        {
          "id": "patrol", "on": "player", "when": "scene.location == 'rooftops' && turn > 2", "chance": 0.3, "cooldown": 3,
          "outcomes": [
            { "weight": 3, "direct": "A guard patrol passes below. Nobody spots the crew, but it is close." },
            { "weight": 1, "direct": "A guard looks up and sees a shadow move. The crew must hide until the next bell.", "compute": { "bell": "state.bell + 1" } }
          ]
        },
        {
          "id": "twelfth_bell", "when": "state.bell >= 12", "once": true, "end": true,
          "message": [{ "text": "The twelfth bell tolls across the harbor. Far below, the gates grind shut." }]
        },
        {
          "id": "kai_confides", "when": "state.kai_confessed", "once": true,
          "compute": { "trust.elena": "state.trust.elena - 0.1" },
          "message": [{ "speaker": "elena", "text": "*Elena's jaw tightens.* You were going to let us walk into that." }]
        }
      ],
      "openings": [
        {
          "id": "rooftop_briefing",
          "title": "Rooftop briefing",
          "set": { "scene.location": "rooftops" },
          "content": [
            { "text": "Rain hammers the slate roofs above the Duke's manor." },
            { "speaker": "elena", "text": "*Elena unrolls a soaked map.* Two guards on the east stair. We go at the eighth bell." },
            { "speaker": "kai", "text": "Or we go now, while they're drunk. *He grins at {{user}}.* Your call, boss." }
          ]
        },
        {
          "id": "caught",
          "title": "Already caught",
          "set": { "scene.location": "vault", "bell": 11 },
          "content": [
            { "text": "Water laps at your knees. The vault door has slammed shut behind you, and Kai is nowhere to be seen." },
            { "speaker": "elena", "text": "He was supposed to hold that door. *She doesn't look surprised.*" }
          ]
        }
      ]
    }
  ]
}
```

### B.3 Session

```text
{"troupe":"0.12","kind":"session","scenario":"heist","characters":[{"id":"mara","name":"Mara","description":"A retired smuggler with a debt to settle."}],"players":["mara"],"head":"4"}
{"id":"1","opening":"rooftop_briefing","from":"system","content":[{"text":"Rain hammers the slate roofs above the Duke's manor."},{"speaker":"elena","text":"*Elena unrolls a soaked map.* Two guards on the east stair. We go at the eighth bell."},{"speaker":"kai","text":"Or we go now, while they're drunk. *He grins at {{user}}.* Your call, boss."}],"changes":[{"by":"rules","set":{"scene.location":"rooftops","scene.present":["mara","elena","kai"]}},{"by":"player","set":{"approach":"quiet"}}]}
{"id":"2","parent":"1","from":"player","content":[{"speaker":"mara","text":"We wait for the eighth bell. Kai, you take the east stair."}]}
{"id":"3","parent":"2","from":"model","char":"kai","activated":["veyra/weather_fog","kai/voice","kai/deal","heist/style","heist/clock"],"content":[{"speaker":"kai","text":"East stair. Sure. *He's gone before anyone can stop him.*"}],"changes":[{"by":"model","set":{"scene.present":["mara","elena"],"kai.nerve":1}}]}
{"id":"4","parent":"2","from":"model","char":"kai","activated":["veyra/weather_rain","kai/voice","kai/deal","heist/style","heist/clock"],"content":[{"text":"The seventh bell rolls across the harbor."},{"speaker":"kai","text":"*Kai hesitates, then nods.* Fine. Your plan, boss. For once."},{"speaker":"kai","knownBy":["kai"],"text":"*If the Duke's men are early, this ends badly for all of us.*"}],"changes":[{"by":"model","set":{"bell":7,"trust.kai":0.5}}],"entries":[{"id":"stair","knownBy":["kai"],"text":"Mara gave Kai the east stair, the post closest to the Duke's trap."}]}
```

---

## Appendix C: Design decisions

| Decision | Instead of | Why |
| --- | --- | --- |
| No file for continuity between sessions, for now | Chronicles carrying a character's memories, values and definition from one session, and one app, to the next | The core comes first; how an app carries memory into a new session is its own until use shows what to standardize (Appendix D). |
| One `Entry` for lore, instructions, secrets, goals, notes and memories | A type for each | One shape, one thing to learn. |
| No keys means always on; `hit()` in conditions; `/…/` keys | Flags, logic modes, match modes | Fewer fields, any boolean logic, simple matching rules. |
| Owner-scoped mechanics, `own` | One shared namespace | Characters and worlds stay self-contained when combined. |
| Openings only in scenarios | Openings on characters too | Characters stay reusable in any story; a companion costs one small scenario, and there is one place to look. |
| Openings without content | Every start written out | A menu of starting points costs a line each. |
| Players beyond the seats add seats | Refusing them | A friend can join any story; the author's seats are filled first, and secrets between people stay out of scope. |
| Session characters replace bundle characters by ID | Roles and slots | Recasting and edited copies work without a binding layer. |
| Openings as roots | A single root and header start values | Alternative first messages, and starting values recorded like any change. |
| Declared, typed variables; derived variables | Free-form state; bookkeeping events | Every app knows what values mean; computed views need no records. |
| Absolute changes, recorded | JSON Patch, or recomputing | Replay needs no evaluation, from any channel. |
| A schema of files, not of how apps play them | A second document fixing prompt assembly, entry selection, event passes, rolls and model output | Sessions record every outcome, so a reader needs only the meaning of what is stored; how an app writes prompts and calls models is its own, and can improve without a new version. |
| Valid files, not repair | Rules for reading broken files leniently | A file either conforms or fails a check with a code; what an app does with a broken file is its own. |
| Readers accept every conforming file and read it as defined | No duty on readers; each app's own limits | A file that conforms opens with the same meaning in every app; that is the whole interoperability promise. |
| Recorded changes apply as written; `by`, `maxStep` and `oneWay` aren't checked | A check that replays every change against its variable | Readers never second-guess a recorded outcome, so a session reads the same everywhere; the fields still tell writers and models what is meant. |
| `{{pick}}` chosen each time the text resolves | A choice fixed by a seed | Without a defined roll, no seed could make apps agree; text that must not change is written out. |
| Display safety is the app's | Normative rules for showing Markdown, links and media | A schema can't constrain how text is shown; files still hold no scripts. |
| Literal `set`, CEL `compute` | One field with CEL strings | Plain values without quoting traps. |
| Weighted outcomes, `roll(n)`, `on` | Chains of chance events | Random choices are one declaration with correct odds. |
| CEL equality within one type, ordering across `int` and `double`; no conversions from strings; literals of one type; maps iterated in code point order | CEL's full heterogeneous equality, string parsing and insertion-ordered maps | Common CEL libraries agree on these without custom code, and two apps never disagree about what an expression means. |
| Durations in rounds | Messages | The same file behaves the same in solo and group chats. |
| Witness knowledge; `["narrator"]` for narrator-only | Everyone knows everything; `[]` | Offstage characters miss what happens, and no list is empty. |
| Player and model text stored escaped, so it stays literal | Resolving macros in it; deciding by who wrote a text whether to resolve it | Every text resolves the same way, so a reader never needs to know who wrote it, and no hidden state leaks through model output or prompt attacks. |
| Priority means importance; an owner's entries are read in the order written | Priority also ordering text | Authors order lore by writing it in order. |
| Copies with `credits` | Live cross-bundle references, structured provenance | People write attribution as they like. |
| `id` only links sessions to their bundle | Rules for forks, translations, release order, version pins or hashes | Nothing could check them. A session that must keep the exact story it was played with travels in a package with that bundle. |
| No authorship, model, partial-reply, reason or session ID fields | Message `author`, `model` and `stopped`, change `reason`, a header `id` | No rule reads them; apps keep such data in `ext`. |
| No image-embedded form | Bundles hidden in PNG chunks for image hosts | Hosts strip the chunks, and a package or single file already carries a story with its images. |
| No narrator voice | A character that defines the narrator | Narrator-only `system` entries already set its style. |
| A scenario names its narrator | A fixed English name | `{{char}}` reads naturally in a story in any language. |
| No reasoning or tool parts | Provider transcripts in messages | They mean nothing to the story; apps that keep them use `ext`. |
| Two modes | A third, `mixed` mode | In `characters` mode the narrator can already take turns. |
| Sessions as an exchange snapshot | Prescribing storage, or an append-only log of edits | Apps keep their own databases; chats still move between apps intact, with no edits or deletions to replay. |
| No sprites, audio, media provenance, music, speaking hints, UI grouping or branch labels in the core | Media and presentation fields | They belong to apps and extensions such as `troupe.media`; the core keeps only what authors say about their story, such as names, images, spoiler marks and ratings. |
| No executable code | Scripts in cards | Scripts in shared cards can steal API keys. |
| No text transforms | Regex scripts that rewrite text | Most build HTML, fix one model's quirks, or display stats that state now covers. |
| A replacement session entry takes the fields it lacks from the one it replaces | Replacing an entry whole | An update of a memory that gives only its ID and text keeps the memory's `knownBy`, `pull` and `title`. |
| A header character listed in `players` fills a seat | Recording how each character joined | The snapshot can't tell a player's own character from a newcomer listed in `players`, so neither is a key of an `of: "characters"` variable. |
| Writers leave out empty optional fields and write booleans as they like | Allowing `""` and `[]` anywhere; treating an explicit `false` as different from absent | Two writers of the same story produce the same fields, and typed serializers that write defaults still validate. |
| Two part types; others are unknown and kept | Open part types; invalid unknown ones | A later version can add a media part that older versions report as `UNKNOWN_FIELD` rather than `SCHEMA`, and that rewriting keeps. |
| No `requires` and no rules for extension data | Files declaring extensions they need; duties on extension authors | Extension data is optional by nature, and nothing could check those duties. |
| ZIP entries outside the package's files aren't part of it | Failing any entry outside the path grammar | Archivers add files such as `__MACOSX/` and `.DS_Store`, and people zip folders with stray files; only the package's files need the grammar, while unsafe entries still fail. |
| Limits on files, on CEL and on values | Only a file size cap, or each app's own | Every conforming file is bounded in size and in the work it asks for. A package's 512 MiB holds a full bundle and a full session with room for images. |
| Regexes limited to what every RE2 implementation compiles | Whatever an engine accepts | A key is valid or `REGEX_ERROR` alike everywhere, and runs in linear time. |
| Session characters and players are session-wide | Characters and seats per branch | Who a character is and who plays it are facts about the session; who is present, which is story, is recorded on each path. |
| Timestamps in UTC with `Z` | Any offset | One zone and one form, so apps compare instants without time zone data. |
| Schema URLs on docs.troupes.ai, the site built from this repository | URLs on an app's domain | Every released version stays online whatever happens to any app. |

---

## Appendix D: Future work

These draft extensions use the `troupe.` prefix (section 15) and may join the core once proven:

- **`troupe.overlay`:** a bundle that patches another by ID, for translations and mods.
- **`troupe.media`:** sprites, audio, voices and provenance of generated media.

Continuity between sessions, a character's memories and relationship carried from one session to the next, may return as its own document once apps show what it needs.

---

## Appendix E: References

- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174): requirement keywords
- [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259), [RFC 7493](https://www.rfc-editor.org/rfc/rfc7493): JSON and I-JSON; [JSON Lines](https://jsonlines.org/)
- [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339): timestamps; [IANA time zones](https://www.iana.org/time-zones); [BCP 47](https://www.rfc-editor.org/info/bcp47)
- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12); [CommonMark 0.31.2](https://spec.commonmark.org/0.31.2/)
- [CEL](https://github.com/google/cel-spec/blob/master/doc/langdef.md); [RE2 syntax](https://github.com/google/re2/wiki/Syntax)
- [PKWARE APPNOTE](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)
