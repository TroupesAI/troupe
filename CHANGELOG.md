# Changelog

## 0.12 (draft)

Hardening for implementation. Breaking changes from 0.11:

- **Model output** adds story content only: newcomers carry identity without mechanics and never replace a character; model entries take no `position` or `priority` and never replace a `system` or `tracker` entry; a `knownBy` whose IDs are all dropped becomes narrator-only (Play 3.4).
- **Player and model text** is stored escaped, and every text resolves the same way (Format 10).
- **Writers** leave out empty optional fields (`""`, `[]`, `{}`) and never write `null` state values, and readers read `knownBy: []` as narrator-only; booleans written as `false` are defaults; writers use only text and image parts, and readers skip others; `own` is reserved for variables (Format 2.2, 2.3, 12).
- **CEL** is bounded structurally: comprehensions nest at most two deep, `roll()` isn't called inside one, `string()` of a double is a `CEL_ERROR`, and string, set, `"*"` map and cast sizes have limits (Format 11.2, 16).
- **CEL** agrees across libraries: `==` and other operators take one type, only ordering mixes `int` and `double`; literals hold one type; conversions don't take strings; maps iterate in code point order; type names and whole `state` objects aren't values; CEL's own runtime errors apply; nesting counts comprehension bodies only (Format 11.2).
- **Regexes** are limited to what every RE2 implementation compiles, and an invalid key matches nothing (Format 16, 17.2).
- **Limits** cap variables and events at 1,000 each (Format 16).
- **Preparation** drops invalid keys before preparing, clamps with `max` winning when bounds cross, and exempts starting values from `oneWay`; `int` values stay within ±(2^53 − 1) (Format 8; Play 3.3).
- **Model output** is read item by item, with empty values as missing; the tracker's input is defined exactly (Play 3.4).
- **Write-back** skips the root's starting changes, and chronicle memories go on every root (Play 2.2).
- **History** length is the app's (Play 6).
- **Chronicles** take back only what a session changed (Play 2.2).
- **Players** beyond a scenario's seats add seats, and a takeover keeps a character's keys (Format 8.3, 12.2).
- **Scenarios** name their narrator for `{{char}}` (Format 6, 10).
- **Readers** ignore a leading BOM and empty session lines and reject other ZIP compression methods; the unpacked package limit is 512 MiB (Format 2.2, 12, 14, 16).
- **Removed:** the PNG-embedded form; message `author`, `model` and `stopped`; change and model-output `reason`; the session header's `id`; the order questions are asked in. No rule read them; apps keep such data in `ext`.
- **App actions** (editing, deleting, continuing, previews, turn order) and UX wording left the spec; the session snapshot keeps its invariants (Format 12; Play Appendix A).
- Readings the suite relied on are now stated in the text, and the suite gained cases for the gaps and a case schema.

## 0.11 (draft)

Initial draft, in two documents: Troupe Format and Troupe Play.
