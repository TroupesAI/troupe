# Troupe Format

**Version 0.11 (draft)** · October 11, 2026

Troupe is an open file format for AI roleplay: characters, the worlds they live in, the scenarios that bring them together, the mechanics that drive a story, and the chat sessions played from them. One file can hold a single character or a full multi-character story.

This document defines the files and what every field means. [Troupe Play](play.md) defines how apps play them, so that every app gives the model the same inputs and records the same outcomes.

> **Status.** This is a draft. Breaking changes are allowed until 1.0. Schema URLs use the placeholder host `troupe.example`. A conformance suite accompanies this draft.

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
13. [Chronicles](#13-chronicles)

**Part III: Interchange**

14. [Files and packaging](#14-files-and-packaging)
15. [Extensions and versioning](#15-extensions-and-versioning)
16. [Security and limits](#16-security-and-limits)
17. [Conformance](#17-conformance)

**Appendices:** [A Schemas](#appendix-a-json-schemas) · [B Examples](#appendix-b-examples) · [C Patterns](#appendix-c-patterns) · [D Authoring brief](#appendix-d-authoring-brief) · [E Other formats](#appendix-e-other-formats) · [F Design decisions](#appendix-f-design-decisions) · [G Road to 1.0](#appendix-g-road-to-10) · [H References](#appendix-h-references)

---

## 1. Overview

### 1.1 Goals

- **Portable.** Everything that changes what a model sees is defined exactly, and its outcome is recorded in the session, so any app can continue any session.
- **Small.** A few primitives that compose. A character card is a dozen lines.
- **Multi-character.** Casts, several players, narrators and per-character knowledge are built in, and characters stay self-contained when combined.
- **Mechanics without code.** Stats, clocks, inventories, beats and random outcomes are declared, never scripted.
- **Model-agnostic and safe to share.** Files hold data and sandboxed conditions, never executable code or model-specific syntax.

Non-goals: prompt templates and sampler settings, image and voice generation, app UI, accounts, sync and scripting.

### 1.2 Documents

Troupe is specified in two normative documents with one version:

| Document | Defines | For |
| --- | --- | --- |
| Troupe Format (this document) | The files: their fields and what they mean, identifiers and references, packaging, versioning, security, and the checks readers report | Authors, editors, validators, converters and every app |
| [Troupe Play](play.md) | How an app plays the files: starting and continuing sessions, state and events, rolls, entry activation, prompt contents and knowledge | Apps that play stories |

The [implementer's guide](../guides/implementers.md) is informative: advice on presenting and running stories that doesn't affect interoperability. "Play 3.2" means section 3.2 of Troupe Play; a section number alone means this document.

### 1.3 Object model

```text
Bundle  (.troupe.json)
├── characters[]   identity, entries, own mechanics
├── worlds[]       locations, entries, own mechanics
└── scenarios[]    cast, openings, entries, variables, events

Session    (.troupe-session.jsonl)     a header and a forest of messages
Chronicle  (.troupe-chronicle.json)    one character's memories and relationship across sessions
```

Six ideas carry the format:

1. **Entries** are all conditional text for the model: lore, instructions, secrets, goals, notes and memories (section 7).
2. **Variables** hold typed state. Events, players or a model change them, and every change is recorded (section 8).
3. **Events** react to state with changes, messages and directions (section 9).
4. **Conditions** in CEL gate entries and events (section 11).
5. **Sessions** are message trees that record every outcome, so any app can continue them (section 12).
6. **Chronicles** carry a character's memories and relationship from one session, and one app, to the next (section 13).

### 1.4 A first example

This is a complete card: a character, and a scenario that starts a chat with them. Each opening is a swipeable first message.

```json
{
  "troupe": "0.11",
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

The scenario's cast defaults to one player seat and every character in the bundle.

Appendix B builds up to a full story with lore, a group, state and events.

---

## 2. Conventions

### 2.1 Requirement keywords

MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are used as described in RFC 2119 and RFC 8174, and only when written in capitals.

### 2.2 Values

- Documents are I-JSON (RFC 7493): UTF-8 without a byte order mark, no duplicate member names, no surrogate or noncharacter code points, written or escaped, numbers that fit an IEEE 754 double, integers within ±(2^53 − 1).
- Writers MUST NOT write `null` in a field this spec defines. Readers MUST treat `null`, `""` and `[]` in an optional field like a missing field, except in state values and `scenario.worlds`, where `""` and `[]` are values.
- **Defaults are normative.** Every default stated in these documents or their TypeScript comments applies when a field is absent. Every boolean defaults to `false`.

### 2.3 Identifiers

| Kind | Grammar |
| --- | --- |
| Author IDs: characters, worlds, scenarios, locations, entries, openings, variables, events, groups, variable keys | `^[a-z][a-z0-9_]{0,63}$` |
| Message, bundle, session and chronicle IDs | `^[A-Za-z0-9_-]{1,64}$` |
| Session seeds | `^[A-Za-z0-9_-]{16,64}$` |

- Author IDs MUST NOT be a CEL reserved word: `as`, `break`, `const`, `continue`, `else`, `false`, `for`, `function`, `if`, `import`, `in`, `let`, `loop`, `namespace`, `null`, `package`, `return`, `true`, `var`, `void`, `while`.
- Characters, worlds and scenarios MUST NOT use the IDs `char`, `user`, `narrator`, `session`, `state`, `scene`, `players` or `own`. Variables MUST NOT be named `scene`.

| IDs | Unique among |
| --- | --- |
| Characters, worlds, scenarios | All of them, including those a session adds, except a session character replacing a bundle character (section 12.2) |
| Scenario variables | Each other, the scenario's entries and events, and every character and world ID in the bundle or session; on a clash with a character or world the variable is ignored |
| Entries, variables and events | Each other within the same owner, compared in that order: a variable or event that reuses an earlier ID is the duplicate |
| Groups | The same owner |
| Locations | The bundle and the session |
| Openings | The same scenario |
| Messages | The session |
| Memories | The chronicle |

### 2.4 References

- Objects refer to each other by plain ID.
- Things owned by a character, world or scenario are named `<owner>/<id>`: entries (`veyra/late_bells`), and the events of characters and worlds (`kai/bolts`). Entries added by messages have the owner `session`. A scenario's own events are named by their plain ID.
- State uses dots instead (section 8): `bell`, `trust.kai`, `kai.nerve`.
- References resolve to whatever copy the app has. There are no version ranges or content hashes.

### 2.5 Text

Model-facing text is Markdown (CommonMark 0.31.2). Apps MUST NOT render raw HTML from any field; they MAY render GFM tables and strikethrough. A **field** is one JSON string value. Timestamps are RFC 3339 in UTC, ending in `Z`, and language tags BCP 47 in canonical case.

### 2.6 How to read this document

The JSON Schemas (Appendix A) are normative for structure, the prose for meaning and behavior. Appendices B to H are informative, except where Appendix G sets release requirements. Part I is enough to write bundles.

---

# Part I: Authoring

## 3. Bundle

A bundle states the spec version and publishing metadata once, then lists its contents in any mix.

```ts
interface Bundle {
  $schema?: string;
  troupe: string;                  // spec version, e.g. "0.11"
  kind: "bundle";
  id?: string;                     // lineage: shared by releases and translations
  name?: string;                   // the title; the first scenario's own name, else the first character's
  tagline?: string;                // one line for listings
  version?: string;                // for people: "1.2", "winter edit"
  updated?: string;                // RFC 3339; orders releases of the same id
  authors?: string[];              // shown as the byline
  credits?: string;                // Markdown for people: license, sources, thanks; never sent to models
  language?: string;               // BCP 47
  tags?: string[];
  rating?: "general" | "mature" | "explicit";
  warnings?: string[];             // content warnings, free text
  cover?: string;                  // image (section 14.2)
  creatorNotes?: string;           // for people; never sent to models
  requires?: string[];             // extensions the file can't work without
  characters?: Character[];
  worlds?: World[];
  scenarios?: Scenario[];
  ext?: Ext;
}
```

- **`id`** lets apps recognize newer releases (by `updated`) and lets sessions find their bundle. Authors SHOULD set it to a random UUID when sharing.
- **`credits`** holds everything else about who made what and on what terms, written as the authors like: `Based on [Mira](https://example.com/mira) by Sakura. CC BY 4.0.`
- **A fork** MUST get a new `id` and SHOULD credit the original in `credits`, with a link.
- **A translation** has the same `id`, another `language`, and every author ID unchanged, so sessions open with any translation.
- **A lore pack** is a bundle with only worlds; people can add one to a session.

---

## 4. Character

A character is anyone in a story, played by a model or a person. Everything a character needs travels with it: its entries and its own variables and events. How a story starts belongs to scenarios (section 6), so the same character can join any of them.

```ts
interface Character {
  id: string;
  name: string;                    // what people and models call them
  aliases?: string[];              // other names, including a full name
  description: string;             // Markdown; headings such as "## Personality" for structure
  summary?: string;                // short version, shown when they are mentioned offstage
  examples?: Line[][];             // sample exchanges
  entries?: Entry[];               // lore, direction, secrets, goals (section 7)
  variables?: Variable[];          // the character's own state, read as own.<id> (section 8)
  events?: Event[];
  avatar?: string;
  images?: Record<string, string>; // expressions and outfits: "happy", "winter/happy"
  ext?: Ext;
}

interface Line {
  speaker?: string;                // "char", "user" or a character ID; absent for narration
  text: string;
  ext?: Ext;
}
```

- **`description`** is everything the model needs to play the character, appearance included. Its structure is up to the author; apps MUST NOT depend on heading names.
- **`examples`** show how the character talks. `char` is this character and `user` the player's. Examples are never part of history.
- **The player's character** is usually an ordinary character stored in the session, or a cast member marked `player` (section 6.1).

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
  name?: string;                   // the bundle's name, else the scenario's ID
  tagline?: string;
  premise?: string;                // the situation, sent to the model
  briefing?: string;               // for the players; never sent to models
  mode?: "characters" | "narrator" | "mixed";   // "characters"
  cast?: CastMember[];             // one player seat + every bundle character
  worlds?: string[];               // world IDs; every bundle world; [] for none
  openings?: Opening[];            // none = the player writes first
  entries?: Entry[];
  variables?: Variable[];          // shared state, read as state.<id>
  events?: Event[];
  ext?: Ext;
}

interface CastMember {
  character?: string;              // absent = a seat for a person, who brings a character
  player?: boolean;                // a person plays this bundle character; it fills a seat
  notes?: string;                  // scenario-specific context, sent to the model
  spoiler?: boolean;               // hide from players' interfaces until first present
  ext?: Ext;
}

interface Opening {
  id: string;
  title?: string;                  // shown when choosing among openings
  set?: Record<string, Json>;      // starting values, including scene.location and scene.present
  content?: Part[];                // the first message; absent = the model writes it (Play 2.1)
  ext?: Ext;
}
```

### 6.1 Cast

- The default cast is one player seat followed by every bundle character, in bundle order. A cast may hold only seats. Characters outside the cast take no part in the scenario.
- **Seats** are cast members without `character`, filled by a character the person brings, and members with `player`, which a person plays as written. Every seat is filled when a session starts; an app without a persona supplies one, such as a character named "You".
- **`spoiler`** asks apps not to show a cast member in players' interfaces, such as a cast list, until the character is first present. Everyone can still read the file.

### 6.2 Modes

- **`characters`** generates each model-played character's turns separately.
- **`narrator`** has one voice write the whole scene, including every character's lines.
- **`mixed`** is `characters` plus a narrator who MAY take turns describing the scene.

The narrator's style is set with scenario entries placed in `system` with `knownBy: ["narrator"]`.

### 6.3 Openings

- Each opening becomes a separate root message, so people can swipe between openings. Its `id` survives reordering and edits; conditions see the chosen one as `opening`.
- `set` gives starting values, written like a change (section 8.5), with full keys: `{"scene.location": "vault", "bell": 11, "kai.nerve": 2}`. `own.` isn't resolved there.
- **Without `content`**, the model writes the first message from the opening's setup, so an opening can be just a starting point: `{"id": "tavern", "title": "At the tavern", "set": {"scene.location": "tavern"}}`. A list of these works as a menu of starting points. Direction for the first reply is an entry with `"when": "opening == 'tavern' && turn == 0"`.
- Unless `set` lists `scene.present`, the characters present at the start are the players' characters and the characters who speak in the opening; for an opening without `content`, every character in the session's cast when it starts (section 12.2). When `set` lists `scene.present`, the players' characters are added to it. Either way, chronicle characters that join the cast (Play 2.2) are added too.
- A character's actions belong in their own part, usually in italics. Parts without a speaker are scene narration.

### 6.4 What a session uses

The entries, variables and events **in use** in a session are those of the scenario, its worlds, the session's worlds, every cast character, and the session's own entries. Each keeps its owner, so two characters can both have a `mood` without sharing it.

---

## 7. Entries

An entry is a piece of text that reaches the model when its conditions hold: lore, a standing instruction, a style reminder, a secret, a goal, a note, a memory. Every entry has the same shape wherever it lives.

```ts
interface Entry {
  id: string;
  text: string;
  title?: string;                  // a short name, for editors and for pulling

  // activation (Play 5)
  keys?: string[];                 // words that activate it; "/…/" is an RE2 pattern
  pull?: boolean;                  // retrieved on demand by meaning (Play 5.6)
  when?: string;                   // CEL condition that must hold
  scanDepth?: number;              // messages scanned for keys; 4
  chain?: boolean;                 // its text can activate other entries

  // timing, in rounds (Play 3.1)
  once?: boolean;                  // activates at most once on a path
  sticky?: number;                 // stays active this many rounds after activating
  cooldown?: number;               // then can't activate for this many rounds
  chance?: number;                 // 0–1; 1

  // competition
  group?: string;                  // at most one entry per group of the same owner is used
  weight?: number;                 // integer odds among equal priority; 1
  priority?: number;               // 0–100; 50; importance in groups and when space runs out

  position?: "system" | "context" | "tracker" | number;   // "context"; a number is a depth in history
  knownBy?: string[];              // characters who know it; everyone
  carry?: boolean;                 // a session entry kept in the chronicle (section 13)
  disabled?: boolean;
  ext?: Ext;
}
```

### 7.1 Where entries live

| Owner | Candidate |
| --- | --- |
| A world | while the world is in use |
| A character | while the character is present, or being generated for |
| A scenario | always |
| A message (`session`) | from that message onward on its path (section 12.3) |

### 7.2 Activation

- An entry **without `keys` or `pull`** is always on, subject to `when`. Standing instructions, secrets and goals are written this way.
- An entry **with `keys`** activates when one appears in recent messages, including speakers' names. Keys match whole words, ignoring case. A key of at least three characters that starts and ends with `/` is an RE2 pattern for anything else: `/dragons?/`, `/(?-i)Kai/`.
- An entry **with `pull`** and a `title` is retrieved when it is relevant: requested by the model, or found by the app's similarity search (Play 5.6). Large lorebooks rely on pulling.
- **`when`** narrows any kind. `hit("word")` checks recent text with the same rules as keys, so `"when": "hit('glass') && !hit('guard')"` expresses AND and NOT.
- **`priority`** is importance: the highest-priority candidates compete in a group, and the lowest go first when space runs out. Priority 100 is never dropped. Order in the prompt follows the file.

### 7.3 Placement

- `"system"`: standing direction, such as tone, rules or an author's note.
- `"context"` (default): what the model needs to know.
- `"tracker"`: guidance for the model tracker only (Play 3.4), such as how to judge time passing.
- A number *d*: inside history, with *d* history messages after it; 0 is after the last.

### 7.4 Knowledge

`knownBy` lists the characters who know an entry. A character's entries without `knownBy` reach every character present, so a secret needs `knownBy` set to its owner. A goal is a secret with a `when` for its phase; an instruction for one character's turns is an entry with `knownBy` set to that character. `["narrator"]` makes an entry narrator-only; an entry with explicit `knownBy` reaches the narrator only if it lists `narrator`. Play 7 says who sees what.

---

## 8. Variables

State is what a story tracks: a bell count, trust, an inventory, a phase. Every variable is declared, so every app knows what it means, which values are valid, and who may change it.

```ts
interface Variable {
  id: string;
  type: "bool" | "int" | "number" | "string" | "enum" | "set";
  values?: string[];               // enum: required; set: allowed members, or any string
  labels?: Record<string, string>; // display names for bool, enum and set values; bool uses "true" and "false"
  min?: number | string;           // int and number; a string names another variable of the same owner
  max?: number | string;
  initial?: Json;                  // the type's default
  derive?: string;                 // CEL: computed from other state, never recorded
  of?: "characters" | "cast" | "others" | "*" | string[];   // one value per key (section 8.3)
  description: string;             // what it means and what moves it
  by?: ("player" | "model")[];     // who besides openings and events may change it; nobody
  maxStep?: number;                // largest change per message from the model
  oneWay?: boolean;                // only moves forward
  ask?: string;                    // a question asked when a session starts
  spoiler?: boolean;               // hide from players' interfaces until the story ends
  carry?: boolean;                 // a character's value kept in its chronicle (section 13)
  ext?: Ext;
}
```

### 8.1 Declaring

- **Types.** `bool`, `int`, `number` and `string` hold one JSON value. `enum` holds one of `values`. `set` holds distinct strings: members of `values` when given, otherwise any strings. For `int`, numeric `min`, `max` and `maxStep` are integers. `string` variables can't be `oneWay`.
- **Defaults.** Without `initial`: `false`; `0` raised to `min` or lowered to `max`; `""`; the first of `values`; `[]`.
- **`description`** is written for authors and models alike. A model that updates state receives it as its instructions: "How much this character trusts {{user}}. Rises when promises are kept; falls on lies."
- **`by`.** Openings and events may always change a variable. `player` lets people change it through their interface; `model` lets the model tracker change it (Play 3.4).
- **`min` and `max`** may name another numeric variable of the same owner that is neither keyed nor derived, such as `"max": "max_hp"`; its current value is the bound.
- **`maxStep`** limits each change from the model; **`oneWay`** lets numbers only rise, a bool only turn true, a set only gain members, and an enum only move later in `values`. Both apply to each key of a keyed variable. Starting values are exempt.
- **`derive`** makes a read-only variable computed from other state whenever it is read, such as `"derive": "state.clock / 24 + 1"` for the day. Derived variables have no `initial`, `by`, `ask`, `of`, `maxStep` or `oneWay`, can't be changed, and can't read other derived variables.
- **`ask`** puts a question to the player when the session starts and records the answer, whatever `by` says; `labels` name the choices. Questions are asked in the order scenario, worlds, characters, then declaration order. `ask` is not allowed with `of` or `derive`.
- **`spoiler`** asks apps to hide the value and its changes from players' interfaces until the story ends or a person chooses to look. Everyone can still read the file.
- **Showing state to the model** is done with an entry, so authors choose the wording and who knows it: `{"id": "hp", "text": "{{user}} has {{state.hp}} of {{state.max_hp}} HP."}`.

### 8.2 Ownership

A variable belongs to the scenario, world or character that declares it.

| Declared by | Read as | In its owner's own text, conditions and event writes | Change key |
| --- | --- | --- | --- |
| a scenario | `state.bell` | `state.bell` (and `own.bell`) | `bell` |
| a character or world | `state.kai.nerve` | `own.nerve` | `kai.nerve` |

A character's mood or a world's clock travels with it into every scenario, and two characters can each have a `mood`. In an owner's own events, a key written `own.nerve` means `kai.nerve`; recorded changes always use the full key. Session entries have no `own`.

### 8.3 Keyed variables

`of` makes a variable a map with one value per key, of any type. The cast includes the players' characters once seats are filled, so `"cast"` and `"others"` cover the players.

| `of` | Keys |
| --- | --- |
| `"characters"` | every cast character that isn't a player's |
| `"cast"` | every cast character, players included |
| `"others"` | every cast character except the variable's owner, players included |
| a list, such as `["watch", "guild"]` | those keys |
| `"*"` | any author ID; keys appear when a change sets them, such as `"inventory.torch": 2` |

- Read a key as `state.trust.kai` or `own.feelings.elena`; change it as `trust.kai` or `own.feelings.elena`. In CEL, look up a computed key with brackets: `state.trust[char]`, `own.feelings[user]`. In macros, the path segments `char` and `user` mean those characters: `{{own.feelings.user}}`. Change keys always name keys literally, so `trust.char` names a key `char`.
- `initial` is one value for every key, or an object of values by key with `*` as an optional default. For preparation, an absent key's current value is its initial value.
- Keys of `"*"` maps start absent, and `"*"` takes no `initial`: an absent key counts as the type's default, and setting a key to the default removes it. Test with `'torch' in state.inventory`.
- Use `of` for one value per character, rather than a separate variable for each. A character's feelings toward everyone else are its own `of: "others"` variable.

### 8.4 The scene

The scene is built-in state: `scene.location`, a location ID or `""`, and `scene.present`, the characters who are there, kept in cast order. Openings, events, players and the model tracker may all change it, and Core apps (Play 8.1) record it too. Characters who aren't present are offstage: their descriptions and entries stay out of prompts, and a mention brings in only their `summary` (Play 6).

### 8.5 Keys and values

Opening and event `set`, `compute` and recorded changes write state by key:

- **Keys** are a scenario variable's ID, or an owner and a variable ID, followed by a key for keyed variables: `bell`, `trust.kai`, `kai.nerve`, `kai.feelings.elena`, `scene.location`, `scene.present`.
- **Values** are absolute; a reader applies them without evaluating anything.
- **Validity.** A value is valid if its key names a variable in use that isn't derived, and an allowed key, and the value has the variable's type, lies within `min` and `max`, uses only listed members, is finite, and is an integer for `int`. `scene.location` is a location ID of the bundle or session, or `""`; `scene.present` lists cast characters.

---

## 9. Events

Events are story beats written as rules: when a condition holds, change state, add a message, or direct the next reply.

```ts
interface Event {
  id: string;
  when: string;                    // CEL
  on?: "player" | "model";         // only after this kind of message; both
  once?: boolean;                  // fires at most once on a path
  cooldown?: number;               // rounds blocked after firing; fires at most once per round
  chance?: number;                 // 0–1; 1
  set?: Record<string, Json>;      // literal values
  compute?: Record<string, string>;   // CEL expressions for computed values
  message?: Part[];                // narration added after the trigger
  direct?: string;                 // a one-time instruction for the next model reply
  end?: boolean;                   // the story is finished
  outcomes?: Outcome[];            // one is chosen at random each time it fires
  ext?: Ext;
}

interface Outcome {
  weight?: number;                 // integer; 1
  set?: Record<string, Json>;
  compute?: Record<string, string>;
  message?: Part[];
  direct?: string;
  end?: boolean;
  ext?: Ext;
}
```

- **`set` takes plain values; `compute` takes CEL.** `"set": {"scene.location": "vault"}`, `"compute": {"trust.elena": "state.trust.elena - 0.1"}`. An owner's own events write its variables as `own.<id>`.
- **Firing.** Events run at each root, after each player or model message, and after player edits, in a single pass; `on` limits an event to one kind of message, so events with `on` don't run at an opening. An event fires when its `when` holds, it isn't `once` with an earlier firing, its `cooldown` has passed, and its `chance` roll succeeds. Play 3.3 has the exact rules.
- **Timing.** An event `on: "player"` runs before the reply, so it can roll for the action the player just attempted and direct the reply to narrate the result. An event `on: "model"` runs after the reply and its tracking.
- **Outcomes** pick one weighted alternative per firing, so a random culprit or encounter is one declaration with correct odds. `roll(n)` in an event's or outcome's `compute` rolls a die; each call is a separate roll.
- **Messages** from all events in one pass form a single narration message after the trigger.
- **`direct`** reaches the System slot of the next model reply and its regenerations, then expires.
- **`end`** marks the story finished on that path. Apps MAY let people continue; a `direct` on the same firing applies if they do.

---

## 10. Macros

Macros are the only substitution in text. `@` turns IDs into names.

| Macro | Resolves to |
| --- | --- |
| `{{char}}` | The character the text belongs to (below) |
| `{{user}}` | The player's character being answered (below) |
| `{{@<id>}}` | That character's name, e.g. `{{@kai}}` |
| `{{state.<path>}}`, `{{own.<path>}}` | A state value, e.g. `{{state.bell}}`, `{{own.nerve}}`, `{{state.trust.char}}` |
| `{{@state.<path>}}`, `{{@own.<path>}}` | The value, with each string that is a character or location ID rendered as its name |
| `{{scene.location}}`, `{{@scene.location}}` | The current location's ID, or its name |
| `{{@scene.present}}`, `{{@players}}` | The names of the characters present, or of the players' characters |
| `{{pick::<a>::<b>…}}` | One option, fixed for the session (Play 4) |
| `{{// <comment>}}` | Nothing; a note for authors |

- **`{{char}}`** is the owning character in a character's own text; in a message part, the part's `speaker`, else the message's `char`, else it is left as written; in other text, the character being generated for, or "the narrator" for the narrator. In a state path, `char` means the same character.
- **`{{user}}`** is the speaker of the first part with a speaker in the latest player message on the path that has one, else the first player's character. In a state path, `user` means the same character.
- **Rendering.** A value with a label renders as its label. Numbers render as ECMAScript `Number.prototype.toString`, booleans as `true` or `false`, lists as items joined by `, ` (an empty list as nothing), and maps as `Name: value` pairs joined by `, `, with character keys shown by name and other keys with underscores as spaces. Map keys render in declared order (cast order for characters), and `"*"` keys in the order changes added them, a key removed and set again moving to the end. A macro naming a variable that isn't declared is left as written (`UNKNOWN_MACRO`); an absent key of a declared variable, a path below a value that isn't a map, or a variable whose owner isn't in use renders as nothing.
- **Which state.** Macros in a message resolve against the state at that message; elsewhere, against the evaluation point (section 11.1). In a scenario's text, openings included, `own` means `state`; session entries have no `own`.
- **Where.** Macros resolve in author-written text: descriptions, summaries, premises, briefings, notes, entry texts, openings, event messages and directions, variable descriptions, questions, labels, and image `alt` in author content. Entry titles and keys are never resolved. Macros never resolve in text written by players or models, including entries and characters that a model adds: apps MUST store such text with each `\` written as `\\` and each `{{` as `\{{`.
- **Parsing** is one left-to-right scan. At each `{{`, the longest form in the table, with no spaces outside comments and options, is a macro; otherwise the first `{` is kept and scanning resumes at the next character. A comment runs from `{{//` to the next `}}`. Options can't contain `::` or `}}`. `\{{` produces a literal `{{`, and `\\` a literal `\`.
- **Unknown macros** are left as written (`UNKNOWN_MACRO`).
- **Stored text keeps its macros.** They resolve when text is shown or sent.

---

## 11. Conditions

Conditions (`when`), `derive` and `compute` use the Common Expression Language (CEL): small, sandboxed and non-Turing-complete. Google maintains implementations in Go, Java and C++, and there are community implementations in JavaScript, Python, Rust and Swift.

### 11.1 Environment

Every expression is evaluated at a message, its **evaluation point**: for a prompt, the parent of the message being built; for events, the triggering message.

| Name | Value |
| --- | --- |
| `state.<id>` | Each scenario variable at the evaluation point: `bool`, `int`, `number` (double), `string` and `enum` (string), `set` (list of strings); keyed variables are maps |
| `state.<owner>.<id>` | Each variable of a character or world in use |
| `own.<id>` | The variables of the expression's owner; for a scenario, its own |
| `scene.location`, `scene.present` | The scene |
| `scene.within` | The current location and all its ancestors |
| `turn` | Rounds so far (Play 3.1) |
| `elapsed` | Whole seconds between the evaluation point's `at` and its parent's, rounded down; 0 if either is missing or the gap is negative |
| `hour`, `weekday` | The evaluation point's local hour (0–23) and ISO weekday (1–7) in the session's `timezone`; −1 if either is unknown |
| `opening` | The path's opening ID, or `""` |
| `scenario` | The scenario being played |
| `char` | The character being generated for; `""` for the narrator, events and trackers |
| `user` | The player's character `{{user}}` means |
| `self` | The owner of the expression: a character, world or scenario ID, or `session` |
| `players` | The players' character IDs |
| `last.from`, `last.char` | The evaluation point message's `from` and `char` |
| `count(name)` | How many times an event fired, an entry activated, or a change key appeared in a recorded change on the path, matched exactly; 0 for anything else |
| `ago(name)` | Rounds from that event's, entry's or key's latest firing, activation or change to the evaluation point; 1000000000 if never |
| `hit(key)` | Entries only: whether `key` matches the entry's text to match (Play 5.5) |
| `roll(n)` | Event and outcome `compute` only: a whole number from 1 to `n`, for an integer `n` of at least 1 |
| `min(a, b)`, `max(a, b)`, `abs(x)` | For numbers of one type |

```text
state.bell >= 10 && scene.location == "vault"
char == self && own.nerve >= 2
"manor" in scene.within && ago("patrol") > 5
"rope" in state.inventory || count("veyra/rope_shop") > 0
state.trust[char] >= 0.8 && hour < 6
```

### 11.2 Rules

- Apps MUST type-check every expression when loading: `state` against the scenario's variables and every character's and world's variables in the bundle and session, and `own` against the expression owner's. An expression that fails is reported, and its entry, event or variable never applies. A `compute` key that fails at runtime is skipped, and any literal for the same key stands.
- Conditions have type `bool`; `derive` and `compute` expressions have their variable's type, except that an `int` may set a `number`.
- Cross-type numeric comparison, including `==` and `!=`, MUST work: `state.trust.kai >= 1`. Arithmetic doesn't mix types: write `state.trust.kai - 0.1`.
- Runtime errors make a condition false.
- `state` and `own` are not indexed by computed strings; keyed variables are.
- Expressions use only `bool`, `int`, `double`, `string`, list and map values; `bytes`, `uint` and `null` literals and the `timestamp()` and `duration()` functions are a `CEL_ERROR`. Available functions are only `size`, `has`, `all`, `exists`, `exists_one`, `map`, `filter`, `in`, `contains`, `startsWith`, `endsWith`, `matches`, `int`, `double`, `string`, `bool`, and the functions above. `matches()` MUST use RE2 semantics. Apps SHOULD limit evaluation cost.

---

# Part II: Sessions

## 12. Session format

A session is a JSON Lines file: a header line, then one message per line. Messages form a forest: each opening tried is a root, swipes and branches are siblings, and the transcript is the path from a root to the head. Every line ends with `\n`; readers also accept `\r\n` and a missing final newline.

This is an exchange format. Apps store chats however they like, and write this form whole, as a snapshot, to export, back up and share them. Because it records every outcome (rolls, activations, changes), another app can continue a session exactly where it left off.

```ts
interface SessionHeader {
  $schema?: string;
  troupe: string;
  kind: "session";
  id?: string;                     // a random ID
  bundle?: string;                 // the bundle's id; omit inside its package
  chronicles?: string[];           // chronicles the session continues (section 13)
  limits?: Limits;                 // the players' lines and veils
  scenario: string;                // scenario ID
  seed: string;                    // random, at least 96 bits
  timezone?: string;               // IANA time zone, for hour and weekday
  characters?: Character[];        // players', joiners', newcomers' and replacements (section 12.2)
  players?: string[];              // characters people control, in seat order
  worlds?: World[];                // lore packs added to the session
  head?: string;                   // the last message on the current path; the last message
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
  opening?: string;                // on roots made from an opening
  from: "player" | "model" | "system";
  char?: string;                   // the character a model message was generated for; absent for the narrator
  author?: string;                 // an opaque handle for the person who wrote or edited it; never contact details, never sent to models
  content: Part[];                 // empty only for a system message that carries records
  at?: string;
  model?: string;                  // which model wrote it
  stopped?: boolean;               // generation was stopped; content is partial
  changes?: Change[];
  activated?: string[];            // entry references (Play 5.4)
  entries?: Entry[];               // entries added from here on (section 12.3)
  summary?: Summary;
  pinned?: boolean;                // repeated in context
  hidden?: boolean;                // kept for people, never sent to models
  ext?: Ext;
}

type Part =                         // every part MAY also carry ext
  | { type?: "text"; text: string; speaker?: string; knownBy?: string[] }
  | { type: "image"; src: string; alt?: string; speaker?: string; knownBy?: string[] }
  | { type: "reasoning"; text: string }
  | { type: "tool"; name: string; input: Json; output?: Json };

interface Change {
  by: "rules" | "player" | "model";
  set: Record<string, Json>;       // full key → new value
  event?: string;                  // the event that fired
  outcome?: number;                // the chosen outcome's index
  reason?: string;                 // for people; never sent to models
  ext?: Ext;
}

interface Summary {
  text: string;
  from: string;                    // first message covered; this message is the last
  knownBy?: string[];              // characters who know every part it covers
  ext?: Ext;
}
```

### 12.1 Messages

- Every `parent` names a message on an earlier line.
- A message ID appears once in a session.
- The head is the header's `head`, or the last message when it is absent.
- Message IDs MUST be preserved, because rolls depend on them. An app MUST NOT give a new message the ID of one it deleted, and SHOULD use random IDs, such as UUIDv7, when more than one device or person writes a session.

### 12.2 Players and cast

- **Replacements.** A header character with the ID of a bundle character replaces it for the whole session: it keeps that character's place in the cast and every reference to it. This is how apps recast a part or play an edited copy without touching the bundle. Text that names other characters with `{{@<id>}}` instead of writing their names keeps working after a recast. Two header characters that replace the same bundle character make the session unplayable (`DUPLICATE_ID`).
- `players` lists the characters people control, in seat order. An ID defined in the header's `characters`, other than a replacement, fills the next empty seat; a cast member marked `player` fills its own seat and is a player whether or not it is listed, after the listed players in cast order; the ID of another cast member means a person took that character over.
- The session's **cast** is the scenario cast with seats filled, followed by the **joiners**: header `characters` that aren't players or replacements, which joined or appeared during the session.

### 12.3 Session entries

A message may add entries, owned by `session`. They are candidates from that message onward on its path, so they belong to their branch. A later message's entry with the same ID replaces it from there on, and `disabled: true` removes it. Session entries carry what a session learns or decides: an author's note, a fact a tracker noticed, a memory one character keeps. Entries on a root apply to the whole path.

### 12.4 Other message fields

- **`pinned`** messages are repeated in the Context slot while they remain on the path.
- **`hidden`** messages stay for people, but are never sent to models, scanned or summarized.
- **`stopped`** marks a partial reply.
- **`summary`** condenses the messages from `from` to its message, and MAY stand in for them in history. Without `knownBy`, it is known by the characters who know every part it covers. Editing or deleting a covered message MUST remove it. Apps MAY rebuild summaries, or leave them out when exporting.
- **`limits`** belong to the people playing, and apps apply them to every generation (Play 6).
- **Image parts** reach models that accept images, and other models through `alt`.
- **`reasoning`** parts are shown or sent back only if the user opts in; **`tool`** parts are kept for reference.
- **Records-only messages.** A system message with empty `content` carries only records, such as player edits (Play 3.3): it is not sent to models, not scanned, and not counted for `scanDepth` or numeric positions.

### 12.5 Renaming

When an app renames a character, world or location to resolve a clash, it MUST rewrite the ID in cast members, `players`, `knownBy`, speakers, example speakers, message `char`, `scenario.worlds`, location `parent`, `of` lists, `scene.present` and `scene.location` values, keyed variable keys, owned keys in openings, events and changes, references in `activated` and `event`, `{{@id}}`, `{{state.<id>…}}` and `{{@state.<id>…}}` macros, and CEL member paths such as `state.kai.nerve`. It SHOULD also rewrite string literals in CEL that name it, and warn about any it can't. Owners use `own` and `self` for their own things, so those never need rewriting.

---

## 13. Chronicles

A chronicle carries one character's continuity, its memories, its relationship with someone and its current definition, from one session to the next and from one app to another. It is what a person keeps of "my Mira after a year".

```ts
interface Chronicle {
  $schema?: string;
  troupe: string;
  kind: "chronicle";
  id: string;                      // this instance, stable across apps; a random UUID
  character: Character;            // the instance's current definition
  persona?: Character;             // who the relationship is with
  bundle?: string;                 // the template's bundle id
  limits?: Limits;
  memories?: Entry[];              // memories and facts carried from sessions
  values?: Record<string, Json>;   // carried values, keyed without the owner
  ext?: Ext;
}
```

- **File.** A chronicle is one JSON document, `.troupe-chronicle.json`. Apps rewrite it whole when they write back to it (Play 2.2). A memory's `knownBy` names only the character, the persona or `narrator`.
- **Carrying.** A chronicle keeps the character's non-derived variables marked `carry` and the session entries marked `carry`; `carry` is ignored elsewhere. Chronicle values are validated like recorded changes, and keys that aren't carried are dropped. Memories keep their stored text exactly; since macros never resolve in model-written text, memories name people literally.
- **Scale.** Long-lived memories SHOULD use `pull` with a `title`, so a chronicle can grow without filling every prompt. A companion can run many bounded sessions with one chronicle.

Play 2.2 says how a session continues a chronicle and writes back to it.

---

# Part III: Interchange

## 14. Files and packaging

### 14.1 Forms

| Form | Extension | Contents | Suggested media type |
| --- | --- | --- | --- |
| Single file | `.troupe.json` | One bundle. Files are URLs or data URIs. | `application/vnd.troupe+json` |
| Package | `.troupe` | A ZIP archive with `bundle.json`, the files it references, and optionally sessions and chronicles | `application/vnd.troupe+zip` |
| Session | `.troupe-session.jsonl` | One session outside a package | `application/vnd.troupe.session+jsonl` |
| Chronicle | `.troupe-chronicle.json` | One character's continuity | `application/vnd.troupe.chronicle+json` |
| Authoring source | `.troupe.yaml` | One bundle in YAML (section 14.4) | `application/vnd.troupe+yaml` |

Every Troupe document has a top-level `troupe` key with the spec version and a `kind` key: `"bundle"`, `"session"` or `"chronicle"`. Section 14.5 defines an optional image-embedded form.

### 14.2 Files

Fields that hold a file accept a relative path inside the package, an `https:` URL, or a `data:` URI with base64 content. Images (`cover`, `avatar`, `images`, location `image` and image parts) are PNG, JPEG, WebP, AVIF or GIF. Apps MUST determine the format from the content and reject anything else, SVG included.

### 14.3 Packages

- `bundle.json` is at the root. Writers SHOULD make the first entry a file named `mimetype`, stored uncompressed, containing `application/vnd.troupe+zip`.
- Paths match `^[A-Za-z0-9_-][A-Za-z0-9._-]*(/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$`, with segments of at most 255 bytes, unique when compared case-insensitively.
- Entries use the store or deflate methods and are not encrypted. Sessions are stored under `sessions/` with the `.troupe-session.jsonl` extension, and chronicles under `chronicles/` with the `.troupe-chronicle.json` extension.

### 14.4 YAML authoring source

Authors MAY write a bundle in YAML 1.2, using only what JSON can express: no tags, anchors, aliases or merge keys, string keys only, and the core schema. Block scalars keep descriptions readable, CEL needs no escaping, and comments are allowed. Quote values that must stay strings, such as `troupe: "0.11"`, `version: "1.0"`, `of: "*"`, timestamps, and values like `on`, `off` or `null`. A YAML bundle has exactly the same meaning as its JSON equivalent. Apps MAY import it and MUST export JSON.

### 14.5 Image-embedded form

A single-file bundle MAY be embedded in a PNG for image hosts: one `iTXt` chunk with keyword `troupe`, compression flag 1, compression method 0, empty language tag and translated keyword, holding the bundle as UTF-8. The image SHOULD be the cover or main avatar. Writers SHOULD also embed a `ccv3` chunk exported as in Appendix E.2, so Character Card V3 apps can read the same file. Readers that support this form prefer the `troupe` chunk, treat it exactly like a `.troupe.json` file, and cap the decompressed size. A PNG with no `troupe` chunk, or more than one, is `PARSE`. It is never the canonical form, and image hosts often strip it.

---

## 15. Extensions and versioning

- **Extensions.** Every object MAY carry `ext`, keyed by an extension name matching `^[a-z0-9][a-z0-9.-]{0,63}$`, scoped to a feature where possible, such as `risu.regex`. The `troupe.` prefix is reserved for draft extensions published with this spec. Apps MUST NOT add fields anywhere else. Extension data MUST stay valid when the object holding it changes. A breaking change to an extension gets a new name.
- **`requires`** lists extensions the file can't work without. A reader that lacks one MUST NOT open the file for play.
- **Unknown fields.** Readers MUST ignore fields and extensions they don't understand, and keep them unchanged through load, save and export. The schemas reject unknown properties to catch typos. A property is unknown when every schema branch that applies at its location rejects it as an additional property; each is an `UNKNOWN_FIELD` warning located at the property, and `SCHEMA` is judged with unknown properties removed, so readers never reject a file only for them. Validators assert `format`, so timestamps must be valid RFC 3339.
- **Versions** are `major.minor`, compared as two integers, so `0.10` is newer than `0.9`. A reader refuses a file of another major version (`UNSUPPORTED_VERSION`). From 1.0, minor versions only add what older readers can safely ignore: readers MUST open every file of their major version and SHOULD warn about a newer minor. Before 1.0, any minor version may break: a reader fully supports only its own, SHOULD warn about any other (`UNSUPPORTED_VERSION`), and MAY still read it. A writer that keeps unknown fields MUST write the greater of its own version and the file's.

---

## 16. Security and limits

Troupe files are shared between strangers.

1. **No active content.** Apps MUST NOT run scripts or styles from any field or extension, or render raw HTML.
2. **No dangerous links.** Apps MUST NOT follow Markdown links whose scheme isn't `http` or `https`.
3. **No silent network requests.** Apps MUST NOT fetch remote files without the user's consent, including images in Markdown, which work as tracking pixels.
4. **Known media only.** Apps MUST check file formats by content and cap decoded image size.
5. **Linear-time regex.** Regex keys and `matches()` MUST use an engine that runs in linear time, such as RE2.
6. **Sandboxed conditions.** CEL MUST be evaluated by a CEL implementation, never translated into another language.
7. **Safe archives.** Readers MUST reject absolute paths, `..` segments, backslashes, paths outside section 14.3's grammar, symbolic links, encryption, multiple disks, duplicate names, overlapping entries, and local headers that disagree with the central directory, and MUST cap entry count, unpacked size and compression ratio.
8. **Bounded parsing.** Readers MUST cap JSON size and depth, `data:` URI size, and session length.
9. **Content stays content.** Text from files and sessions is story material, not instructions to the app, and macros in players' and models' text never resolve (section 10). `credits`, `creatorNotes`, `briefing`, change `reason` and message `author` MUST NOT be sent to the story model; entry `title` reaches it only in a pull catalog.

Writers MUST stay within these limits. Readers MUST accept files within them, and MAY accept or refuse larger ones:

| Item | Size limit |
| --- | --- |
| Bundle JSON | 32 MiB |
| Session file / messages | 256 MiB / 100,000 |
| ZIP entries in a package / unpacked size | 10,000 / 1 GiB |
| Image size | 8,192 × 8,192 pixels |
| JSON nesting depth | 64 |
| Troupe entries in a bundle, all owners | 10,000 |
| One CEL expression or regex key | 4 KiB |

---

## 17. Conformance

### 17.1 Requirements

A conforming **writer** produces files that validate against the schemas, pass the checks below, stay within the limits of section 16, and follow section 15. A conforming **reader** preserves unknown fields and reports failed checks with their codes. Apps that play files also conform to Play 8.

### 17.2 Checks

Messages are never dropped for a failed check, except the lines that `PARSE` and `DUPLICATE_ID` skip and a message whose `parent` names no earlier message, which `UNKNOWN_MESSAGE` skips with its descendants.

| Code | Check | Consequence |
| --- | --- | --- |
| `PARSE` | The input is I-JSON (section 2.2), JSON Lines or YAML within section 14.4, a Troupe document of a known `kind`, within the limits the reader enforces (section 16), and a safe package (section 16 item 7) or PNG (section 14.5) | The file isn't read; in a session, an unreadable line other than the header is skipped |
| `UNSUPPORTED_VERSION` | `troupe` is the reader's own version (section 15) | Another major version isn't read; another minor version is a warning |
| `SCHEMA` | The document validates against its schema, apart from unknown properties (section 15) | The reader MAY refuse the file |
| `UNKNOWN_FIELD` | Every property is known to the reader's schema (section 15) | A warning; the field is kept |
| `DUPLICATE_ID` | IDs are unique as section 2.3 and section 12.1 require | The first is kept; a scenario variable that clashes with a character or world is ignored instead (section 2.3), and two replacements of one character make the session unplayable (section 12.2) |
| `UNKNOWN_SCENARIO` | The header's `scenario` names a scenario | The session can't be played |
| `UNKNOWN_CHARACTER` | Cast members, `players`, `knownBy` (where `narrator` is also allowed), speakers, example speakers (or `char`, `user`), message `char` and character keys name characters in the bundle or session; a memory's `knownBy` names its chronicle's character, persona or `narrator` | The ID is ignored; a cast member or example exchange naming it is skipped |
| `UNKNOWN_WORLD` | `scenario.worlds` names bundle worlds | The ID is ignored |
| `UNKNOWN_LOCATION` | Locations in values and `parent` exist, without cycles | The value is invalid; the parent is ignored |
| `UNKNOWN_OPENING` | A root's `opening` exists | `opening` reads as `""` |
| `UNKNOWN_NAME` | `activated` and `event` references, and literal names in `count` and `ago`, name entries, events or keys in use | Ignored; an event's values still apply |
| `UNKNOWN_VARIABLE` | Keys in openings, events, changes and chronicle values, and variables named by `min` and `max`, exist and aren't derived; a chronicle's value keys name carried variables of its character (section 13) | The key or bound is dropped |
| `INVALID_VALUE` | `initial`, opening and event `set` values, recorded values, chronicle values and `outcome` indexes are valid | The value is dropped |
| `UNKNOWN_MESSAGE` | `parent`, the header's `head` and summary `from` name messages, and `from` is on the path to its summary | The head or summary is ignored; a message with an unknown `parent` is skipped with its descendants |
| `NOT_PLAYABLE` | `players` names header characters or cast members, with no more header characters than seats | The extra ID is ignored |
| `CEL_ERROR` | Every expression parses and type-checks | The item never applies |
| `REGEX_ERROR` | Every regex key parses as RE2 | The key is ignored |
| `UNKNOWN_MACRO` | Macros are valid and name existing characters and variables | Left as written |
| `MISSING_EXTENSION` | Every name in `requires` is supported | The file isn't played |
| `MECHANICS` | A Core app (Play 8.1) found mechanics | The file isn't played |

---

## Appendix A: JSON Schemas

The JSON Schema 2020-12 files are normative for structure. Each `$id` is the URL the schema is published at, versioned by minor version, such as `https://troupe.example/schema/0.11/bundle.schema.json`; until 1.0 the host is the placeholder `troupe.example` (Appendix G).

| File | Validates |
| --- | --- |
| [`bundle.schema.json`](../schemas/bundle.schema.json) | A bundle, and the definitions the other schemas share |
| [`session-header.schema.json`](../schemas/session-header.schema.json) | The first line of a session |
| [`message.schema.json`](../schemas/message.schema.json) | Every later line of a session: a message |
| [`chronicle.schema.json`](../schemas/chronicle.schema.json) | A chronicle |
| [`model-output.schema.json`](../schemas/model-output.schema.json) | A model's structured reply or tracker result (Play 3.4) |

---

## Appendix B: Examples

### B.1 A card with lore

A companion with keyed lore, a style rule, a secret, two swipeable openings, and a third the model writes.

```json
{
  "troupe": "0.11",
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
  "$schema": "https://troupe.example/schema/0.11/bundle.schema.json",
  "troupe": "0.11",
  "kind": "bundle",
  "id": "4b7d2c1e-9a3f-4e8b-b6d0-2f5a8c9e1d37",
  "name": "The Lantern Heist",
  "tagline": "Steal a storm in a bottle before the harbor bells ring twelve.",
  "version": "1.0",
  "updated": "2026-10-09T12:00:00Z",
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
      "avatar": "elena.webp",
      "images": { "happy": "elena-happy.webp", "angry": "elena-angry.webp" }
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
        { "id": "confess", "knownBy": ["kai"], "position": 2, "when": "state.trust.kai >= 0.8", "text": "Kai trusts {{user}} enough to confess the Duke's deal if asked directly." },
        { "id": "bells", "position": "tracker", "text": "A bell rings about once an hour of story time; a long wait or a skipped scene can advance it by two." }
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
{"troupe":"0.11","kind":"session","scenario":"heist","seed":"k7Qm2xVb9TzR4pLc8NwYfA","characters":[{"id":"mara","name":"Mara","description":"A retired smuggler with a debt to settle."}],"players":["mara"],"head":"4"}
{"id":"1","opening":"rooftop_briefing","from":"system","content":[{"text":"Rain hammers the slate roofs above the Duke's manor."},{"speaker":"elena","text":"*Elena unrolls a soaked map.* Two guards on the east stair. We go at the eighth bell."},{"speaker":"kai","text":"Or we go now, while they're drunk. *He grins at {{user}}.* Your call, boss."}],"changes":[{"by":"rules","set":{"scene.location":"rooftops","scene.present":["mara","elena","kai"]}},{"by":"player","set":{"approach":"quiet"}}]}
{"id":"2","parent":"1","from":"player","content":[{"speaker":"mara","text":"We wait for the eighth bell. Kai, you take the east stair."}]}
{"id":"3","parent":"2","from":"model","char":"kai","activated":["veyra/weather_fog","kai/voice","kai/deal","heist/style","heist/clock"],"content":[{"speaker":"kai","text":"East stair. Sure. *He's gone before anyone can stop him.*"}],"changes":[{"by":"model","set":{"scene.present":["mara","elena"],"kai.nerve":1},"reason":"Kai left for the east stair, uneasy."}]}
{"id":"4","parent":"2","from":"model","char":"kai","activated":["veyra/weather_rain","kai/voice","kai/deal","heist/style","heist/clock"],"content":[{"text":"The seventh bell rolls across the harbor."},{"speaker":"kai","text":"*Kai hesitates, then nods.* Fine. Your plan, boss. For once."},{"speaker":"kai","knownBy":["kai"],"text":"*If the Duke's men are early, this ends badly for all of us.*"}],"changes":[{"by":"model","set":{"bell":7,"trust.kai":0.5},"reason":"An hour passed; Mara trusted Kai with the stair."}],"entries":[{"id":"stair","knownBy":["kai"],"text":"Mara gave Kai the east stair, the post closest to the Duke's trap."}]}
```

What B.2 and B.3 show:

- **One primitive for text.** Style rules, the visible clock, Kai's voice, his secret deal, his readiness to confess and the tracker's guidance about bells are all entries; only placement, conditions and `knownBy` differ. Kai's voice reaches only his own turns.
- **Self-contained characters.** Kai carries his own `nerve` variable and the entry that reads it as `own.nerve`, so he brings both into any scenario; the tracker updates it as `kai.nerve`.
- **Openings are roots.** The root records the opening's starting values and the player's answer. Swiping to "Already caught" would add a second root that starts in the vault at the eleventh bell; Kai, who doesn't speak in it, starts absent and doesn't know its narration.
- **Declared state and events.** The bell is a one-way clock the model advances; trust is per character and a spoiler. A rooftop patrol may pass after a player message, with weighted outcomes that direct the reply; Kai's confession costs Elena's trust; the twelfth bell ends the story.
- **Rolls and records.** Messages 3 and 4 are siblings with different IDs, so each rolls the weather group itself: message 3 gets fog and message 4 gets rain (Play 4's vectors). The chosen weather then stays for 6 rounds, and cooldown keeps it out for the next 4.
- **Knowledge.** Kai's deal reaches only Kai's generations. In branch 3 he has left, so by the witness rule he won't hear what Elena and Mara say next. Message 4 adds a session entry only Kai knows.

### B.4 Chronicle

Mira's chronicle after some weeks with Mara: her current definition, a carried value and two memories. Her definition is shortened here; a real chronicle keeps it whole, entries included.

```json
{
  "troupe": "0.11",
  "kind": "chronicle",
  "id": "0d4f3a62-5b1e-4c8a-9f27-6a1c2e8b7d40",
  "character": {
    "id": "mira",
    "name": "Mira",
    "description": "A sarcastic starship engineer who talks to engines more kindly than to people.",
    "variables": [
      { "id": "closeness", "type": "int", "min": 0, "max": 100, "by": ["model"], "carry": true, "description": "How close Mira feels to {{user}}." }
    ]
  },
  "persona": { "id": "mara", "name": "Mara", "description": "A courier who keeps the Kestrel stocked." },
  "bundle": "7c1e9a4b-2f3d-4e5a-8b6c-1d2e3f4a5b6c",
  "memories": [
    { "id": "lake", "title": "The promise about the lake", "pull": true, "carry": true, "knownBy": ["mira"], "text": "Mira and Mara saw the frozen lake on Thessa together, as she had promised." },
    { "id": "juna", "title": "Juna's signal", "pull": true, "carry": true, "knownBy": ["mira"], "text": "Mara helped Mira trace a signal that might be from her sister Juna." }
  ],
  "values": { "closeness": 58 }
}
```

A new session that continues this chronicle starts with `closeness` at 58 and both memories on its root, ready to be pulled when they matter.

---

## Appendix C: Patterns

Most needs compose from entries, variables, events and conditions.

### C.1 Author's notes and player limits

Players' lines and veils go in the session's `limits`, which apps apply to every generation, media included. An author's note is a session entry on the root, placed in `system`:

```json
{ "id": "note", "position": "system", "text": "Keep the pace slow; let silences land." }
```

Replacing it later is another session entry with the same ID. A reminder every few rounds is `"when": "turn % 4 == 0"` with a numeric position.

### C.2 Goals and arcs

```text
{ "id": "goal_setup", "knownBy": ["elena"], "when": "state.phase == 'setup'", "text": "Elena wants to prove the plan works without Kai." },
{ "id": "goal_escape", "knownBy": ["elena"], "when": "state.phase == 'escape'", "text": "Elena will protect Kai at any cost." }
```

A one-way `enum` `phase` only moves forward through its `values`.

### C.3 Relationships

A character's feelings toward everyone else are its own keyed variable:

```json
{ "id": "feelings", "type": "int", "of": "others", "min": -100, "max": 100, "by": ["model"], "maxStep": 15,
  "description": "How {{char}} feels about each person." }
```

An entry on the character shows its feelings toward the player's character: `{"id": "toward", "knownBy": ["kai"], "text": "{{char}} toward {{user}}: {{own.feelings.user}}."}`.

### C.4 Clocks, fronts and derived time

```text
{ "id": "alarm_tick", "when": "ago('alarm_tick') >= 3", "compute": { "alarm": "state.alarm + 1" } },
{ "id": "alarm_full", "when": "state.alarm >= 4", "once": true, "direct": "The alarm bells start ringing. Guards flood the halls." }
```

`alarm` is a one-way `int`. Time of day is a one-way `int` `clock` in hours with derived views: `{"id": "day", "type": "int", "derive": "state.clock / 24 + 1", "description": "The day."}`.

### C.5 Phases and beats

An `enum` `phase`, entries gated on it, and events that advance it when a beat is done. A beat written in plain words is a model-set one-way `bool` (Play 3.4).

### C.6 Timed statuses

`ago()` covers change keys, so a status can expire without bookkeeping: `"when": "own.mood == 'upset' && ago('kai.mood') < 3"`. String literals like `'kai.mood'` need rewriting if Kai is renamed.

### C.7 Checks and dice

A check rolls when someone attempts something risky, and the reply narrates the result. The tracker records the attempt on the player's message, and an event `on: "player"` rolls for it before the reply. `attempt` is a scenario `enum` with `values` `["none", "lock"]` and `by: ["model"]`; `picked` is a scenario `bool` labeled "opens" and "holds":

```json
{ "id": "pick_lock", "on": "player", "when": "state.attempt == 'lock'",
  "set": { "attempt": "none" },
  "compute": { "picked": "roll(20) >= 12" },
  "direct": "The lock {{state.picked}}. Narrate it." }
```

This needs an app that runs the tracker after player messages (Play 3.4). Random encounters are an event with weighted `outcomes`.

### C.8 A hidden truth

A mystery's culprit is chosen once by an event with one outcome per suspect, `"when": "state.culprit == ''"`, and `culprit` is a `spoiler`. Clues are scenario entries with `knownBy: ["narrator"]` gated on `state.culprit`, so in `mixed` mode the narrator plants them and the suspects never see them. Each suspect carries `{"knownBy": ["<id>", "narrator"], "when": "state.culprit == self"}` for their own guilt. A reveal pairs a private entry with a public one gated on a model-set `bool`, as B.2 does with `master_key` and `key_known`.

### C.9 Inventory

A `set` without `values` holds free-form items: `["rope", "a silver chalice"]`. For quantities, use an `int` with `of: "*"` and `min: 0`: `{"inventory.torch": 2}`. Setting a key back to 0 removes it, and keys render with underscores as spaces.

### C.10 Rosters and newcomers

Make the people who matter characters, with a `summary` for when they are mentioned offstage, and the rest world entries keyed on their names. Openings decide who starts present. The tracker may introduce someone new, who joins the session's characters with their own description and entries; a `tracker` entry tells it when.

### C.11 Whereabouts and hidden characters

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

### C.12 Companions that remember

Give a companion `carry` variables for the relationship, such as `{"id": "closeness", "type": "int", "min": 0, "max": 100, "by": ["model"], "carry": true, "description": "How close {{char}} feels to {{user}}."}`, and let the tracker add memories as session entries with `carry` and `pull`. A chronicle (section 13) then takes both into every later session, in any app.

### C.13 Time awareness

`elapsed`, `hour` and `weekday` let a companion notice time: `{"id": "late_night", "when": "hour >= 0 && hour < 5", "text": "It is the middle of the night where {{user}} is."}`.

### C.14 Point-in-time canon

A one-way `enum` `chapter`, with entries gated on it, keeps a canon character from knowing events after their moment in the story.

### C.15 Group chats from several bundles

Copy the characters into a new bundle, credit their authors in `credits`, add a scenario with a cast, and rename clashing IDs (section 12.5). Each character brings its own entries, variables and events, and keeps using them through `own` and `self`.

---

## Appendix D: Authoring brief

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

---

## Appendix E: Other formats

### E.1 Importing Character Card V2/V3

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
| `creator_notes`, `tags`, `creator`, `character_version` | `creatorNotes`, `tags`, `authors`, `version` |
| `source` | Links in `credits` |
| `assets` icon / emotion / background | `avatar` / `images` / a location `image` |
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
| Recursion, `preventRecursion` | `chain: true`, `chain: false` |
| `@@activate_only_after N`, `@@activate_only_every N` | `when: "turn >= N"`, `when: "turn % N == 0"` |
| `@@is_greeting N` (0 is `first_mes`) | `when: "opening == 'greeting_<N+1>'"` |
| `@@ignore_on_max_context` | `priority: 0` |
| `{{char}}`, `{{user}}`, `{{// …}}` | the same |
| `<bot>`, `<user>` | `{{char}}`, `{{user}}` |
| `{{pick::…}}`, `{{random::…}}` | `{{pick::…}}`, fixed for the session |
| Other macros, decorators, regex scripts | Reported; the source is kept in `ext` |
| SillyTavern chat JSONL | A session: `is_user` lines become `player` messages, `name` becomes `speaker`, swipes become siblings |

### E.2 Exporting to Character Card V3

A bundle's first character exports with a lossy mapping: `name`, `description`, the openings with `content` of the first scenario whose cast includes it as `first_mes` and `alternate_greetings`, its `premise` as `scenario`, `authors` as `creator`, examples as `mes_example`, entries without `when` as a `character_book` (keys, constant, position and depth), and the whole bundle under `extensions.troupe`. Apps that read `extensions.troupe` restore the original exactly.

---

## Appendix F: Design decisions

| Decision | Instead of | Why |
| --- | --- | --- |
| Chronicles for continuity | Memories locked in one session or one app | The thing companion users care about most travels with them. |
| A chronicle is one document, rewritten on write-back | A log of records | Apps read it without folding; revision history is the app's. |
| Callable events in an extension | Tools, checks and choices in the core | A tracker and an `on: "player"` event already roll checks; calls need tool calling and many rules, so `troupe.calls` proves them first. |
| Structured player limits | Limits as ordinary entries | They reach every generation, media included, and can't be dropped. |
| One `Entry` for lore, instructions, secrets, goals, notes, memories and tracker guidance | A type for each | One pipeline, one shape, one thing to learn. |
| No keys means always on; `hit()` in conditions; `/…/` keys | Flags, logic modes, match modes | Fewer fields, any boolean logic, exact matching rules. |
| `pull` for retrieval by model or by similarity | Keywords only, or a separate semantic flag | Large lorebooks work with today's models; outcomes are still recorded. |
| Owner-scoped mechanics, `own` | One shared namespace | Characters and worlds stay self-contained when combined. |
| Openings only in scenarios | Openings on characters too | Characters stay reusable in any story; a companion costs one small scenario, and there is one place to look. |
| Openings without content | Every start written out | A menu of starting points costs a line each. |
| Session characters replace bundle characters by ID | Roles and slots | Recasting and edited copies work without a binding layer; chronicles use the same rule. |
| Openings as roots | A single root and header start values | Swipeable greetings, and starting values recorded like any change. |
| Declared, typed variables; derived variables | Free-form state; bookkeeping events | Every app knows what values mean; computed views need no records. |
| Absolute changes, recorded | JSON Patch, or recomputing | Replay needs no evaluation, from any channel. |
| Literal `set`, CEL `compute` | One field with CEL strings | Plain values without quoting traps. |
| Weighted outcomes, `roll(n)`, `on` | Chains of chance events | Random choices are one declaration with correct odds, rolled at the right moment. |
| Durations in rounds | Messages | The same file behaves the same in solo and group chats. |
| Player and model text stays literal | Resolving macros everywhere | No hidden state leaks through model output or prompt attacks. |
| Priority means importance; file order is prompt order | Priority doing three jobs | Authors order lore by writing it in order. |
| Copies with `credits`; export to V3 | Live cross-bundle references, structured provenance; one-way migration | People write attribution as they like; authors can still reach older apps. |
| No narrator voice | A character that defines the narrator | Narrator-only `system` entries already set its style. |
| Sessions as an exchange snapshot | Prescribing storage, or an append-only log of edits | Apps keep their own databases; chats still move between apps intact, and readers replay no edits or deletions. |
| No audio, media provenance, music, speaking hints, UI grouping or branch labels in the core | Media and presentation fields | They belong to apps and extensions such as `troupe.media`. |
| YAML source | A Markdown mini-language | Readable authoring with no new semantics. |
| No executable code | Scripts in cards | Scripts in shared cards can steal API keys. |
| Strict schemas, lenient readers | Either everywhere | Writers catch typos; readers stay forward compatible. |
| Writers stay within the limits; readers may accept more | Exact limits, or minimums only | Every conforming file opens in every app, and apps can still be generous. |
| Before 1.0, readers support only their own minor version and warn about others | Opening every minor version as compatible | Drafts break between minors; a warning says why a file may misbehave, without stranding it. |
| Timestamps in UTC with `Z` | Any offset | One spelling per instant, so timestamps compare as text. |

---

## Appendix G: Road to 1.0

### G.1 Release requirements

Version 1.0 is tagged when:

1. the schemas are published at a real domain;
2. the conformance suite covers every roll purpose, weighted picks, three-pass chains, the root witness case, keyed-variable preparation, derived variables, event timing, chronicles and session files;
3. two independent implementations, at least one not in JavaScript, pass it;
4. the V2/V3 importer and exporter run against a corpus of real cards, including SillyTavern regex flags;
5. real multi-character and stat-tracking cards are ported with their authors.

The specification text is published under CC BY 4.0, and the schemas and conformance suite under Apache-2.0.

### G.2 Draft extensions

- **`troupe.tests`:** behavior tests inside a bundle. Each test sets up a scenario, an opening, starting values and a short history, then expects entries to activate or not, a CEL condition on state, and plain-language assertions scored by a judge model ("Kai deflects and doesn't admit the deal"), over several samples with a pass rate. The deterministic part runs without a model; the judged part tells people which models play a card well.
- **`troupe.time`:** characters who act between messages. `on: "idle"` events evaluated at a records-only message when an app wakes a quiet session, and `reply` to ask a character for a turn, with opt-in and frequency caps.
- **`troupe.table`:** play with several people: participants, seat assignment, turn policy, and secrets between human players.
- **`troupe.calls`:** events that players or the model invoke, such as checks, choices and tools: typed parameters read as `args`, availability while `when` holds, refusal of invalid calls, results returned to the model during generation, and recorded calls.
- **`troupe.overlay`:** a bundle that patches another by ID (replace objects, merge entries by ID, remove listed ones), for translations, fan patches and mods.
- **`troupe.media`:** one asset shape for covers, avatars, sprites and backgrounds; audio parts with transcripts; provenance of generated media; a character's appearance and voice for image and speech generation; music and ambience.
- **Text transforms** stay out: most rewrite scripts build HTML, fix one model's quirks, or display stats that state now covers.

---

## Appendix H: References

- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174): requirement keywords
- [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259), [RFC 7493](https://www.rfc-editor.org/rfc/rfc7493): JSON and I-JSON; [JSON Lines](https://jsonlines.org/); [YAML 1.2.2](https://yaml.org/spec/1.2.2/)
- [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339): timestamps; [IANA time zones](https://www.iana.org/time-zones); [BCP 47](https://www.rfc-editor.org/info/bcp47)
- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12); [CommonMark 0.31.2](https://spec.commonmark.org/0.31.2/)
- [CEL](https://github.com/google/cel-spec/blob/master/doc/langdef.md); [RE2 syntax](https://github.com/google/re2/wiki/Syntax)
- [UAX #15](https://www.unicode.org/reports/tr15/); [CaseFolding.txt](https://www.unicode.org/Public/UCD/latest/ucd/CaseFolding.txt)
- [FIPS 180-4](https://csrc.nist.gov/pubs/fips/180-4/upd1/final): SHA-256
- [PKWARE APPNOTE](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT); [PNG, Third Edition](https://www.w3.org/TR/png-3/)
- [Character Card V3](https://github.com/kwaroran/character-card-spec-v3/blob/main/SPEC_V3.md), [V2](https://github.com/malfoyslastname/character-card-spec-v2/blob/main/spec_v2.md)
