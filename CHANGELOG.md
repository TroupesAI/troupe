# Changelog

## 0.12 (draft)

Hardening for implementation. Breaking changes from 0.11:

- **Writers** leave out empty optional fields (`""`, `[]`, `{}`), never write `null` outside `ext`, and write integers without a fraction or exponent; booleans written as `false` are defaults; writers use only text and image parts, and readers skip others; `own` can't name a character, world, scenario or variable (Format 2.2, 2.3, 12).
- **Readers** ignore a leading BOM and empty session lines and reject other ZIP compression methods; the unpacked package limit is 512 MiB. A reader that keeps a file failing its schema repairs it exactly, removing the value at each failing assertion, and the schemas forbid properties at the property, so repair removes only that property (Format 2.2, 12, 14, 16, 17.2).
- **CEL** is bounded structurally and agrees across libraries: comprehension bodies nest at most two deep, without `roll()` or joining strings and lists; `==` and arithmetic take one type, and only ordering mixes `int` and `double`; literals hold one type; conversions don't take strings, and `string()` doesn't take a double; maps iterate in code point order; type names and whole `state` objects aren't values; CEL's own runtime errors apply; `hit()` and `matches()` take literals; `roll(n)` below 1 is a runtime error. An app out of resources fails instead of recording a different outcome (Format 11).
- **Regexes** are limited to what every RE2 implementation compiles, and an invalid key matches nothing (Format 16, 17.2).
- **Limits** cap variables and events at 1,000 each, count what a session adds, cap session entries on a path at 10,000 and `scanDepth` at 100; string, set, `"*"` map and cast sizes have limits (Format 7, 16).
- **Preparation** drops invalid keys first, clamps with `max` winning when bounds cross, and exempts starting values from `oneWay`; `int` values stay within ±(2^53 − 1). `scene.present` drops IDs outside the cast instead of the whole change and keeps cast order. Derived values are prepared too, and an invalid one is absent (Format 8; Play 3.2, 3.3).
- **Model output** adds story content only: newcomers carry identity without mechanics and never replace a character; model entries take no `position` or `priority` and never replace an entry outside `context`. It is read item by item, with empty values as missing; a structured reply left with no parts is discarded. A `knownBy` whose IDs are all dropped becomes narrator-only (Play 3.4).
- **Trackers** run on a message sent to models and record there; their input is defined exactly and testable (Play 3.4).
- **Player and model text** is stored escaped, and every text resolves the same way. Macros in a message resolve on the path to it; `own` means `state` in message parts; labels resolve before substitution; dialogue examples take macros; `{{char}}` in cast notes is the cast member (Format 10).
- **Knowledge:** a `knownBy` that is empty, or emptied by unknown IDs or repair, is narrator-only (Format 7.4).
- **Players** beyond a scenario's seats add seats, a seat nobody fills leaves the cast, a takeover keeps a character's keys, and a replacement of a character outside the cast counts as a new character (Format 6.1, 8.3, 12.2).
- **Chronicles** take back only what a session changed. Every root of a chronicle session records the chronicle's change, even empty, and holds its memories, records-only roots included; a replacement of a carried entry is carried; a chronicle character outside the cast joins it (Format 12.3, 12.4; Play 2.1, 2.2).
- **Scenarios** name their narrator for `{{char}}` (Format 6, 10).
- **`end`** changes nothing else; history length is the app's (Format 9; Play 6).
- **Removed:** the PNG-embedded form; message `author`, `model` and `stopped`; change and model-output `reason`; the session header's `id`; the order questions are asked in; display defaults for bundle and scenario names. No rule read them; apps keep such data in `ext`.
- **App actions** (editing or deleting messages, continuing, previews, turn order) and UX wording left the spec; the session snapshot keeps its invariants. Rules are stated once, meanings in Format and procedures in Play (Format 12; Play Appendix A).
- Readings the suite relied on are now stated in the text. The suite gained cases for the gaps, a case schema, a `tracker` test type, and a check that cases expect `SCHEMA` exactly when the schemas reject their inputs.

## 0.11 (draft)

Initial draft, in two documents: Troupe Format and Troupe Play.
