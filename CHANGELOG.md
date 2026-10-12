# Changelog

## 0.12 (draft)

Hardening for implementation. Breaking changes from 0.11:

- **Model output** adds story content only: newcomers carry identity without mechanics and never replace a character; model entries take no `position` or `priority` and never replace a `system` or `tracker` entry; a `knownBy` whose IDs are all dropped becomes narrator-only (Play 3.4).
- **Player and model text** is stored escaped, and every text resolves the same way (Format 10).
- **Writers** leave out empty optional fields and never write `null` state values; booleans written as `false` are defaults; parts are text or image only; `own` is reserved for variables (Format 2.2, 2.3, 12).
- **CEL** is bounded structurally: comprehensions nest at most two deep, `roll()` isn't called inside one, `string()` of a double is a `CEL_ERROR`, and string, set, `"*"` map and cast sizes have limits (Format 11.2, 16).
- **Chronicles** take back only what a session changed (Play 2.2).
- **Players** beyond a scenario's seats add seats (Format 12.2).
- **Scenarios** name their narrator for `{{char}}` (Format 6, 10).
- **Readers** ignore a leading BOM and empty session lines, read the PNG `iTXt` chunk compressed or not, and reject other ZIP compression methods; the unpacked package limit is 512 MiB (Format 2.2, 12, 14, 16).
- **App actions** (editing, deleting, continuing, previews, turn order) and UX wording left the spec; the session snapshot keeps its invariants (Format 12; Play Appendix A).
- Readings the suite relied on are now stated in the text, and the suite gained cases for the gaps and a case schema.

## 0.11 (draft)

Initial draft, in two documents: Troupe Format and Troupe Play.
