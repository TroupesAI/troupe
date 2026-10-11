# Troupe conformance cases

This folder holds the conformance suite for the Troupe spec. Each case is a language-neutral JSON file in `cases/`. Any implementation can run the suite by reading each case, setting up its inputs, performing each test's operation, and comparing the result with `expect`. Both libraries in this repository run it as part of their tests.

This document is the contract between the cases and a runner. When a case and this document disagree, report it as a bug in the suite.

## 1. Case files

A case file is one JSON object:

| Field | Type | Meaning |
| --- | --- | --- |
| `description` | string | What the case covers, with spec sections. Informative. |
| `note` | string | Optional. How an expected value was derived, such as roll inputs. Informative. |
| `bundle` | object | The bundle, as a JSON document. |
| `bundleFile` | string | Instead of `bundle`: a path to a bundle JSON file, relative to the case file. |
| `bundleYaml` | string | Instead of `bundle`: a YAML authoring source (Format 14.4), imported as the bundle. |
| `session` | object | Optional. `{"header": SessionHeader, "messages": [record, …]}`. `messages` lists the session's record lines after the header in file order: messages, `{"id", "deleted": true}` deletions and `{"head"}` records (Format 12.1). |
| `sessionFile` | string | Instead of `session`: a path to a `.jsonl` session file, relative to the case file. |
| `addMessages` | array | Optional. Records appended after the session's own records. |
| `extend` | array | Optional. Generated filler messages, appended after `addMessages` (section 3). |
| `tests` | array | The tests (section 4). |

If no bundle is given, the bundle is `{"troupe": <the spec version>, "kind": "bundle"}`. Cases that read raw input instead use `parse` tests (section 4.14), which take their input inline.

## 2. Setup for each test

Every test starts from a fresh copy of the case's inputs. Tests don't affect each other.

1. **Absent values.** Apply Format 2.2 to the bundle, the session header and every record: `null`, `""` and `[]` in optional fields read as missing. State values (`set`, `initial`) and call arguments (`args`) keep `""` and `[]`. `scenario.worlds` keeps `[]`. Required text fields (an entry's or part's `text`, a character's `description`) and message `content` keep `""` and `[]`; an opening's `content` is optional, so `[]` there reads as missing.
2. **Folding.** Fold the session records as a reader does (Format 12.1): a new ID adds a message, a repeated ID replaces it, a deletion removes a message and its descendants, and the head is the last head record, else the header's `head`, else the last surviving message added.
3. **The story.** The session's `scenario` names the scenario. Without a session, a test may name it with `scenario`; otherwise use the bundle's first scenario. Header characters replace bundle characters as Format 12.2 says.

`check` tests skip steps 1 and 2 on their own copy and validate the raw inputs (section 4.12). `fold` tests fold the raw records themselves.

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

### 4.1 `roll`: rolls (Play 4)

| Input | Meaning |
| --- | --- |
| `purpose`, `seed`, `message`, `subject` | The four roll inputs. `message` may be `""`. |

`expect.hex` is the first 8 bytes of the SHA-256 digest, as lowercase hex. `expect.roll` is the roll value. Compare either or both.

### 4.2 `match`: key matching (Play 5.3)

| Input | Meaning |
| --- | --- |
| `key` | An entry key: plain, or regex when it has at least three characters and starts and ends with `/`. |
| `text` | The text to match, before NFC normalization. |

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
- derived variables, by state name, computed at that message; one whose expression fails at runtime is absent

`expect` is a subset of the flattened state.

### 4.4 `prepare`: change preparation (Play 3.3)

| Input | Meaning |
| --- | --- |
| `at` | The message whose state is "the state just before the change". Omit it for the initial state. |
| `by` | `"rules"`, `"player"` or `"model"`. |
| `set` | The proposed change, `key → value`. |
| `owner` | Optional. The owner whose own events write the change, so `own.<id>` keys resolve. |
| `starting` | Optional boolean. The change carries starting values, which are exempt from `oneWay`. |

- `expect.set` is the prepared change exactly, with full keys (`own.x` written as `<owner>.x`).
- `expect.dropped` is the list of input keys dropped, in input order.

### 4.5 `select`: entry selection (Play 5)

| Input | Meaning |
| --- | --- |
| `for` | The character being generated for. Omit it for the narrator (in `mixed` mode) or the single voice (in `narrator` mode). |
| `parent` | The evaluation point: the parent of the message being built. Defaults to the head. |
| `messageId` | The ID of the message being built; rolls use it. |
| `maxEntries` | Optional. Fitting (Play 5.5 step 3): drop entries until at most this many remain. |
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
| `parent` | The evaluation point. |
| `depth` | The scan depth; 4 by default. |

`expect` is the scanned text string (Play 5.2).

### 4.7 `events`: an event pass (Play 3.3)

| Input | Meaning |
| --- | --- |
| `at` | The triggering message, which must exist with its player and model changes, and on a root the opening's change. Its recorded firings (changes with `event`) are ignored and recomputed. |
| `eventMessageId` | The ID for the system message the pass may add. |

Every field of `expect` is optional:

| Field | Meaning |
| --- | --- |
| `changes` | The firings in order, `{"by": "rules", "event", "outcome"?, "set", "args"?}`, with prepared full-key values. |
| `message` | The system message added, or `null` when none. |
| `directions` | The `direct` texts of the pass, unresolved, event before outcome. |
| `ended` | Whether an `end` fired. |
| `state` | A subset of the flattened state after the pass. |
| `warnings` | How many `CEL_ERROR` warnings the pass reports: conditions and computes that failed at runtime (Format 11.2). |

### 4.8 `directions` and `ended`

`at` is the evaluation point. For `directions`, `expect` is the list of `direct` texts, unresolved, that the System slot of a prompt built there carries (Play 3.3 step 6): those of event-pass firings on messages from the latest model message on the path, that message included. Calls (changes with `args`, or naming a callable event) never direct later prompts; their directions are only results. Invalid recorded calls (`INVALID_CALL`) also don't count or end. For `ended`, `expect` is whether the story is finished on that path.

### 4.9 `macro`: macro resolution (Format 10)

| Input | Meaning |
| --- | --- |
| `text` | Author text. |
| `at` | The message whose state the macros read. Omit it for the initial state. `{{user}}` follows the path to `at`. |
| `char` | What `{{char}}` and a `char` path segment mean. |
| `owner` | What `own` means. Omit it for none. |
| `narrator` | Optional boolean: a narrator generation, so `{{char}}` without `char` renders as "the narrator". |

`expect` is the rendered string (Format 10).

### 4.10 `cel`: conditions (Format 11)

| Input | Meaning |
| --- | --- |
| `expr` | A CEL expression. |
| `kind` | `"entry"` or `"event"`, which decides whether `hit()` is available; `"event"` by default. |
| `at` | The evaluation point. Omit it for none: `turn` 0 and the initial state. |
| `char` | The value of `char`; `""` by default. |
| `self` | The expression's owner, which also types `own`; the scenario by default. |

`hit()` always returns false in these tests. In CEL, `char` and `user` are plain variables: a computed key is read with brackets (`state.trust[char]`), and `.char` selects the literal key `"char"`. Only `bool`, `int`, `double`, `string`, list and map values are allowed; `null`, `bytes` and `uint` literals and timestamp or duration functions fail to check. If `expect` is a boolean, the expression must type-check and evaluate to it; a runtime error counts as `false`. If `expect` is `{"checkError": b}`, `b` says whether parsing or type-checking fails.

### 4.11 `start` and `swipe`: starting a session (Play 2.1)

| Input | Meaning |
| --- | --- |
| `scenario` | `start` only: a scenario ID. |
| `opening` | An opening ID. Omit it when the player writes first. |
| `characters`, `players` | `start` only: the header's characters and players. `players` defaults to the IDs of the `characters` that replace no bundle character. |
| `answers` | Answers to `ask` questions, `key → value`. |
| `seed` | `start` only. Defaults to `"conformance-seed-0001"`. |
| `rootId` | The root's ID; `"1"` by default. |
| `eventMessageId` | The ID for a system message the root's events may add. |
| `firstMessage` | Without an opening: the player's first message, without `id` and `parent`. |
| `chronicles` | `start` only: chronicles the session continues, as `{"header", "records"}` objects (section 4.18). |

`swipe` adds another root to the case's session. An opening without `content` makes a records-only root (Play 2.1 step 4); the runner doesn't generate the first model message (step 6).

Every field of `expect` is optional:

| Field | Meaning |
| --- | --- |
| `changes` | The root's `changes`. |
| `root` | The whole root message. |
| `messages` | All messages after starting. |
| `head` | The head. |
| `questions` | The state names of variables with `ask` that weren't answered, in asking order. |
| `state` | A subset of the flattened state at the root. |
| `rendered` | The root's text parts, macro-resolved: `{{char}}` is each part's speaker, `{{user}}` follows the path. |
| `entries` | The root's session `entries`. |
| `characters` | The header characters' IDs. |
| `header` | A subset of the resulting session header (top-level keys compared by deep equality). |

### 4.12 `check`: reference checks (Format 17.2)

The runner validates the bundle and the session's raw records against the schemas, then runs every reference check.

| Input | Meaning |
| --- | --- |
| `core` | Optional boolean. Also run the Core check, which reports `MECHANICS`. |

- `expect.codes` is the sorted list of distinct diagnostic codes reported. It is compared exactly.
- Each session line is validated against the schema branch its shape selects: a deletion if it has `deleted`, a head record if it has `head` and no `id`, else a message; chronicle lines likewise (header if it has `kind`, deletion if it has `deleted`, else record). Validators assert `format`, so a malformed timestamp is `SCHEMA`.
- `SCHEMA` covers schema failures, such as `null` in a field the spec defines. `""` and `[]` in optional fields read as missing (Format 2.2) for every other operation, but the raw document still fails the schema where it sets `minLength` or `minItems`, which is reported as `SCHEMA`.
- `UNKNOWN_FIELD` (Format 15) is located at the property itself (`/characters/0/mystery`).
- `check` tests don't use `PARSE` or `UNSUPPORTED_VERSION`; `parse` tests (section 4.14) cover reading.
- `expect.includes` lists `{code, at}` pairs that must each appear, compared on both fields.

Locations:

| Location | Form | Example |
| --- | --- | --- |
| In the bundle | A JSON Pointer, with array indices | `/scenarios/0/events/1/when` |
| In a session header | `header/<pointer>` | `header/players` |
| In a message (schema failures of message records included) | `message:<id>/<pointer within the message>` | `message:3/changes/0/set/hp` |
| A deletion or head record, or a chronicle line | `line:<n>/<pointer>`, where *n* is the 1-based line in the file and the header is line 1 | `line:7/id` |
| A record of a chronicle, once folded (the chronicle checks) | `record:<id>/<pointer>` | `record:r2/set/closeness` |

A diagnostic about one value points at that value: a list item at its index (`/requires/0`), a duplicate ID at the duplicate's `id` (`/characters/1/id`), a reference at the field holding it (`/scenarios/0/cast/2/character`). For keys inside `set`, the pointer segment is the key as written (`/set/scene.present`).

### 4.13 `prompt`: prompt slots (Play 6)

Inputs are as for `select`. The prompt has five slots: `system`, `setting`, `people`, `context` and `history`. Each slot is a list of items, written as strings:

| Item | String |
| --- | --- |
| The app's own prompt | `app` |
| An entry | `entry:<ref>` |
| An event direction | `direction` |
| The premise | `premise` |
| A world description | `world:<id>` |
| A location and its parents, innermost first | `location:<id>` |
| A present model-played character, or the character being generated for when absent | `character:<id>` |
| A player's character | `player:<id>` |
| An offstage character's summary | `offstage:<id>` |
| Dialogue examples | `examples:<id>` |
| A pinned message | `pinned:<id>` |
| A history message | `message:<id>` |
| The session's limits (section 4.19) | `limits` |

The text of a `character:<id>` item is the character's resolved `description`; its cast `notes` reach the prompt too, but are not part of the compared text. In the People slot, offstage characters without a `summary` contribute nothing, and `examples:<id>` items come only for present model-played characters and the character being generated for.

Every field of `expect` is optional:

- each slot name, compared as the full list of item strings in order
- `lines`, a subset map from history message ID to its lines: each visible part as `<speaker name>: <text>`, or `<text>` without a speaker. Text is macro-resolved in author messages and literal in player and model messages. Image parts render as `[image]` or `[image: <alt>]`, with `alt` macro-resolved in author messages; audio parts render as their transcript (macro-resolved in author messages), and are left out without one. Reasoning and tool parts, hidden messages and records-only system messages are left out.
- `texts`, a subset map from item string to the item's resolved text
- `directions`, the resolved direction texts

### 4.14 `parse`: reading raw input (Format 2.2, 12, 13, 14, 15, 16, Format Appendix E)

| Input | Meaning |
| --- | --- |
| `kind` | What the input is read as: `bundle` (a `.troupe.json` file), `yaml` (a YAML authoring source, Format 14.4), `session`, `chronicle`, `package` (a `.troupe` ZIP archive) or `png` (Format Appendix E). |
| `text` | The input as a string, encoded as UTF-8 to get its bytes. |
| `base64` | Instead of `text`: the input's bytes, in base64. Used for bytes that aren't valid UTF-8 text and for binary formats. |

The reader parses the bytes, checks the version, validates against the schema (unknown properties as `UNKNOWN_FIELD`, Format 15) and, for sessions and chronicles, folds the records. For a package it reads `bundle.json` and every session and chronicle in it.

Every field of `expect` is optional:

- `ok` is whether a document is read with no error diagnostics. A newer minor version or an unknown field is a warning, so the input is still `ok`.
- `codes` is the sorted list of distinct codes reported, compared exactly.
- `equals` is the bundle read, for `bundle`, `yaml` and `png`, after absent values read as missing (Format 2.2).
- `ids` is, for `session`, the surviving message IDs in line order, and for `chronicle`, the surviving record IDs in the order they were first added.

### 4.15 `fold`: session records (Format 12.1)

The test folds the case's raw session records.

- `expect.ids` is the surviving message IDs in line order.
- `expect.head` is the head, or `null`: the last head record naming a surviving message, else the header's `head` if it survives, else the last surviving message added. A replacement keeps the original's `parent`, whatever its own says.
- `expect.codes` is the sorted distinct codes reported.
- `expect.message` is the surviving message with that `id`.

### 4.16 `output`: model output (Play 3.4)

| Input | Meaning |
| --- | --- |
| `reply` | Optional. `{id, parent, char?}`: record a reply as a new model message. |
| `message` | Instead of `reply`: an existing message, for a tracker extraction. |
| `output` | A string for a plain reply, or a `ModelOutput` object. |
| `eventMessageId` | Optional. The ID of the system message the output's calls may add. |

The output is applied in this order: parts (model text stored escaped, Format 10; speakers and `knownBy` IDs naming no character dropped), newcomers in `characters` added to the header, `changes` prepared and recorded as `{"by": "model", "set", "reason"?}`, `entries` added as session entries, then `calls`, applied as in section 4.17 with `by` `"model"` after the reply and its changes.

Every field of `expect` is optional:

- `message` is the resulting message.
- `dropped` is the list of change keys dropped by preparation.
- `characters` is the header characters' IDs afterwards.
- `calls` lists the call results, as `expect.results` in section 4.17. A structured reply receives none of them (Play 3.4); they are listed to check the recorded firings.
- `system` is the system message the calls added, or `null`.

### 4.17 `calls`: callable events (Format 9; Play 3.4, 4)

| Input | Meaning |
| --- | --- |
| `message` | The message the calls are recorded on, which must exist: the model message being built, or the player's message or a records-only system message. |
| `by` | `"model"` or `"player"`. |
| `calls` | `[{event, args?}]`, applied in order. |
| `eventMessageId` | The ID of the system message the calls' `message` parts (and, for player calls, the following event pass) may add. |

Each call is processed in order:

1. **Refusals.** The call is refused with `INVALID_CALL`, recording nothing, when the event isn't a callable event in use, `by` isn't in its `call.by`, an argument names no param, an argument is invalid after preparation, or the event isn't available.
2. **Arguments.** Each param takes the argument, else its `initial`, else its type's default, and is prepared like a value (Play 3.3 steps 1, 4 and 5: sets normalized, numbers rounded and clamped), then validated. Recorded `args` hold every param; `{}` when there are none.
3. **Availability.** `when` is evaluated at the evaluation point: for `by: "model"`, the state at the message's parent; for `by: "player"`, the state at the message before this test's calls. `once` and `cooldown` count earlier firings on the path, including earlier calls in the same test. Without `cooldown` an event may be called repeatedly on one message.
4. **Firing.** The call fires like an event (Play 3.3), against the state after the earlier calls, with `args` readable in `compute`, messages and directions. Its rolls use the message's ID and the subjects of Play 4, with `#<k>` from the second call on (`pick_lock#1`, `pick_lock/e/fate/0#1`).
5. **Recording.** The call is appended to the message's changes as `{"by": "rules", "event", "outcome"?, "args", "set"}`.

After the calls, for `by: "player"`, an event pass runs at the message (section 4.7) and its firings follow the calls.

- `expect.changes` is the message's changes after the calls, recorded firings included.
- `expect.results` lists, per call, either `{"direct": [texts], "set": {changed values}}` or `{"error": "INVALID_CALL"}`. `direct` holds the event's then the outcome's `direct`, macro-resolved with the call's `args` against the state after the call; `set` is the recorded `set`.
- `expect.message` is the system message added, or `null`. Its content is the calls' `message` parts, in call order, with `{{args.<id>}}` replaced by the argument's rendered value when recorded; for player calls the event pass's parts follow in the same message.

### 4.18 `chronicle`: chronicle folding and writing back (Format 13; Play 2.2)

| Input | Meaning |
| --- | --- |
| `chronicle` | `{"header": ChronicleHeader, "records": [record or deletion, …]}`. |
| `chronicleFile` | Instead of `chronicle`: a path to a `.jsonl` file, relative to the case file. |
| `writeBack` | Optional. `{head, id, at?}`: build the record written back from the case's session at `head`. |

- `expect.records` is the surviving record IDs, in the order the records were first added.
- `expect.entries` is the folded entries in fold order: by entry ID, the latest version wins, `disabled` removes an entry, and an entry keeps the position where its ID first appeared.
- `expect.values` is the folded values, `key → value`, with keys without the owner. Folding doesn't filter keys; checks report them.
- `expect.codes` is optional: the sorted distinct codes from validating every line against `chronicle.schema.json` and checking the chronicle (Format 13), plus `UNKNOWN_CHARACTER` for a `knownBy` ID other than the character, the persona or `narrator`. A value key of a keyed variable has exactly one key segment.
- `expect.record` is the record written back (Play 2.2): `{id, at?, source?, entries?, set?}`. `source` is `{session: header id, message: head}` when the session has an `id`. `set` is keyed without the owner. `entries` lists the carried session entries on the path to `head` whose `knownBy` is absent or names the character, the latest version of each ID, in the order the IDs first appear.

Starting from chronicles (section 4.11 input `chronicles`) follows Play 2.2. Chronicle characters are added to the header's `characters` in chronicle order, after the test's own `characters`. When the test brings no `characters`, the first chronicle's `persona` fills the first seat.

### 4.19 Limits

A session or chronicle `limits` object is rendered in the System slot as the `limits` item (section 4.13), right after `app`. The test checks only that the item is there; the wording is the app's.

### 4.20 `edit`: player edits to state (Play 3.3)

| Input | Meaning |
| --- | --- |
| `set` | The values the player sets, `key → value`. |
| `newId` | The ID of the records-only system message to add when the head isn't a player message. |
| `eventMessageId` | Optional. The ID for the system message the following event pass may add. |

The edit is prepared as a `player` change (Play 3.3) against the state at the head. If the head is a player message, the change is appended to its `changes`; otherwise a new message `{"id": newId, "parent": head, "from": "system", "content": [], "changes": [change]}` is added and becomes the head. Events are then evaluated at that message (section 4.7) and recorded on it.

- `expect.message` is the message the edit was recorded on, after the event pass.
- `expect.events` is the event pass's firings.
- `expect.head` is the head afterwards.
- `expect.dropped` is the list of keys dropped by preparation.

## 5. Floating point and text

- Numbers in `expect` are JSON numbers. Compare them as doubles after parsing.
- Strings are compared code point by code point, after JSON unescaping.
- No normalization is applied to expected strings.

## 6. Adding cases

- Name a case `NNN-topic.json`, numbered after the last case.
- Prefer small inline bundles.
- Compute every expected roll independently, outside the implementation under test.
- When an expectation depends on ambiguous spec text, fix the spec text rather than recording a reading in the case.
- Cite current sections in `description`, as `Format 7.2` or `Play 3.3`.
- The Unicode characters used must have properties that have been stable since Unicode 15.1.
