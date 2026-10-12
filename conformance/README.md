# Troupe conformance cases

This folder holds the conformance suite for the Troupe spec. Each case is a language-neutral JSON file in `cases/`. Any implementation can run the suite by reading each case, setting up its inputs, performing each test's operation, and comparing the result with `expect`. Libraries live in their own repositories and run it as part of their tests.

This document is the contract between the cases and a runner. When a case and this document disagree, report it as a bug in the suite.

## 1. Case files

Cases live in `cases/<area>/<topic>.json`, one folder per area of the spec:

| Area | Covers |
| --- | --- |
| `rolls` | Roll vectors and roll subjects (Play 4) |
| `matching` | Key matching (Play 5.3) |
| `selection` | Entry selection, pulling and fitting (Play 5) |
| `knowledge` | Who knows what (Play 7) |
| `state` | State, keyed and derived variables, rounds and change preparation (Format 8; Play 3.1–3.3) |
| `events` | Event passes (Format 9; Play 3.3) |
| `macros` | Macro parsing and rendering (Format 10) |
| `cel` | Conditions (Format 11) |
| `starting` | Starting a session from an opening (Play 2.1) |
| `sessions` | Session lines, the head, players and the cast (Format 12) |
| `prompt` | Prompt slots (Play 6) |
| `model-output` | Model output, its schema and tracker input (Play 3.4) |
| `chronicles` | Chronicles (Format 13; Play 2.2) |
| `checks` | Reference checks and unknown fields (Format 15, 17.2) |
| `parsing` | Reading raw files (Format 2.2, 14, 16) |
| `examples` | The spec's worked examples and the authoring guide's patterns |

The order of cases doesn't matter. A case file is one JSON object, described by [`case.schema.json`](case.schema.json), which `bun run check` applies:

| Field | Type | Meaning |
| --- | --- | --- |
| `description` | string | What the case covers, with spec sections. Informative. |
| `note` | string | Optional. How an expected value was derived, such as roll inputs. Informative. |
| `bundle` | object | The bundle, as a JSON document. |
| `bundleFile` | string | Instead of `bundle`: a path to a bundle JSON file, relative to the case file. |
| `session` | object | Optional. `{"header": SessionHeader, "messages": [Message, …]}`. `messages` lists the session's lines after the header, in file order (Format 12.1). |
| `sessionFile` | string | Instead of `session`: a path to a `.jsonl` session file, relative to the case file. |
| `addMessages` | array | Optional. Messages appended after the session's own messages. |
| `extend` | array | Optional. Generated filler messages, appended after `addMessages` (section 3). |
| `tests` | array | The tests (section 4). |

Bundles, session headers and chronicles given as objects leave out `troupe`: before anything else, `check` validation included, the runner sets it to the spec version. If no bundle is given, the bundle is `{"troupe": <the spec version>, "kind": "bundle"}`. Cases that read raw input instead use `parse` tests (section 4.14), which take their input inline.

## 2. Setup for each test

Every test starts from a fresh copy of the case's inputs. Tests don't affect each other. Apart from `check`, `parse` and `read` tests, every test runs on the inputs as a reader keeps them after repairing and applying the consequences of failed checks (Format 17.2).

1. **Absent values.** Apply Format 2.2 to the bundle, the session header and every message: `null`, `""`, `[]` and `{}` in optional fields read as missing, except that `knownBy: []` reads as `["narrator"]`. `ext` keeps its values. State values (`set`, `initial`) keep `""`, `[]` and `{}`. `scenario.worlds` keeps `[]`. Required text fields (an entry's or part's `text`, a character's `description`) and message `content` keep `""` and `[]`; an opening's `content` is optional, so `[]` there reads as missing.
2. **Reading.** Read the session lines as a reader does (Format 12.1, 17.2): a line repeating an earlier message's ID is skipped, a message whose `parent` names no earlier message is skipped with its descendants, and the head is the header's `head` if it names a message, else the last message.
3. **The story.** The session's `scenario` names the scenario. Without a session, a `start` test names it with `scenario`; otherwise use the bundle's first scenario, whose seats are then unfilled and left out of the cast (Format 6.1), so `players` holds only cast members marked `player`. A `check` test without a session checks the bundle once for each scenario (Format 11.2). Header characters replace bundle characters as Format 12.2 says.

`check` tests skip steps 1 and 2 on their own copy and validate the raw inputs (section 4.12). `read` tests read the raw lines themselves.

## 3. Generated filler (`extend`)

Each item `{from, count, prefix, char?}` appends `count` messages. Message *n* (1-based) has:

- `id` `prefix + n`
- `parent` `from` for *n* = 1, else `prefix + (n − 1)`
- `from` `"player"` for odd *n* and `"model"` for even *n*
- `content` `[{"text": "filler " + id}]`
- `char` set to the given `char` on model messages, if one is given

The messages have no `changes` and no `activated`.

## 4. Tests

Each test has `type`, an optional `name` and `note` (informative), the inputs below, and `expect`. When `expect` is an object, its fields must be ones this section defines for the type; a runner should treat any other field as a suite error.

### 4.0 Comparing results

- **Equality** is deep JSON equality. Object key order is ignored, array order matters, and numbers compare as IEEE 754 doubles.
- **Subset** comparisons check only the keys `expect` lists; other keys in the actual result are ignored.
- Lists of entry references, IDs and names are compared in the order the spec defines: file order, cast order, firing order or line order, as stated for each test.
- Where `expect` gives a list of changes, firings or IDs, an absent field in the result counts as `[]`. Whole messages are compared as written: a message records only what the spec says it records, so a runner adds no `at`, and a message with no changes has no `changes`.

### 4.1 `roll`: rolls (Play 4)

| Input | Meaning |
| --- | --- |
| `purpose`, `seed`, `message`, `subject` | The four roll inputs. `message` may be `""`. |

`expect.hex` is the first 8 bytes of the SHA-256 digest, as lowercase hex. `expect.roll` is the roll value. Compare either or both.

### 4.2 `match`: key matching (Play 5.3)

| Input | Meaning |
| --- | --- |
| `key` | An entry key: plain, or regex when it has at least three characters and starts and ends with `/`. |
| `text` | The text the key is matched against, before NFC normalization. |

`expect` is a boolean: whether the key matches the text.

### 4.3 `state`: state at a message (Play 3.2)

| Input | Meaning |
| --- | --- |
| `at` | A message ID. Omit it for the initial state, before any message. |
| `absent` | Optional. Flattened keys that must not be present. |

The state is flattened to an object with these keys:

- `scene.location` and `scene.present`
- every variable in use by its state name: the variable ID for a scenario's, `<owner>.<id>` for a character's or world's
- one key per map key for keyed variables, such as `trust.kai` or `kai.feelings.elena`. Absent keys of `"*"` maps aren't listed.
- derived variables, by state name, computed and prepared at that message; one whose expression fails at runtime, or whose prepared value is invalid, is absent (Play 3.2)

`expect` is a subset of the flattened state.

### 4.4 `prepare`: change preparation (Play 3.3)

| Input | Meaning |
| --- | --- |
| `at` | The message whose state is "the state just before the change". Omit it for the initial state. |
| `by` | `"rules"`, `"player"` or `"model"`. |
| `set` | The proposed change, `key → value`. |
| `owner` | Optional. The owner whose own events write the change, so `own.<id>` keys resolve. |

- `expect.set` is the prepared change exactly, with full keys (`own.x` written as `<owner>.x`).
- `expect.dropped` is the list of input keys dropped, in code point order, since JSON member order carries no meaning.

### 4.5 `select`: entry selection (Play 5)

| Input | Meaning |
| --- | --- |
| `for` | The character being generated for. Omit it for the narrator (in `characters` mode) or the single voice (in `narrator` mode). |
| `parent` | The evaluation point: the parent of the message being built. Defaults to the head; without messages, the message being built is a root, with no evaluation point. |
| `messageId` | The ID of the message being built; rolls use it. |
| `maxEntries` | Optional. Fitting (Play 5.5 step 3): drop entries until at most this many of those selected in steps 1 and 2, sticky ones included, remain. Pulled entries aren't fitted. When priority-100 entries alone exceed it, every droppable entry is dropped and fitting fails. |
| `pulled` | Optional. Entry references pulled for the message (Play 5.6). Each must be eligible. |

Candidates exclude `disabled` entries and entries placed in `tracker` (Play 5.1).

Every field of `expect` is optional:

| Field | Meaning |
| --- | --- |
| `activated` | The `activated` record the message would get, in file order: entries selected in steps 1–2 that survived fitting, except those kept by `sticky`, plus pulled entries. |
| `selected` | All selected entries after fitting, sticky ones included, in file order. |
| `system`, `context`, `depth` | The selected entries placed in `system`, in `context`, and at a numeric position, each in file order. |
| `catalog` | References of the entries eligible for pulling, in file order. |
| `dropped` | References dropped by fitting, in the order dropped. |
| `failed` | Whether fitting failed (priority-100 entries don't fit). |
| `texts` | A subset map from reference to the entry's macro-resolved text. |

### 4.6 `scanned`: scanned text (Play 5.2)

| Input | Meaning |
| --- | --- |
| `for` | The viewer, as for `select`. |
| `parent` | The evaluation point. Required. |
| `depth` | The scan depth; 4 by default. |

`expect` is the scanned text string (Play 5.2).

### 4.7 `events`: an event pass (Play 3.3)

| Input | Meaning |
| --- | --- |
| `at` | The triggering message, which must exist with its player and model changes, and on a root the changes Play 2.1 records. Its recorded firings (changes with `event`) are ignored and recomputed. |
| `eventMessageId` | The ID for the system message the pass may add. |

Every field of `expect` is optional:

| Field | Meaning |
| --- | --- |
| `changes` | The firings in order, `{"by": "rules", "event", "outcome"?, "set"}`, with prepared full-key values. |
| `message` | The system message added, or `null` when none. |
| `directions` | The `direct` texts of the pass, unresolved, event before outcome. |
| `ended` | Whether an `end` fired. |
| `state` | A subset of the flattened state after the pass. |

### 4.8 `directions` and `ended`

`at` is the evaluation point. For `directions`, `expect` is the list of `direct` texts, unresolved, that the System slot of a prompt built there carries (Play 3.3 step 6): those of event-pass firings on messages from the latest model message on the path that isn't hidden, that message included. For `ended`, `expect` is whether the story is finished on that path.

### 4.9 `macro`: macro resolution (Format 10)

| Input | Meaning |
| --- | --- |
| `text` | Author text. |
| `at` | The message whose state the macros read. Omit it for the initial state, where `{{user}}` is the first player's character. `{{user}}` follows the path to `at`. |
| `char` | What `{{char}}` and a `char` path segment mean. Omit it for none: `{{char}}` is then left as written, and a `char` segment names no key (Format 10). |
| `owner` | What `own` means. Omit it for none. |
| `narrator` | Optional boolean: a narrator generation, so `{{char}}` without `char` renders as the scenario's `narrator`. |

`expect` is the rendered string (Format 10).

### 4.10 `cel`: conditions (Format 11)

| Input | Meaning |
| --- | --- |
| `expr` | A CEL expression. |
| `kind` | `"entry"` or `"event"`, which decides whether `hit()` is available; `"event"` by default. |
| `at` | The evaluation point. Omit it for none: `turn` 0, the initial state, `opening` and `last.*` `""`, `elapsed` 0, `hour` and `weekday` −1; `players` comes from the session's header, and `user` is the first player's character, or `""`. |
| `char` | The value of `char`; `""` by default. |
| `self` | The expression's owner, which also types `own`; the scenario by default. |

`hit()` always returns false in these tests. In CEL, `char` and `user` are plain variables: a computed key is read with brackets (`state.trust[char]`), and `.char` selects the literal key `"char"`. Only `bool`, `int`, `double`, `string`, list and map values are allowed; `null`, `bytes` and `uint` literals and timestamp or duration functions fail to check. If `expect` is a boolean, the expression must type-check and evaluate to it; a runtime error counts as `false`. If `expect` is `{"checkError": b}`, `b` says whether parsing or type-checking fails.

### 4.11 `start` and `swipe`: starting a session (Play 2.1)

| Input | Meaning |
| --- | --- |
| `scenario` | `start` only: a scenario ID. |
| `opening` | An opening ID. Omit it when the player writes first. |
| `characters`, `players` | `start` only: the header's characters and players. `players` defaults to the IDs of the `characters` that replace no cast member. The chronicle's character and its persona aren't in that default. |
| `answers` | Answers to `ask` questions, `key → value`. |
| `seed` | `start` only. Defaults to `"conformance-seed-0001"`. |
| `rootId` | The root's ID; `"1"` by default. |
| `eventMessageId` | The ID for a system message the root's events may add. |
| `firstMessage` | `start` only. Without an opening: the player's first message, without `id` and `parent`. |
| `chronicle` | `start` only: the chronicle document the session continues (Format 13). |

`start` ignores the case's session and starts a new one. `swipe` adds another root to the case's session, and the new root becomes the head. An opening without `content` makes a records-only root (Play 2.1 step 4); the runner doesn't generate the first model message.

Every field of `expect` is optional:

| Field | Meaning |
| --- | --- |
| `changes` | The root's `changes`. |
| `root` | The whole root message. |
| `messages` | All messages after starting. |
| `head` | The head. |
| `questions` | The state names of variables with `ask` that weren't answered, in code point order. |
| `state` | A subset of the flattened state at the root. |
| `rendered` | The resolved `text` of each of the root's text parts, in order, without speakers: `{{char}}` is each part's speaker, `{{user}}` follows the path. |
| `entries` | The root's session `entries`. |
| `characters` | The header characters' IDs. |
| `header` | A subset of the resulting session header (top-level keys compared by deep equality). |

### 4.12 `check`: reference checks (Format 17.2)

The runner validates the bundle and the session's raw lines against the schemas, then runs every reference check on the documents as a reader keeps them after repairing (Format 17.2).

- `expect.codes` is the sorted list of distinct diagnostic codes reported. It is compared exactly.
- Each session line after the header is validated against `message.schema.json`. Validators assert `format`, so a malformed timestamp is `SCHEMA`.
- `SCHEMA` covers schema failures, such as `null` in a field the spec defines. `""` and `[]` in optional fields read as missing (Format 2.2, `knownBy: []` aside) for every other operation, but writers must leave them out, so the raw document fails the schema, which is reported as `SCHEMA`.
- `UNKNOWN_FIELD` (Format 15) is located at the property itself (`/characters/0/mystery`).
- `check` tests don't use `PARSE` or `UNSUPPORTED_VERSION`; `parse` tests (section 4.14) cover reading.
- `expect.includes` lists `{code, at}` pairs that must each appear, compared on both fields.

Locations:

| Location | Form | Example |
| --- | --- | --- |
| In the bundle | A JSON Pointer, with array indices | `/scenarios/0/events/1/when` |
| In a session header | `header/<pointer>` | `header/players` |
| In a message (its schema failures included) | `message:<id>/<pointer within the message>` | `message:3/changes/0/set/hp` |

A diagnostic about one value points at that value: a list item at its index (`/scenarios/0/worlds/1`), a duplicate ID at the duplicate's `id` (`/characters/1/id`), a reference at the field holding it (`/scenarios/0/cast/2/character`). For keys inside `set`, the pointer segment is the key as written (`/set/scene.present`).

### 4.13 `prompt`: prompt slots (Play 6)

Inputs are as for `select`, plus `summaries`: an optional boolean that lets every summary the generation can see stand in for the messages it covers (Play 6), without which no summary does; and `structured`: an optional boolean for a structured reply from the narrator or the single voice, whose System slot carries the tracker's input (Play 3.4). The prompt has five slots: `system`, `setting`, `people`, `context` and `history`. Each slot is a list of items, written as strings:

| Item | String |
| --- | --- |
| The app's own prompt | `app` |
| An entry | `entry:<ref>` |
| An event direction | `direction` |
| The premise | `premise` |
| A world description | `world:<id>` |
| Each of the current location and its parents, innermost first | `location:<id>` |
| A present model-played character, or the character being generated for when absent | `character:<id>` |
| A player's character | `player:<id>` |
| An offstage character's summary | `offstage:<id>` |
| Dialogue examples | `examples:<id>` |
| A pinned message | `pinned:<id>` |
| A history message | `message:<id>` |
| A summary standing in for the messages it covers, where the last of them would be | `summary:<id>`, the ID of the message holding it |
| The session's limits, right after `app`; the wording is the app's | `limits` |
| The tracker's input, last in System, for a `structured` prompt | `tracker` |

An item appears only when it has text, so there is no `premise` without a premise and no `world:<id>` for a world without a `description`; `location:<id>` items, which carry at least the name, always appear. The text of a `character:<id>` item is the character's resolved `description`; its cast `notes` reach the prompt too, but are not part of the compared text. In the People slot, offstage characters without a `summary` contribute nothing, and `examples:<id>` items come only for present model-played characters and the character being generated for.

Every field of `expect` is optional:

- each slot name, compared as the full list of item strings in order
- `lines`, a subset map from a message ID, without the `message:` prefix, to its lines: each visible part as `<speaker name>: <text>`, or `<text>` without a speaker. Text is macro-resolved; player and model text is stored escaped (Format 10), so it comes out as written. Image parts render as `[image]` or `[image: <alt>]`, with `alt` macro-resolved; Hidden messages and records-only system messages are left out.
- `texts`, a subset map from item string to the item's resolved text, for `entry:`, `premise`, `world:`, `character:` and `offstage:` items
- `directions`, the resolved direction texts

### 4.14 `parse`: reading raw input (Format 2.2, 12, 13, 14, 15, 16)

| Input | Meaning |
| --- | --- |
| `kind` | What the input is read as: `bundle` (a `.troupe.json` file), `session`, `chronicle`, `package` (a `.troupe` ZIP archive) or `modelOutput` (JSON validated against `model-output.schema.json`, Play 3.4). |
| `text` | The input as a string, encoded as UTF-8 to get its bytes. |
| `base64` | Instead of `text`: the input's bytes, in base64. Used for bytes that aren't valid UTF-8 text and for binary formats. |

The reader parses the bytes, checks the version, validates against the schema (unknown properties and parts of unknown type as `UNKNOWN_FIELD`, Format 15) and, for sessions, reads the messages (Format 12.1). For a package it reads `bundle.json` and every session and chronicle in it. It runs no reference checks; `check` tests cover them.

Every field of `expect` is optional:

- `ok` is whether no error is reported. Every code is an error except `UNKNOWN_FIELD` and `UNSUPPORTED_VERSION` for another minor version, which are warnings; a skipped session line (`PARSE`) is an error.
- `codes` is the sorted list of distinct codes reported, compared exactly.
- `equals` is the bundle read, for `bundle`, after absent values read as missing and repairing (Format 2.2, 17.2).
- `ids` is, for `session`, the IDs of the messages read, in line order.

### 4.15 `read`: session lines (Format 12.1)

The test reads the case's raw session lines.

- `expect.ids` is the IDs of the messages read, in line order.
- `expect.head` is the head, or `null` when there are no messages: the header's `head` if it names a message, else the last message.
- `expect.codes` is the sorted distinct codes that reading lines reports: `PARSE`, `SCHEMA`, `DUPLICATE_ID` and `UNKNOWN_MESSAGE`.
- `expect.message` is the message read with that `id`.

### 4.16 `output`: model output (Play 3.4)

| Input | Meaning |
| --- | --- |
| `reply` | Optional. `{id, parent, char?}`: record a reply as a new model message. |
| `message` | Instead of `reply`: an existing message, for a tracker extraction run while it was the head; the messages after it don't affect the result. |
| `output` | A string for a plain reply, or a `ModelOutput` object. |

The output is applied as Play 3.4 says: properties unknown to `model-output.schema.json` are dropped first (Format 15), model text is stored escaped (Format 10), and changes are recorded as `{"by": "model", "set"}`. No event pass follows, and no selection runs, so a reply records no `activated`; `events` and `select` tests cover them.

Every field of `expect` is optional:

- `message` is the resulting message, or `null` when nothing is recorded.
- `dropped` is the list of change keys dropped by preparation, in code point order.
- `characters` is the header characters' IDs afterwards.
- `newcomers` is the characters the output added to the header, as stored.

### 4.17 `chronicle`: chronicle checks and writing back (Format 13; Play 2.2)

| Input | Meaning |
| --- | --- |
| `chronicle` | A chronicle document. |
| `chronicleFile` | Instead of `chronicle`: a path to a `.troupe-chronicle.json` file, relative to the case file. |
| `writeBack` | Optional. `{head}`: write back to the chronicle from the case's session at `head`. |

- `expect.codes` is optional: the sorted distinct codes from validating the chronicle against `chronicle.schema.json` and checking it (Format 13). A value key of a keyed variable has exactly one key segment.
- `expect.memories` and `expect.values` are the chronicle's `memories` and `values` after writing back from the path to `head` (Play 2.2).

Starting from a chronicle (section 4.11 input `chronicle`) follows Play 2.2. The chronicle's character is added to the header's `characters` after the test's own `characters`. When the test brings no `characters`, its `persona` fills the first seat without a `character` and comes first in the header's `characters`.

### 4.18 `edit`: player edits to state (Play 3.3)

| Input | Meaning |
| --- | --- |
| `set` | The values the player sets, `key → value`. |
| `newId` | The ID of the records-only system message the edit is recorded on. |
| `eventMessageId` | The ID for the system message the event pass may add. |

The edit is prepared as a `player` change (Play 3.3) against the state at the head. A new message `{"id": newId, "parent": head, "from": "system", "content": [], "changes": [change]}` is added and becomes the head. Events are then evaluated at that message as in section 4.7, and their firings are recorded after the change. If preparation drops every key, nothing is added, no events are evaluated, `expect.message` is `null` and the head is unchanged.

- `expect.message` is the message the edit was recorded on, after the event pass.
- `expect.events` is the event pass's firings.
- `expect.head` is the head afterwards.

### 4.19 `tracker`: tracker input (Play 3.4)

| Input | Meaning |
| --- | --- |
| `at` | The message the tracker runs on. |

Every field of `expect` is optional:

- `variables` is the state names of the variables the tracker may change, in event order (Play 3.3): `bell`, `kai.nerve`.
- `entries` is the references of the tracker entries it receives, in order.
- `contextEntries` is the references of the context session entries it receives, in order.
- `messages` is the IDs of the messages it may read: those after the last extraction on the path before `at`, up to `at`, that aren't hidden and have content, in path order.

## 5. Floating point and text

- Numbers in `expect` are JSON numbers. Compare them as doubles after parsing.
- Strings are compared code point by code point, after JSON unescaping.
- No normalization is applied to expected strings.

## 6. Adding cases

- Put a case in the folder for its area, named after its topic: `selection/group-priority.json`.
- Prefer small inline bundles.
- Compute every expected roll independently, outside the implementation under test.
- When an expectation depends on ambiguous spec text, fix the spec text rather than recording a reading in the case.
- Cite current sections in `description`, as `Format 7.2` or `Play 3.3`.
- The Unicode characters used must have properties that have been stable since Unicode 15.1.
