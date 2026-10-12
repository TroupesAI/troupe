# Troupe conformance cases

This folder holds the conformance suite for the Troupe spec. Each case is a language-neutral JSON file in `cases/`. Any implementation can run the suite by reading each case, setting up its inputs, performing each test's operation, and comparing the result with `expect`. Libraries live in their own repositories and run it as part of their tests.

This document is the contract between the cases and a runner. When a case and this document disagree, report it as a bug in the suite.

## 1. Case files

Cases live in `cases/<area>/<topic>.json`, one folder per area of the spec:

| Area | Covers |
| --- | --- |
| `state` | State at a message, keyed and derived variables, normalization and rounds (Format 8, 12.1) |
| `events` | What a recorded `end` means (Format 9) |
| `macros` | Macro parsing and rendering (Format 10) |
| `cel` | Conditions (Format 11) |
| `knowledge` | Who knows a part or a summary (Format 7.4, 12.4, 12.5) |
| `roots` | Roots made from openings (Format 6.3, 12.1) |
| `sessions` | Session lines, the head, players and the cast (Format 12) |
| `chronicles` | Chronicles (Format 13) |
| `checks` | Checks and unknown fields (Format 15, 17.2) |
| `parsing` | Raw files (Format 2.2, 14, 16) |
| `examples` | The spec's worked examples and the authoring guide's patterns |

The order of cases doesn't matter. A case file is one JSON object, described by [`case.schema.json`](case.schema.json), which `bun run check` applies:

| Field | Type | Meaning |
| --- | --- | --- |
| `description` | string | What the case covers, with spec sections. Informative. |
| `note` | string | Optional. How an expected value was derived, such as how a number rounds. Informative. |
| `bundle` | object | The bundle, as a JSON document. |
| `bundleFile` | string | Instead of `bundle`: a path to a bundle JSON file, relative to the case file. |
| `session` | object | Optional. `{"header": SessionHeader, "messages": [Message, …]}`. `messages` lists the session's lines after the header, in file order (Format 12.1). |
| `sessionFile` | string | Instead of `session`: a path to a `.jsonl` session file, relative to the case file. |
| `tests` | array | The tests (section 3). |

Bundles, session headers and chronicles given as objects leave out `troupe`: before anything else, `check` validation included, the runner sets it to the spec version. If no bundle is given, the bundle is `{"troupe": <the spec version>, "kind": "bundle"}`. Cases that test raw input instead use `parse` tests (section 3.7), which take their input inline.

## 2. Setup for each test

Every test starts from a fresh copy of the case's inputs. Tests don't affect each other.

- **Conforming inputs.** `state`, `macro`, `cel`, `ended` and `knows` tests run only on inputs that conform (Format 17.1), since the spec gives files that fail a check no meaning to test. Every case with such tests also has a `check` test that expects no codes, which a runner uses to confirm it.
- **The story.** The session's `scenario` names the scenario. Without a session, use the bundle's first scenario, whose seats are then unfilled and left out of the cast (Format 6.1), so `players` holds only cast members marked `player`. A `check` test without a session checks the bundle once for each scenario (Format 11.2). Header characters replace bundle characters as Format 12.2 says.

## 3. Tests

Each test has `type`, an optional `name` and `note` (informative), the inputs below, and `expect`. When `expect` is an object, its fields must be ones this section defines for the type; a runner should treat any other field as a suite error. Results are compared this way:

- **Equality** is deep JSON equality. Object key order is ignored, array order matters, and numbers compare as IEEE 754 doubles.
- **Subset** comparisons check only the keys `expect` lists; other keys in the actual result are ignored.
- Lists are compared in the order the spec defines, such as cast order.

### 3.1 `state`: state at a message (Format 8.6)

| Input | Meaning |
| --- | --- |
| `at` | A message ID. Omit it for the initial state, before any message. |
| `absent` | Optional. Flattened keys that must not be present. |

The state is flattened to an object with these keys:

- `scene.location` and `scene.present`
- every variable in use by its state name: the variable ID for a scenario's, `<owner>.<id>` for a character's or world's
- one key per map key for keyed variables, such as `trust.kai` or `kai.feelings.elena`. Absent keys of `"*"` maps aren't listed.
- derived variables, by state name, computed and normalized at that message; one whose expression fails at runtime, or whose normalized value is invalid, is absent (Format 8.1)

`expect` is a subset of the flattened state.

### 3.2 `ended`: the end of a story (Format 9)

`expect` is whether the story is finished at the message `at`: whether a firing recorded on the path to it, that message included, is of an event or outcome with `end` (Format 9).

### 3.3 `macro`: macro resolution (Format 10)

| Input | Meaning |
| --- | --- |
| `text` | Author text. |
| `part` | Instead of `text` and `at`: `{message, index}`, the `text` of that part of that message, resolved at that message as Format 10 says of message parts. |
| `at` | The message whose state the macros read. Omit it for the initial state, where `{{user}}` is the first player's character. `{{user}}` follows the path to `at`. |
| `char` | What `{{char}}` and a `char` path segment mean. Omit it for none: `{{char}}` is then left as written, and a `char` segment names no key (Format 10). |
| `owner` | What `own` means. Omit it for none. |
| `narrator` | Optional boolean: the text is used for a message written for the narrator, so `{{char}}` without `char` renders as the scenario's `narrator`. |

`expect` is the rendered string (Format 10).

### 3.4 `cel`: conditions (Format 11)

| Input | Meaning |
| --- | --- |
| `expr` | A CEL expression. |
| `kind` | `"entry"` or `"event"`, which decides whether `hit()` is available; `"event"` by default. |
| `at` | The evaluation point. Omit it for none: `turn` 0, the initial state, `opening` and `last.*` `""`, `elapsed` 0, `hour` and `weekday` −1; `players` comes from the session's header, and `user` is the first player's character, or `""`. |
| `char` | The value of `char`; `""` by default. |
| `self` | The expression's owner, which also types `own`; the scenario by default. |

`hit()` always returns false in these tests, and `roll()` isn't called. In CEL, `char` and `user` are plain variables: a computed key is read with brackets (`state.trust[char]`), and `.char` selects the literal key `"char"`. Only `bool`, `int`, `double`, `string`, list and map values are allowed; `null`, `bytes` and `uint` literals and timestamp or duration functions fail to check. If `expect` is a boolean, the expression must type-check and evaluate to it; a runtime error counts as `false`. If `expect` is `{"checkError": b}`, `b` says whether parsing or type-checking fails.

### 3.5 `check`: checks (Format 17.2)

The runner validates the bundle and the session's lines against the schemas, then runs every other check (Format 17.2). Every check runs on the documents as written, so one value can fail several checks (Format 17.1).

- `expect.codes` is the sorted list of distinct diagnostic codes reported. It is compared exactly.
- Each session line after the header is validated against `message.schema.json`. Validators assert `format`, so a malformed timestamp is `SCHEMA`.
- `SCHEMA` covers schema failures, such as `null`, `""` or `[]` in an optional field (Format 2.2).
- `UNKNOWN_FIELD` (Format 15) is located at the property itself (`/characters/0/mystery`).
- `check` tests don't use `PARSE` or `UNSUPPORTED_VERSION`; `parse` tests (section 3.7) cover them.
- `expect.includes` lists `{code, at}` pairs that must each appear, compared on both fields.

Locations:

| Location | Form | Example |
| --- | --- | --- |
| In the bundle | A JSON Pointer, with array indices | `/scenarios/0/events/1/when` |
| In a session header | `header/<pointer>` | `header/players` |
| In a message (its schema failures included) | `message:<id>/<pointer within the message>` | `message:3/changes/0/set/hp` |

A diagnostic about one value points at that value: a list item at its index (`/scenarios/0/worlds/1`), a duplicate ID at the duplicate's `id` (`/characters/1/id`), a reference at the field holding it (`/scenarios/0/cast/2/character`). For keys inside `set`, the pointer segment is the key as written (`/set/scene.present`).

### 3.6 `knows`: who knows a part or a summary (Format 7.4, 12.4, 12.5)

| Input | Meaning |
| --- | --- |
| `message` | A message ID. |
| `part` | The index of one of its parts. |
| `summary` | Instead of `part`: `true`, for the message's `summary`. |

`expect` is who knows it: the IDs of the characters who know it, and `narrator` when the narrator knows it, in code point order. The single voice knows everything but hidden messages' parts, and isn't listed.

### 3.7 `parse`: raw input (Format 2.2, 12, 13, 14, 15, 16)

| Input | Meaning |
| --- | --- |
| `kind` | What the input is: `bundle` (a `.troupe.json` file), `session`, `chronicle` or `package` (a `.troupe` ZIP archive). |
| `text` | The input as a string, encoded as UTF-8 to get its bytes. |
| `base64` | Instead of `text`: the input's bytes, in base64. Used for bytes that aren't valid UTF-8 text and for binary formats. |

The runner parses the bytes, checks the version and validates against the schema, with unknown properties and parts of unknown type as `UNKNOWN_FIELD` (Format 15). For a package it checks the archive and its `bundle.json` and every session and chronicle in it (Format 14.3). It runs no other checks; `check` tests cover them.

`expect.codes` is the sorted list of distinct codes reported, compared exactly. A conforming input has none.

### 3.8 `chronicle`: chronicle checks (Format 13)

| Input | Meaning |
| --- | --- |
| `chronicle` | A chronicle document. |
| `chronicleFile` | Instead of `chronicle`: a path to a `.troupe-chronicle.json` file, relative to the case file. |

`expect.codes` is the sorted distinct codes from validating the chronicle against `chronicle.schema.json` and checking it (Format 13). A value key of a keyed variable has exactly one key segment.

## 4. Floating point and text

- Numbers in `expect` are JSON numbers. Compare them as doubles after parsing.
- Strings are compared code point by code point, after JSON unescaping.
- No normalization is applied to expected strings.

## 5. Adding cases

- Put a case in the folder for its area, named after its topic: `state/clamping.json`.
- Prefer small inline bundles.
- Test failed checks in separate cases, with `check`, `chronicle` and `parse` tests; other tests need conforming inputs (section 2).
- Keep inputs to what the tests read.
- When an expectation depends on ambiguous spec text, fix the spec text (see [CONTRIBUTING.md](../CONTRIBUTING.md#changing-the-spec)).
- Cite current sections in `description`, as `Format 7.2`.
