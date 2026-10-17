# Troupe Format

**Version 0.13 (draft)** · October 17, 2026

Troupe is an open file format for AI roleplay: characters, the worlds they live in, the scenarios that bring them together, the state a story tracks, and sessions: the chats people play, with every change recorded. One file can hold a single character or a full multi-character story.

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
9. [Macros](#9-macros)
10. [Conditions](#10-conditions)

**Part II: Sessions**

11. [Session format](#11-session-format)

**Part III: Interchange**

12. [Files and packaging](#12-files-and-packaging)
13. [Extensions and versioning](#13-extensions-and-versioning)
14. [Security and limits](#14-security-and-limits)
15. [Conformance](#15-conformance)

**Appendices:** [A Schemas](#appendix-a-json-schemas) · [B Examples](#appendix-b-examples) · [C Design decisions](#appendix-c-design-decisions) · [D Future work](#appendix-d-future-work) · [E References](#appendix-e-references)

---

## 1. Overview

### 1.1 Goals

- **Recorded.** Every change to state is recorded in the session, so its state never depends on how it was played.
- **Small.** A few primitives that compose.
- **Multi-character.** Casts, several players, a narrator and per-character knowledge are built in, and characters stay self-contained when combined.
- **State without code.** Stats, relationships and inventories are typed variables that players and models change. Files hold no rules that run.
- **Model-agnostic and safe to share.** Files hold data and sandboxed conditions, never scripts or model-specific syntax.

Non-goals: how apps play files (prompt assembly, entry selection, deciding when state changes, fitting a long chat into a model's context, model calls and their output), rules engines, prompt templates and sampler settings, image and voice generation, app UI, accounts, sync and scripting.

### 1.2 Documents

This document and its JSON Schemas (Appendix A) are the normative parts of Troupe: the files, their fields and what they mean, identifiers and references, packaging, versioning, limits, and the checks a valid file passes. The schemas are normative for structure, the prose for meaning. Appendices B to D and the [guides](../README.md#guides) are informative; Appendix E lists references. "Format 7.2" means section 7.2 of this document, as the guides and the conformance suite cite it.

### 1.3 Object model

```text
Bundle  (.troupe.json)
├── characters[]   identity, entries, own variables
├── worlds[]       locations, entries, own variables
└── scenarios[]    cast, openings, entries, variables

Session  (.troupe-session.jsonl)  a header and a forest of messages
```

Four ideas carry the format:

1. **Entries** are all conditional text for the model: lore, instructions, secrets, goals, notes and memories (section 7).
2. **Variables** hold typed state. Players or a model change them, and every change is recorded (section 8).
3. **Conditions** in CEL gate entries (section 10).
4. **Sessions** are message trees that record every change (section 11).

### 1.4 A first example

This is a complete card: a character, and a scenario that starts a chat with them. Each opening is an alternative first message.

```json
{
  "troupe": "0.13",
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

Appendix B builds up to a full story with lore, a group and state.

---

## 2. Conventions

### 2.1 Requirement keywords

MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are used as described in RFC 2119 and RFC 8174, and only when written in capitals.

### 2.2 Values

- Documents are I-JSON (RFC 7493): UTF-8 without a byte order mark, no duplicate member names, no surrogate or noncharacter code points, written or escaped, numbers that fit an IEEE 754 double, and integer fields within ±(2^53 − 1). Writers write integers without a fraction or exponent, but a number with a zero fraction, such as `8.0`, is still an integer.
- **Empty values.** `null` never appears in a field this spec defines or in a state value, and `""`, `[]` and `{}` never appear in an optional field other than `ext`: an optional field without a value is left out. State values and `scenario.worlds` are the exception: there `""`, `[]` and `{}` are values. Names, variable descriptions and the strings in lists such as `tags`, `keys` and `values` are never empty, and an example exchange has at least one line.
- **Defaults are normative.** Every default stated in this document or its TypeScript comments applies when a field is absent. Every boolean defaults to `false`, and one written `false` is the same as an absent one.

### 2.3 Identifiers

| Kind | Grammar |
| --- | --- |
| Author IDs: characters, worlds, scenarios, locations, entries, openings, variables, groups, variable keys | `^[a-z][a-z0-9_]{0,63}$` |
| Message and bundle IDs | `^[A-Za-z0-9_-]{1,64}$` |

- Author IDs MUST NOT be a CEL reserved word: `as`, `break`, `const`, `continue`, `else`, `false`, `for`, `function`, `if`, `import`, `in`, `let`, `loop`, `namespace`, `null`, `package`, `return`, `true`, `var`, `void`, `while`.
- Characters, worlds and scenarios MUST NOT use the IDs `char`, `user`, `narrator`, `session`, `state`, `scene`, `players` or `own`. Variables MUST NOT be named `scene` or `own`, and variable keys MUST NOT be `char` or `user`.

| IDs | Unique among |
| --- | --- |
| Characters, worlds, scenarios | All of them, in the bundle and the session |
| Scenario variables | Also every character and world ID in the bundle or session |
| Entries | The same owner; session entries, the same message (section 11.3) |
| Variables | The same owner |
| Locations | The bundle and the session |
| A scenario's cast members and `worlds` | The scenario: each names a character or world once |
| Openings | The same scenario |
| Messages | The session |

### 2.4 References

- Objects refer to each other by plain ID.
- Entries are named `<owner>/<id>`, such as `veyra/late_bells`. Entries added by messages have the owner `session`.
- State uses dots instead (section 8.2): `state.bell`, `state.trust.kai`, `state.kai.nerve`.

### 2.5 Text

Model-facing text is Markdown (CommonMark 0.31.2). Timestamps are RFC 3339, with an uppercase `T`, an uppercase `Z` or a numeric offset such as `+02:00`, and no leap seconds. Language tags are BCP 47.

---

# Part I: Authoring

## 3. Bundle

A bundle states the spec version and publishing metadata once, then lists its contents in any mix.

```ts
interface Bundle {
  $schema?: string;
  troupe: string;                  // spec version, e.g. "0.13"
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
  cover?: string;                  // image (section 12.2)
  characters?: Character[];
  worlds?: World[];
  scenarios?: Scenario[];
  ext?: Ext;
}
```

---

## 4. Character

A character is anyone in a story, played by a model or a person. Everything a character needs travels with it: its entries and its own variables.

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

A world is a setting that scenarios share, with its own entries and variables.

```ts
interface World {
  id: string;
  name: string;
  description?: string;            // always-on overview
  locations?: Location[];
  entries?: Entry[];
  variables?: Variable[];          // e.g. time of day, read as own.<id> by the world's entries
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

A scenario is what people open: who is in the story, how it starts, its state and its direction.

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
- **Seats** are cast members without `character`, filled by a character the person brings, and members with `player`, which a person plays as written, filled when `players` lists their character (section 11.2). A seat that no player fills is left out of the cast.

### 6.2 Modes

- **`characters`**: each model-played character speaks in its own messages, written for that character alone. The **narrator** may also take turns describing the scene.
- **`narrator`**: the narrator writes the whole scene, including every character's lines.

Every model message is **written for** one character or the narrator; its `char` names the character (section 11).

### 6.3 Openings

- Each opening that is played starts its own root message (section 11.1); conditions see the chosen one as `opening`.
- `set` gives starting values, written like a change (section 8.5): `{"scene.location": "vault", "state.bell": 11, "state.kai.nerve": 2}`.
- **Without `content`**, a model writes the first message.

### 6.4 What a session uses

In a scenario, the worlds **in use** are its `worlds`, and the characters in use those its cast members name; in a session, they are the scenario's and the session's worlds, and the session's cast (section 11.2). The entries and variables in use are those of the scenario and of the worlds and characters in use, and in a session also the session's own entries, each from the message that adds it, on that message's path (section 11.3). Each keeps its owner (section 8.2).

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

  // timing, in rounds (section 11.1)
  once?: boolean;                  // activates at most once on a path
  sticky?: number;                 // integer ≥ 1; stays active this many rounds after activating
  cooldown?: number;               // integer ≥ 1; then can't activate for this many rounds
  chance?: number;                 // integer 0–100, a percent; 100

  // competition
  group?: string;                  // at most one entry per group of the same owner is active
  weight?: number;                 // integer 1–1,000,000; odds among equal priority; 1
  priority?: number;               // integer 0–100; 50

  position?: "system" | "context";   // "context"
  depth?: number;                  // integer ≥ 0; inside the history instead (section 7.3)
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
| A message (`session`) | from that message onward on its path (section 11.3) |

### 7.2 Activation

- An entry **without `keys` or `pull`** is always on, subject to `when`.
- An entry **with `keys`** activates when one appears in its **scanned text**: the last `scanDepth` messages on the path that aren't hidden and have content, each text part known to whoever the message being written is for (section 11.5), each scanned separately as its speaker's name, `: ` and its text as shown, or as its text alone when it has no speaker.
- **Matching.** Keys match whole words, ignoring case: no letter, mark or number (Unicode categories L, M and N) comes right before or after a match, and case is compared by Unicode simple case folding. A key containing Han, Hiragana, Katakana, Hangul, Thai, Lao, Khmer, Myanmar or Tibetan characters matches anywhere. A key that matches `^/.+/[a-z]*$` is a **regex key** (section 14), written `/pattern/flags`: its pattern is the text between the first and the last `/`, and its flags the letters after. It matches anywhere, and ignores case only with the flag `i`: `/dragons?/i`, `/\bKai\b/`.
- An entry **with `pull`** is retrieved when it is relevant, by its `title` or its text, such as on a model's request or by a search.
- **`when`** narrows any kind. `hit("word")` checks the scanned text as keys do, so `"when": "hit('glass') && !hit('guard')"` expresses AND and NOT; `hit('')` is false.
- A **`disabled`** entry never activates.
- **Timing.** `once`, `sticky` and `cooldown` count from the messages that record the entry in `activated` (section 11.4), by their `turn` (section 11.1). An entry recorded at a message of round *t* with `sticky` *s* stays active through round *t* + *s*, and with `cooldown` *c* can't activate again through round *t* + *s* + *c*, where *s* is 0 without `sticky`. `chance` is the percent probability that the entry activates when it otherwise would.
- **`group`** lets at most one entry of the same owner's group be active at a time, the one of highest `priority`, chosen by `weight` among equals.
- **`priority`** is importance: when not every entry can be used, the least important give way first, and an entry of priority 100 never does.
- **Choosing.** An app decides which entries reach the model; activation, timing, `group` and `priority` say what the author intends.

### 7.3 Placement

- `"system"`: standing direction, such as tone, rules or an author's note.
- `"context"` (default): what the model needs to know.
- **`depth`** *d* places an entry inside the history, the messages on the path, with *d* of them after it: 0 is after the last, and a depth greater than the history places it before the first. An entry with `depth` has no `position`.

### 7.4 Knowledge

`knownBy` lists the characters who know an entry, and `narrator` in it names the narrator. Without it, everyone knows the entry; `["narrator"]` makes it narrator-only. In `characters` mode the narrator knows everything except content whose `knownBy` leaves it out; in `narrator` mode, where it writes every character's lines, it knows everything. Section 11.5 says who knows a message's parts, and nobody knows a hidden message's (section 11.4).

---

## 8. Variables

State is what a story tracks: a bell count, trust, an inventory, a phase. Every variable is declared with its type, valid values and who may change it.

```ts
interface Variable {
  id: string;
  type: "bool" | "int" | "string" | "enum" | "set";
  values?: string[];               // distinct; enum and set only (below)
  labels?: Record<string, string>; // display names for bool, enum and set values; bool uses only "true" and "false"
  min?: number;                    // integers; int only
  max?: number;
  initial?: Json;                  // the type's default
  of?: "cast" | "*" | string[];    // one value per key; a list is distinct (section 8.3)
  description: string;             // what it means and what moves it
  by?: ("player" | "model")[];     // distinct; who may change it; nobody
  maxStep?: number;                // integer ≥ 1; int only
  oneWay?: boolean;                // only moves forward
  spoiler?: boolean;               // the value and its changes are spoilers for players
  ext?: Ext;
}
```

### 8.1 Declaring

- **Types.** `bool`, `int` and `string` hold one JSON value. `enum` holds one of `values`, which it requires. `set` holds distinct strings: members of `values` when given, otherwise any strings. Only `enum` and `set` take `values`, and only `int` takes `min`, `max` and `maxStep`. `string` variables can't be `oneWay`.
- **Defaults.** Without `initial`: `false`; `0` raised to `min` or lowered to `max`; `""`; the first of `values`; `[]`.
- **`by`** says who is meant to change the variable: `player`, the people playing, and `model`, a model's output. An opening's `set` may change any variable.
- **`maxStep`** is the largest step one change `by: "model"` is meant to take; **`oneWay`** means numbers only rise, a bool only turns true, a set only gains members, and an enum only moves later in `values`. Both apply to each key of a keyed variable.
- **Recorded changes apply as written** (section 8.6): no check compares them with `by`, `maxStep` or `oneWay`, which guide whoever records a change.

### 8.2 Ownership

A variable belongs to the scenario, world or character that declares it. Text, conditions, openings and changes read and write it by its full name; its owner's own text and conditions may also use `own`.

| Declared by | Full name | In its owner's own text and conditions |
| --- | --- | --- |
| a scenario | `state.bell` | `state.bell` or `own.bell` |
| a character or world | `state.kai.nerve` | `own.nerve` |

Session entries have no `own`: in their text `{{own.…}}` is left as written, and in their conditions `own` is a `CEL_ERROR`.

### 8.3 Keyed variables

`of` makes a variable a map with one value per key, of any type.

| `of` | Keys |
| --- | --- |
| `"cast"` | every cast character (section 11.2) |
| a list, such as `["watch", "guild"]` | those keys |
| `"*"` | any author ID other than `char` and `user`; keys appear when a change sets them, such as `"state.inventory.torch": 2` |

- Read and change a key as `state.trust.kai`, or read it as `own.feelings.elena` in its owner's text and conditions. In CEL, look up a computed key with brackets: `state.trust[char]`, `own.feelings[user]`.
- `initial` is one value for every key, or an object of values by key, with at least one member. In the object, `*` gives the value of every key it doesn't list, and without `*` those keys take the type's default; members for keys the variable doesn't have are ignored, though for `"cast"` one that names no character is `UNKNOWN_CHARACTER`. Every key, a joiner's included, holds its initial value until a change sets it.
- Keys of `"*"` maps start absent, and `"*"` takes no `initial`. For bounds, `maxStep` and `oneWay`, an absent key counts as the type's default (section 8.1), and a key whose normalized value is the default is removed; in CEL an absent key is absent, so test it with `has()` or `in`. Their keys are in code point order.

### 8.4 The scene

The scene is built-in state: `scene.location`, a location ID or `""`, and `scene.present`, the characters who are there, kept in cast order (section 8.6). Every change may set it. Characters who aren't present are offstage.

### 8.5 Keys and values

Opening `set` and recorded changes write state by key:

- **Keys** are full names (section 8.2), followed by a key for keyed variables: `state.bell`, `state.trust.kai`, `state.kai.nerve`, `state.kai.feelings.elena`, and `scene.location` and `scene.present`.
- **Values** are absolute.
- **Validity.** A key is valid when it is `scene.location` or `scene.present`, or names a variable in use and, for a keyed variable, a key the variable allows. A value is valid when it has the variable's type, uses only listed members, is an integer within ±(2^53 − 1) for `int`, and is within the value limits of section 14; a change that leaves a `"*"` map with more than 256 keys is invalid too. An `int` outside `min` and `max` is still valid; it is clamped (section 8.6). A set with duplicate members is valid too; it is normalized. `scene.location` is a location ID of the bundle or session, or `""`; `scene.present` is a list of strings (section 8.6).

### 8.6 State at a message

The state at a message is computed by applying, in order:

1. every variable's initial value; no location; the whole cast present except the joiners (section 11.2);
2. the `changes` of every message on the path from the root to that message, in path order, and within a message in array order.

Initial and recorded values are normalized:

- *a.* A set loses duplicates, keeping each member's first occurrence; a set with `values` is then ordered as declared, and one without keeps that order. `scene.present` loses duplicates and IDs that name no cast character, and is ordered by cast order.
- *b.* An `int` is raised to `min`, then lowered to `max`.

Recorded changes are never recomputed: the state of a session doesn't depend on how its changes were produced.

---

## 9. Macros

Macros are the only substitution in text.

| Macro | Resolves to |
| --- | --- |
| `{{char}}` | The character the text belongs to (below) |
| `{{user}}` | The player's character being answered (below) |
| `{{state.<path>}}`, `{{own.<path>}}` | A state value, e.g. `{{state.bell}}`, `{{own.nerve}}`, `{{state.trust.char}}` |
| `{{scene.location}}`, `{{scene.present}}` | The current location, or the characters present |
| `{{pick::<a>::<b>…}}` | One of the options, chosen at random each time the text resolves, or once in a root (section 11.1) |
| `{{// <comment>}}` | Nothing; a note for authors |

- **`{{char}}`** is:
  - in a message part, the part's `speaker`; without one, it is left as written;
  - in a character's other text, that character;
  - in a cast member's `notes`, its character, or the character filling its seat;
  - in other text, the character the message being written is for, or the scenario's `narrator` when it is for the narrator; with no message being written, it is left as written.
- **`{{user}}`** is the speaker of the first speaking part in the latest player message on the path that has a speaking part, else the first player's character; with neither, it is left as written.
- In a state path, a `char` or `user` segment after the variable's name means the same character as the macro. When that is no character, the segment names no key, so the macro renders as nothing.
- **Rendering.** A value with a label renders as its label, a string that is a character ID as that character's name, else one that is a location ID as that location's name. Numbers render as decimal integers, booleans as `true` or `false`, lists as items joined by `, ` (an empty list as nothing), and maps as `Name: value` pairs joined by `, `, each item and value rendered as above, with keys that are character IDs shown by name and other keys with underscores as spaces. Map keys render in the order of `of`: cast order for `"cast"`, list order for a list, and code point order for `"*"`. `{{scene.location}}` always renders as its location's name. A substituted value is never scanned for macros again.
- **Unresolved.** Text between `{{` and `}}` that is no macro, such as `{{unknown}}`, and a macro naming a variable that isn't declared, as section 10.2 counts declarations, are left as written (`UNKNOWN_MACRO`); an absent key of a declared variable, a path below a value that isn't a map, or a variable whose owner isn't in use renders as nothing.
- **Which state.** Macros in a message resolve at that message: against its state, with `{{user}}` from the path to it. Elsewhere they resolve at the evaluation point (section 10.1), or, with no message being written, at the session's head, or at the initial state (section 8.6) when there is no head. In a scenario's text and in roots made from its openings, `own` means `state`.
- **Where.** Macros resolve in descriptions, summaries, dialogue examples, premises, briefings, notes, entry texts, variable descriptions, openings' `content` and the roots made from it, and image `alt`, in the bundle and in a session's characters, worlds and entries. Player and model messages are used as written, and so is every other string, such as names, aliases, titles, labels, taglines, warnings, keys, `limits` and expressions.
- **Escaping.** A writer that puts a player's or a model's words in a session's characters, worlds or entries MUST write each `\` as `\\` and each `{{` as `\{{`, in one left-to-right pass, so that they resolve to exactly what was written.
- **Parsing** is one left-to-right scan. At each `{{`, the longest form in the table, with no spaces outside comments and options, is a macro; otherwise the first `{` is kept and scanning resumes at the next character. A comment runs from `{{//` to the next `}}`. A pick has at least two options, none empty, and options can't contain `::` or `}}`. `\{{` produces a literal `{{`, and `\\` a literal `\`.
- **Stored text keeps its macros**, except picks in roots (section 11.1). They resolve when text is shown or sent.

---

## 10. Conditions

Conditions (`when`) use the Common Expression Language (CEL): small, sandboxed and non-Turing-complete.

### 10.1 Environment

A condition is evaluated at its **evaluation point**: the parent of the message being written.

| Name | Value |
| --- | --- |
| `state.<id>` | Each scenario variable at the evaluation point: `bool`, `int`, `string` and `enum` (string), `set` (list of strings); keyed variables are maps |
| `state.<owner>.<id>` | Each variable of a character or world in use |
| `own.<id>` | The variables of the expression's owner; for a scenario, its own |
| `scene.location`, `scene.present` | The scene |
| `scene.within` | The current location, then its ancestors, innermost first; `[]` with no location |
| `turn` | Rounds so far (section 11.1) |
| `elapsed` | Whole seconds between the evaluation point's `at` and its parent's, rounded down; 0 if either is missing or the gap is negative |
| `hour`, `weekday` | The local hour (0–23) and ISO weekday (1–7) of the evaluation point's `at`, at its offset; −1 if it has no `at` |
| `opening` | The path's opening ID, or `""` |
| `scenario` | The scenario being played |
| `char` | The character the message is written for (section 6.2); `""` for the narrator |
| `user` | The player's character `{{user}}` means, or `""` |
| `self` | The owner of the expression: a character, world or scenario ID, or `session` |
| `players` | The players' character IDs, in the order `players` lists them |
| `hit(key)` | Whether `key` matches the entry's scanned text, as keys do (section 7.2) |

```text
state.bell >= 10 && scene.location == 'vault'
char == self && own.nerve >= 2
'manor' in scene.within && turn > 5
'rope' in state.inventory || hit('rope')
state.trust[char] >= 80 && hour < 6
```

### 10.2 Rules

- Every expression type-checks: `state` against the scenario's variables and the variables of every character and world of the bundle and session, and `own` against the expression owner's. A bundle is checked once for each scenario, with the expressions in use in it (section 6.4), and a session's characters, worlds and entries with its scenario; an expression in use in no scenario is checked once, against no scenario variables.
- Conditions have type `bool`.
- Evaluation follows the CEL language definition, including its errors, such as integer overflow and division by zero. A runtime error makes a condition false; `&&` and `||` absorb an error when their other operand decides the result.
- `state`, `own` and `scene` are only selected from, as in `state.bell`: never indexed by computed strings or used as values. Keyed variables are maps, indexed with brackets (section 8.3); selecting `char` or `user` from one, as in `state.trust.char`, is a `CEL_ERROR`, since `state.trust[char]` is meant.
- Expressions use only `bool`, `int`, `string`, list and map values, and list and map literals hold values of one type. `double`, `bytes`, `uint` and `null` literals and type names used as values are a `CEL_ERROR`.
- Expressions may use CEL's operators, `?:` included. The only functions and macros are `size`, `has`, `contains`, `startsWith`, `endsWith` and `hit()`, which takes a string literal key.
- Selecting an absent value, such as a variable whose owner isn't in use or an absent key, is a runtime error. `has()` of such a selection is true exactly when selecting it isn't a runtime error, whatever the value, and is never an error itself.
- An expression that breaks any of these rules is a `CEL_ERROR`, and so is a `hit()` key that is a regex but isn't valid (section 14).

---

# Part II: Sessions

## 11. Session format

A session is a JSON Lines file: a header line, then one message per line. Messages form a forest: each opening tried, and each first message a player writes without one, is a root; alternative replies and branches are siblings, and the transcript is the path from a root to the head. Lines end with `\n` or `\r\n`, the last line may end without one, and no line is empty.

```ts
interface SessionHeader {
  $schema?: string;
  troupe: string;
  kind: "session";
  bundle?: string;                 // the bundle's id; inside a package, its bundle.json is played
  limits?: Limits;                 // the players' lines and veils
  scenario: string;                // scenario ID
  characters?: Character[];        // players' and joiners' (section 11.2)
  players?: string[];              // distinct characters people control, in order (section 11.2)
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
  char?: string;                   // model messages only: the character it was written for; absent for the narrator
  content: Part[];                 // empty only for a records-only message (section 11.4)
  at?: string;                     // when the message was written
  changes?: Change[];
  activated?: string[];            // the entries that reached the model for it, as distinct references (section 11.4)
  entries?: Entry[];               // entries added from here on (section 11.3)
  hidden?: boolean;
  ext?: Ext;
}

type Part =                         // every part MAY also carry ext; no speaker = narration
  | { type?: "text"; text: string; speaker?: string; knownBy?: string[] }
  | { type: "image"; src: string; alt?: string; speaker?: string; knownBy?: string[] };

interface Change {
  by: "opening" | "player" | "model";   // an opening's start; the people playing; a model's output
  set: Record<string, Json>;       // full key → new value; at least one
  ext?: Ext;
}
```

### 11.1 Messages

- Every `parent` names a message on an earlier line.
- A **root** is a system message made from an opening, or a player message. Every other system message is records-only (section 11.4).
- A root made from an opening has `opening` set, and:
  - holds the opening's `content` as written, with each `{{pick}}` replaced by the option chosen, that option's `\` and `{{` escaped as section 9 says, or no content when the opening has none;
  - records the opening's `set`, if any, as its first change, `by: "opening"`, with the players' characters added to a `scene.present` it sets. No other change is `by: "opening"`.
- **Rounds** count player messages on a path: a message's `turn` is the number of player messages from the root to it, inclusive, and a message being written has its parent's. `turn`, `sticky` and `cooldown` count rounds, as differences of `turn`.

### 11.2 Players and cast

- `players` lists, in order, every character a person plays:
  - a header character, which fills the next seat without a character, or a new seat after the scenario cast when none is left;
  - a cast character, which a person plays instead of a model, such as one marked `player`.
- The session's **cast** is the scenario cast with its seats filled, then the new seats, then the **joiners**: header `characters` that aren't players, who join or appear during the session. Seats no player fills are left out (section 6.1).
- Header characters and `players` hold for the whole session, on every branch; who is present is recorded on each path (section 8.4).

### 11.3 Session entries

A message may add entries, owned by `session`. They apply from that message onward on its path, so they belong to their branch. A later message's entry with the same ID replaces it from there on, and `disabled: true` removes it.

### 11.4 Other message fields

- **`activated`** lists, on a model message, the entries that reached the model for it, those retrieved by `pull` included. An entry kept active by `sticky` isn't listed again.
- **`hidden`** messages stay on the path, and their changes, activations and rounds count, but no character or the narrator knows their parts, and keys don't match them.
- **Records-only messages.** A system message with empty `content` is a root made from an opening without `content`, or carries `changes`, such as a player's edits to state. It has no `activated` or `char`, and has `entries` only on a root.

### 11.5 Knowledge

A message part is known by its speaker, by the characters present after its message's changes and, except on a root, by those present before them: the **witness rule**. A part's `knownBy` replaces this with exactly the listed characters. The narrator knows parts as it knows entries (section 7.4). Knowledge is about characters; secrets between the people playing are out of scope.

---

# Part III: Interchange

## 12. Files and packaging

### 12.1 Forms

| Form | Extension | Contents |
| --- | --- | --- |
| Single file | `.troupe.json` | One bundle |
| Package | `.troupe` | A ZIP archive with `bundle.json`, the files it references, and optionally sessions and other files (section 12.3) |
| Session | `.troupe-session.jsonl` | One session outside a package |

### 12.2 Files

Fields that hold a file (`cover`, `avatar`, location `image` and image parts) hold a PNG, JPEG, WebP, AVIF or GIF image, as an `https:` URL, a `data:` URI with base64 content and the lowercase media type `image/png`, `image/jpeg`, `image/webp`, `image/avif` or `image/gif`, or, in a package only, a path from the package root.

### 12.3 Packages

- `bundle.json` is at the root. Sessions are stored under `sessions/` with the `.troupe-session.jsonl` extension. Every path the bundle or sessions reference is a file of the package. A package may also hold files nothing in this document references, such as files an extension uses (section 13), and a writer that rewrites a package keeps them.
- Every file under `sessions/` with that extension is a session of the package. The package's files have paths matching `^[A-Za-z0-9_-][A-Za-z0-9._-]*(/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$`, with segments of at most 255 bytes. Every other entry, such as a directory (a name ending in `/`) or a file an archiver adds, isn't part of the package.
- No ZIP entry has an absolute path, a `..` segment or a backslash, is a symbolic link, is encrypted, uses a compression method other than store and deflate, or has the name of another entry compared ASCII case-insensitively.

---

## 13. Extensions and versioning

- **Extensions.** Every object of a bundle or session that this document defines with an interface MAY carry `ext`, keyed by an extension name matching `^[a-z0-9][a-z0-9.-]{0,63}$`, such as `risu.regex`. The `troupe.` prefix is reserved for the draft extensions of Appendix D. Writers MUST NOT add fields anywhere else, and MUST keep every `ext` of a file they rewrite unchanged, as a JSON value.
- **Unknown fields.** A property is unknown when its object's interface doesn't define it; for a part, the interface its `type` selects; a part of an unknown `type` is only `SCHEMA`. An unknown property carries no meaning, and is an `UNKNOWN_FIELD`; `SCHEMA` is judged with unknown properties removed.
- **Versions** are `major.minor`, compared as two integers, so `0.10` is newer than `0.9`. From 1.0, minor versions only add what files of an older minor can do without; before 1.0, any minor version may break. A file of a version other than this document's is `UNSUPPORTED_VERSION`.

---

## 14. Security and limits

Files hold data and sandboxed expressions (section 10), never scripts, and their size and the work they ask for are bounded. Their text is Markdown, which can hold raw HTML, links and images; how they are shown is the app's.

- **Regexes.** A regex key is valid when its flags are distinct, from `i` (ignore case), `m` (`^` and `$` also match at line breaks) and `s` (`.` also matches line breaks), and its pattern is built only from:
  - characters, including `\t`, `\n`, `\r`, `\f` and `\v`, with a `\` before any of ``^$\.*+?()[]{}|/`` that stands for itself; in a class, only `\`, `[`, `]` and a `-` that isn't first or last need it, though the others and `-` may have it;
  - `.`, `^`, `$`, `\b`, `\B`, `|`, groups `(…)` and `(?:…)`;
  - classes `[…]` and `[^…]` of at least one character, class escape or range `x-y`, with `x` not after `y`; a `^` first in a class makes it `[^…]`;
  - the class escapes `\d`, `\D`, `\w`, `\W`, `\s`, `\S`, and `\p{…}` and `\P{…}` with the abbreviation of a Unicode general category other than `Cn` and `LC`, such as `L` or `Lu`;
  - after a character, `.`, class, class escape or group, a quantifier `*`, `+`, `?`, `{n}`, `{n,}` or `{n,m}`, with n ≤ m and no `{0}` or `{0,0}`, optionally followed by `?`.

  The pattern means what it means in ECMAScript with the `u` flag. It nests groups at most 100 deep, and written out in full, with each counted repetition replaced by its copies (`x{2,3}` as `xxx`, `x{2,}` as `xxx*`), it is at most 1000 bytes, so `(a{10}){200}` is too long. Such a pattern also compiles in RE2, though RE2 reads `.`, `\s` and `m` slightly differently. It is regular, so it can run in linear time on an automaton engine.
- **Limits.** Files stay within these limits:

| Item | Size limit |
| --- | --- |
| Bundle JSON | 32 MiB |
| Session file / messages | 256 MiB / 100,000 |
| ZIP entries in a package / unpacked size | 10,000 / 512 MiB |
| JSON nesting depth | 64 |
| Entries / variables in a bundle, all owners, and separately in the characters and worlds a session adds | 10,000 / 1,000 |
| A text value: a part's `text`, an entry's `text` or a description, in UTF-8 | 1 MiB |
| Session entries on a path, the latest per ID | 10,000 |
| One CEL expression | 4 KiB |
| Characters in a session's cast | 256 |
| A string state value, in UTF-8 | 4 KiB |
| Distinct members of a set value, or keys of a `"*"` map after a change | 256 |

The last two are **value limits**: a value past them is invalid (section 8.5).

---

## 15. Conformance

### 15.1 Requirements

A **conforming file** validates against the schemas, passes the checks of section 15.3, stays within the limits of section 14, and follows section 13. A conforming **writer** writes only conforming files, and follows every rule this document gives writers.

### 15.2 Readers

A conforming **reader** reads at one of two levels:

- A **bundle reader** accepts every conforming single file and package of its version and gives their fields the meaning this document defines. It MAY leave a package's sessions unread.
- A **session reader** is a bundle reader that also accepts every conforming session of its version, in a package or as a file, and gives its fields their meaning.

From 1.0, a reader also accepts the conforming files of an older minor version of its major version, at its level.

### 15.3 Checks

Each check has a code, for validators to report it with. Every check runs on the document as written, so one value can fail several.

| Code | Check |
| --- | --- |
| `PARSE` | The input is I-JSON (section 2.2), or session lines of I-JSON (section 11), a Troupe document of the `kind` its form holds (section 12.1), within the limits table of section 14 other than the value limits, with package paths only in a package (section 12.2), and a package follows section 12.3 |
| `UNSUPPORTED_VERSION` | `troupe`, when present, is this document's version (section 13); a missing `troupe`, or one that isn't `major.minor`, is only `SCHEMA` |
| `SCHEMA` | The document validates against its schema, with `format` asserted, apart from unknown properties (section 13) |
| `UNKNOWN_FIELD` | Every property is one this document defines (section 13) |
| `DUPLICATE_ID` | IDs are unique as section 2.3 requires |
| `UNKNOWN_SCENARIO` | The header's `scenario` names a scenario |
| `UNKNOWN_CHARACTER` | Cast members name bundle characters; `knownBy` (where `narrator` is also allowed), speakers, example speakers (or `char`, `user`), message `char`, members of `scene.present` values and members other than `*` of `"cast"` variables' `initial` objects name characters in the bundle or session |
| `UNKNOWN_WORLD` | `scenario.worlds` names bundle worlds |
| `UNKNOWN_LOCATION` | `scene.location` values and `parent` name locations, without cycles |
| `UNKNOWN_OPENING` | A root's `opening` exists |
| `UNKNOWN_ENTRY` | `activated` names entries in use |
| `UNKNOWN_VARIABLE` | Keys in openings and changes are valid keys (section 8.5) |
| `INVALID_VALUE` | `initial` values, and the values of valid keys in opening `set` and recorded changes, are valid for their variables (section 8.5); unknown locations and characters in values are reported only as `UNKNOWN_LOCATION` and `UNKNOWN_CHARACTER` |
| `UNKNOWN_MESSAGE` | `parent` names a message on an earlier line, and the header's `head` names a message |
| `INVALID_PLAYER` | `players` names header characters or cast members |
| `CEL_ERROR` | Every expression parses, type-checks and follows section 10.2 |
| `REGEX_ERROR` | Every regex key in `keys` is valid (section 14); an invalid regex key in `hit()` is a `CEL_ERROR` (section 10.2) |
| `UNKNOWN_MACRO` | In text where macros resolve, macros are valid and name declared variables (section 9) |

---

## Appendix A: JSON Schemas

The JSON Schema 2020-12 files are normative for structure. Each `$id` names the schema and its minor version, and is where the schema is published, such as `https://docs.troupes.ai/schema/0.13/bundle.schema.json`.

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
  "troupe": "0.13",
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

Two thieves hired by the player to steal a duke's storm lantern before the twelfth bell. Shown as `bundle.json` inside a package, so file names are package paths; the session after it is `sessions/heist.troupe-session.jsonl` in the same package.

```json
{
  "$schema": "https://docs.troupes.ai/schema/0.13/bundle.schema.json",
  "troupe": "0.13",
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
        { "id": "master_key", "knownBy": ["elena"], "text": "Elena still has the surveyor's master key to the Duke's vault, and hasn't told anyone." },
        { "id": "betrayed", "knownBy": ["elena"], "when": "state.kai_confessed", "text": "Elena knows Kai meant to lead the crew into the Duke's trap. She is furious with him." }
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
        { "id": "voice", "knownBy": ["kai"], "depth": 4, "text": "{{char}} calls people 'boss' and talks in quick, joking bursts." },
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
        { "id": "guards", "when": "'manor' in scene.within", "text": "Guards walk the manor in pairs and change shifts at every bell." },
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
          "id": "trust", "type": "int", "of": "cast", "initial": { "*": 50, "elena": 70, "kai": 40 }, "min": 0, "max": 100,
          "description": "How much this character trusts {{user}}, from 0 to 100. Rises when promises are kept or risks are shared; falls on lies and reckless orders.",
          "by": ["model"], "maxStep": 20, "spoiler": true
        },
        {
          "id": "approach", "type": "enum", "values": ["quiet", "loud"],
          "labels": { "quiet": "Slip in unseen", "loud": "Make a scene and grab it" },
          "description": "How {{user}} wants the job done.",
          "by": ["player"]
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
        { "id": "twelfth", "position": "system", "when": "state.bell >= 12", "text": "The twelfth bell has rung and the harbor gates are shut. Bring the story to its end." },
        { "id": "patrol", "when": "scene.location == 'rooftops'", "chance": 30, "text": "A guard patrol passes below the rooftops, close enough to hear." },
        { "id": "key_known", "when": "state.key_revealed", "text": "Elena has the surveyor's master key to the vault." },
        { "id": "confess", "knownBy": ["kai"], "depth": 2, "when": "state.trust.kai >= 80", "text": "Kai trusts {{user}} enough to confess the Duke's deal if asked directly." }
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
          "set": { "scene.location": "vault", "state.bell": 11 },
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
{"troupe":"0.13","kind":"session","scenario":"heist","characters":[{"id":"mara","name":"Mara","description":"A retired smuggler with a debt to settle."}],"players":["mara"],"head":"4"}
{"id":"1","opening":"rooftop_briefing","from":"system","content":[{"text":"Rain hammers the slate roofs above the Duke's manor."},{"speaker":"elena","text":"*Elena unrolls a soaked map.* Two guards on the east stair. We go at the eighth bell."},{"speaker":"kai","text":"Or we go now, while they're drunk. *He grins at {{user}}.* Your call, boss."}],"changes":[{"by":"opening","set":{"scene.location":"rooftops"}}]}
{"id":"2","parent":"1","from":"player","at":"2026-10-17T21:04:00+02:00","content":[{"speaker":"mara","text":"We wait for the eighth bell. Kai, you take the east stair."}],"changes":[{"by":"player","set":{"state.approach":"quiet"}}]}
{"id":"3","parent":"2","from":"model","char":"kai","activated":["veyra/weather_fog","veyra/guards","kai/voice","kai/deal","heist/style","heist/clock"],"content":[{"speaker":"kai","text":"East stair. Sure. *He's gone before anyone can stop him.*"}],"changes":[{"by":"model","set":{"scene.present":["mara","elena"],"state.kai.nerve":1}}]}
{"id":"4","parent":"2","from":"model","char":"kai","activated":["veyra/weather_rain","veyra/guards","kai/voice","kai/deal","heist/style","heist/clock"],"content":[{"text":"The seventh bell rolls across the harbor."},{"speaker":"kai","text":"*Kai hesitates, then nods.* Fine. Your plan, boss. For once."},{"speaker":"kai","knownBy":["kai"],"text":"*If the Duke's men are early, this ends badly for all of us.*"}],"changes":[{"by":"model","set":{"state.bell":7,"state.trust.kai":50}}],"entries":[{"id":"stair","knownBy":["kai"],"text":"Mara gave Kai the east stair, the post closest to the Duke's trap."}]}
```

---

## Appendix C: Design decisions

| Decision | Instead of | Why |
| --- | --- | --- |
| Content and state; no rules engine | Events, triggers, computed and derived values, dice | Sessions record every change, so reading one never runs rules. When state changes is the app's, and models update state from its description. |
| One `Entry` for lore, instructions, secrets, goals, notes and memories | A type for each | One shape, one thing to learn. |
| No keys means always on; `hit()` in conditions; `/…/` keys | Flags, logic modes, match modes | Fewer fields, any boolean logic, simple matching rules. |
| Owner-scoped variables, `own` | One shared namespace | Characters and worlds stay self-contained when combined. |
| Openings only in scenarios | Openings on characters too | Characters stay reusable in any story; a companion costs one small scenario, and there is one place to look. |
| Openings as roots | A single root and header start values | Alternative first messages, and starting values recorded like any change. |
| Declared, typed variables | Free-form state | Every app knows what values mean. |
| Integers only | Decimals too | Integer arithmetic and display agree in every language; a scale such as 0–100 covers fractions. |
| Absolute changes, recorded | JSON Patch, or recomputing | Replay needs no evaluation, from any channel. |
| Keys written as state is read | A separate spelling for writes | Each value has one full name, the same in conditions, macros, openings and changes. |
| A schema of files, not of how apps play them | A second document fixing prompt assembly, entry selection, context strategy and model output | Sessions record every change, so a reader needs only the meaning of what is stored; how an app writes prompts and calls models is its own, and can improve without a new version. |
| No message summaries or pinned messages | Fields for an app's context strategy | Apps fit long chats into a model's context their own way; a memory is a session entry. |
| Valid files, not repair | Rules for reading broken files leniently | A file either conforms or fails a check with a code; what an app does with a broken file is its own. |
| Readers accept every conforming file of their level and read it as defined, at one of two levels | No duty on readers; every reader reading sessions | A file that conforms opens with the same meaning in every app that reads its kind; an app that only edits or plays bundles conforms without reading another app's chats. |
| Recorded changes apply as written; `by`, `maxStep` and `oneWay` aren't checked | A check that replays every change against its variable | Readers never second-guess a recorded change, so a session reads the same everywhere; the fields still tell writers and models what is meant. |
| Witness knowledge; `["narrator"]` for narrator-only | Everyone knows everything; `[]` | Offstage characters miss what happens, and no list is empty. |
| Player and model messages used as written | Resolving macros in them, or escaping them | Chat text moves between apps unchanged, and no hidden state leaks through model output or prompt attacks. |
| Session characters can't reuse a bundle character's ID | Replacing the bundle character | A persona never takes over a story's character by accident; an edited character travels in the package's bundle. |
| Durations in rounds | Messages | The same file behaves the same in solo and group chats. |
| Timestamps keep their offset | UTC only, or a time zone name | `hour` and `weekday` read the writer's local time without a time zone database. |
| Copies with `credits` | Live cross-bundle references, structured provenance | People write attribution as they like. |
| `id` only links sessions to their bundle | Rules for forks, translations, release order, version pins or hashes | Nothing could check them. A session that must keep the exact story it was played with travels in a package with that bundle. |
| No authorship, model, reasoning or tool fields | Message `author` and `model`, provider transcripts | No rule reads them; apps keep such data in `ext`. |
| No image-embedded form | Bundles hidden in PNG chunks for image hosts | Hosts strip the chunks, and a package or single file already carries a story with its images. |
| No executable code; display is the app's | Scripts in cards; rules for showing Markdown, links and media | Scripts in shared cards can steal API keys, and a schema can't constrain how text is shown. |
| No text transforms | Regex scripts that rewrite text | Most build HTML, fix one model's quirks, or display stats that state now covers. |
| No sprites, audio, voices or UI grouping in the core | Media and presentation fields | They belong to apps, and expression images to the `troupe.media` extension; the core keeps only what authors say about their story. |
| Sessions as an exchange snapshot | Prescribing storage, or an append-only log of edits | Apps keep their own databases; chats still move intact between session readers. |
| Writers leave out empty optional fields | Allowing `""` and `[]` anywhere | Two writers of the same story produce the same fields. |
| Limits on files, on CEL and on values | Only a file size cap, or each app's own | Every conforming file is bounded in size and in the work it asks for. |
| Regex keys written `/pattern/flags`, in forms ECMAScript and RE2 share | RE2 syntax, or whatever an engine accepts | Most SillyTavern regex keys work as written, every app can compile them, and a key is valid or `REGEX_ERROR` alike everywhere. |

---

## Appendix D: Future work

These draft extensions use the `troupe.` prefix (section 13) and may join the core once proven:

- **`troupe.overlay`:** a bundle that patches another by ID, for translations and mods.
- **`troupe.media`:** expression images: a character's images by label, such as `angry`, and the label a message part shows. Voices and audio stay out: voices belong to a provider, and audio to an app's interface.

An extension joins this repository with its own document, a schema for its `ext` value and conformance cases, and shares the spec's version.

---

## Appendix E: References

- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174): requirement keywords
- [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259), [RFC 7493](https://www.rfc-editor.org/rfc/rfc7493): JSON and I-JSON; [JSON Lines](https://jsonlines.org/)
- [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339): timestamps; [BCP 47](https://www.rfc-editor.org/info/bcp47)
- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12); [CommonMark 0.31.2](https://spec.commonmark.org/0.31.2/)
- [CEL](https://github.com/google/cel-spec/blob/master/doc/langdef.md); [ECMAScript regular expressions](https://tc39.es/ecma262/#sec-regexp-regular-expression-objects); [RE2 syntax](https://github.com/google/re2/wiki/Syntax)
- [PKWARE APPNOTE](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)
