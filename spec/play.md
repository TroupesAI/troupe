# Troupe Play

**Version 0.12 (draft)** · October 12, 2026

This document defines how an app plays Troupe files: how it starts and continues a session, computes state, runs events, rolls dice, activates entries, fills a prompt and applies knowledge. Apps that follow it give the model the same content and record the same outcomes for the same files, seed and message IDs. [Troupe Format](format.md) defines the files and comes first.

> **Status.** This is a draft. Breaking changes are allowed until 1.0. It has the same version as Troupe Format.

## Contents

1. [Overview](#1-overview)
2. [Sessions](#2-sessions)
3. [State](#3-state)
4. [Randomness](#4-randomness)
5. [Entry activation](#5-entry-activation)
6. [Prompt assembly](#6-prompt-assembly)
7. [Knowledge](#7-knowledge)
8. [Conformance](#8-conformance)

**Appendix:** [A Design decisions](#appendix-a-design-decisions)

---

## 1. Overview

### 1.1 Story and fitting

Troupe separates **what a story is** (content, state, knowledge and recorded outcomes) from **how an app fits it to a model** (which entries to activate, where to place them, what to leave out). The first is fixed by this specification. The second has a deterministic baseline that apps follow when they create a message (sections 5 and 6).

### 1.2 Conventions

Format 2 applies here, including requirement keywords. "Format 7.2" means section 7.2 of Troupe Format; a section number alone means this document. Normative references are listed in Format Appendix E. Appendix A is informative.

---

## 2. Sessions

### 2.1 Starting

1. Generate a random `seed` of at least 96 bits.
2. Fill the player seats.
3. Ask the questions of variables in use that have `ask`, except those whose key the chronicle's change sets.
4. Create a root message for the chosen opening: `from: "system"`, with `opening` set and the content copied as written, or empty for an opening without `content`. It records these changes, in order:
   1. when the session continues a chronicle, its values in one `{"by": "rules", "set": …}` change (section 2.2);
   2. `{"by": "rules", "set": …}` with the opening's `set`, less the keys the chronicle's change sets, plus the starting `scene.present`;
   3. `{"by": "player", "set": …}` with the answers.

   The starting `scene.present` is the opening's `scene.present` when its `set` lists one; otherwise the cast characters who speak in its content, or, for an opening without `content`, every character in the session's cast except the joiners when the root is made (Format 12.2). The players' characters, and the chronicle's character when it isn't in the scenario's cast (section 2.2), are added to it.

   Without an opening, the player's first message is the root. It records, in order:
   1. the chronicle's change;
   2. when the chronicle's character isn't in the scenario's cast, a `{"by": "rules"}` change setting `scene.present` to the presence of section 3.2 plus that character, in cast order;
   3. its own changes;
   4. the answers.

   In both, a change that would set nothing isn't recorded, except the chronicle's, which every root of a session that continues a chronicle records first.
5. Evaluate events at the root.

Every later root, from another opening or a player's message, is made by steps 3 to 5; in a session that continues a chronicle, its first change and its entries are copies of the first change and the entries of the session's earliest root line.

### 2.2 Continuing a chronicle

- **Starting.** A session continues at most one chronicle, named by `chronicle`.
  - The chronicle's `character` is copied into the header's `characters`, after the others, where it replaces the bundle character with the same ID (Format 12.2). When the character isn't in the scenario's cast, it joins the cast and is present at the start (section 2.1).
  - Unless the people playing bring another character, `persona` fills the first seat without a `character`, or adds a seat (Format 12.2), and is listed first in the header's `characters`.
  - The chronicle's `limits` are added to the session's `lines` and `veils`, in order, without duplicates.
  - Its `memories` are copied onto each root as carried session entries, a memory without `carry` getting `carry: true` and one without `knownBy` getting the character's ID as its `knownBy`, and its `values` are recorded on each root in one `{"by": "rules"}` change, keyed with the character's ID (`mira.closeness`), before any other change (section 2.1).
  - Value keys and memory `knownBy` IDs that name the persona take effect only when the persona plays with its own ID (section 2.1 step 2).
- **Writing back** from a path rewrites the chronicle with only what the session changed; an app that writes back from a session again takes only what changed on the path after the message it last wrote back from, while that message is on the path, and otherwise from the root:
  - `values` keeps only carried keys, keyed without the owner, and takes the latest value of each carried key that a change on the path set, except the root's `by: "rules"` changes without an `event`, which hold the starting values.
  - The memories written back are the carried session entries on the path, the latest version of each ID, merged as Format 12.3 says, whose `knownBy` is absent or names the character. An entry whose latest version on the path is on a root is skipped.
  - Each keeps in `knownBy` only the character, the persona and `narrator`.
  - Each replaces the memory with its ID, or is added after the others in the order the IDs first appear, unless the chronicle would pass its limit (Format 16); one with `disabled` removes that memory and is never added.
  - `character`, `persona`, `limits` and the rest of the chronicle stay as they are.

---

## 3. State

### 3.1 Counting

| Quantity | Counts |
| --- | --- |
| `turn`, `ago`, sticky, cooldown and **distance** | **rounds**: player messages on the path. A message's `turn` is the number of player messages from the root to it, inclusive; a message being built has its parent's `turn`. The distance from one message to another is the difference of their `turn`. |
| `scanDepth` | messages that aren't hidden and have content, whether or not the generation can see their parts |
| numeric `position` | messages in the History slot as sent, a summary counting as one |

### 3.2 Reading state

The state at a message is computed by applying, in order:

1. every variable's initial value, a set normalized and a number clamped as in section 3.3; no location; the whole cast present except the joiners (Format 12.2);
2. the `changes` of every message on the path from the root to that message, in path order, and within a message in array order.

Playing never modifies a bundle. Derived variables are computed from that state when read and prepared by steps 1, 4 and 5 of section 3.3; one whose expression fails at runtime, or whose value then isn't a valid value (Format 8.5), is absent. Readers apply recorded changes and never re-run events or trackers on load.

### 3.3 Recording changes

Before recording a change, apps drop each key that isn't valid, or whose value isn't (Format 8.5), and each key whose channel Format 8.1 and 8.4 don't allow. They then prepare each remaining value, key by key in code point order of the full keys, using the state just before the change:

1. normalize a set: remove duplicates, then order listed members as declared; normalize `scene.present`: remove duplicates and IDs that name no cast character, then order it by cast order;
2. for `by: "model"`, limit the difference from the current value to `maxStep`;
3. for `oneWay` variables, except in a root's chronicle, opening and answer changes (section 2.1), keep the current value instead of a move backward; a set becomes its current members followed by the value's new ones, normalized as in step 1;
4. round `number` values to the nearest double to the decimal that ECMAScript `Number.prototype.toFixed(6)` produces;
5. clamp: raise the value to `min`, then lower it to `max`; a bound named by a variable whose key the change keeps is that variable's prepared new value, even when its key comes later.

A key whose prepared value is no longer valid, such as a set grown past its limit (Format 16), is dropped too, and so is a key that would take a `"*"` map past its limit, after applying the keys kept before it in the change. Within a message, changes are recorded in the order they happen: on a root, in the order of section 2.1, then any extraction's change; on any message, player and model changes before the changes of the events they trigger.

**Readers** re-apply steps 1, 4 and 5 when loading and drop invalid keys, but don't re-check channels, `maxStep` or `oneWay`.

**Player edits** to state are recorded on a new `from: "system"` child of the head with empty `content`, which becomes the head. Events are then evaluated at that message. An edit whose keys are all dropped records nothing.

**Events.** At each root, after each player or model message once its player and model changes and any extraction on it are recorded, and after player edits, an event pass runs before anything is generated after that message:

1. Events in use are evaluated in a single pass, once each, in this order: the scenario's, the scenario's worlds', the session's worlds', then the characters' in cast order, each owner's in array order. An event with `on` is skipped unless the triggering message is of that kind; a root made from an opening and a records-only message are of neither kind. Each sees the state, firings and counts left by those before it. Messages added by events don't trigger evaluation.
2. An event fires when its `when` is true; it isn't `once` with an earlier firing on the path; its distance from its last firing is greater than `cooldown` (0 when unset), so it fires at most once per round; and its `chance` roll succeeds.
3. A firing chooses an outcome by a weighted roll, if there are `outcomes`. The event's `set` and `compute`, then the outcome's, produce new values; later keys replace earlier ones. Every `compute` expression sees the state before this firing. Values are prepared as above.
4. The firing is recorded on the triggering message as `{"by": "rules", "event": name, "outcome": index, "set": {…}}`, even when `set` is empty.
5. The `message` parts of all firings in the pass, event before outcome, form one `from: "system"` message, a child of the triggering message, which becomes the head.
6. The `direct` texts of the firings recorded on the triggering message, each event's before its outcome's, go into the System slot of every prompt built while no model message that isn't hidden lies on the path after it.

### 3.4 Model output

One payload carries what a model produces, through either of two transports. An **extraction** is a tracker run, or a structured reply from the narrator or the single voice. Its schema is `model-output.schema.json` (Format Appendix A):

```ts
interface ModelOutput {
  parts?: { speaker?: string; text: string; knownBy?: string[] }[];   // a reply's parts
  changes?: Record<string, Json>;  // keys that changed, with new values
  entries?: Entry[];               // session entries to add, such as memories; no position or priority
  characters?: Newcomer[];         // newcomers who appeared; changes put them in scene.present
}

type Newcomer = Pick<Character, "id" | "name" | "aliases" | "description" | "summary">;
```

- **Tracker.** A tracker run is a model call separate from the story reply. It runs on a message that isn't hidden and has content, while that message is the head and before the event pass after it. It reads the messages after the last extraction on the path before that message, up to that message, as many of them as the app chooses, and returns everything but `parts`. Its input, at the message it runs on, is:
  - for each variable in use whose `by` includes `model`, in event order (section 3.3), its key, type, `values` or range (a named bound at its current value), `description` and current value, and for a keyed variable its keys, or that any author ID may be one;
  - the scene's values, the ID and name of every location of the bundle and session in world order, and of every cast character in cast order;
  - the entries in use placed in `tracker`, not `disabled`, whose `when` holds: those of the worlds, the cast characters in cast order, the scenario and the session, in the order of section 5.1;
  - the session entries on the path placed in `context`, in the order of section 5.1: for a tracker run, all of them that aren't `disabled`, with their IDs and texts; for a structured reply, the IDs of those the Context slot carries;
  - the messages it reads that aren't hidden and have content, with full knowledge.
- **Structured reply.** The story model returns the whole payload in its reply. For the narrator and the single voice, the System slot carries tracker input (section 6). A character's generation in `characters` mode gets none, and apps keep only the `parts` of its reply.
- **Plain reply.** Without structure, the reply is one text part whose `speaker` is the message's `char`, or none for the narrator. Apps MUST NOT guess `knownBy` from plain text.

Nothing in the payload takes `ext`, and:

- A newcomer whose ID names a character, world, scenario or scenario variable of the bundle or session, an earlier newcomer of the payload included, or who would take the cast past its limit (Format 16), is dropped.
- An entry is dropped when the latest version of the session entry with its ID on the path, merged as Format 12.3 says and disabled or not, isn't placed in `context`; a model may update or disable a context entry, such as a memory.

How an app takes the payload out of a reply is up to it. Output that isn't a JSON object is discarded, and nothing is recorded. Otherwise apps apply a payload in this order:

1. Read its empty values as Format 2.2 says, except that an empty `knownBy` stays empty for steps 3 and 5, and drop its unknown properties (Format 15), and a tracker run's `parts`. Drop each top-level property, part, entry or newcomer that still fails the schema, and each entry or newcomer whose ID an earlier one in the payload has. A structured reply left with no parts is discarded, and nothing is recorded.
2. `characters` join the header, after its other characters, in payload order.
3. `parts` are stored. A speaker that names no cast character is dropped (a newcomer that joined is in the cast), and so is each `knownBy` ID other than `narrator` that names none. A `knownBy` that is empty, or whose IDs are all dropped, becomes `["narrator"]`, or `[<speaker>, "narrator"]` on a part with a speaker.
4. `changes` are recorded as one `{"by": "model", …}` change, prepared as in section 3.3, on the message the tracker runs on or on the reply itself. Every extraction records this change, with an empty `set` when it changes nothing, which marks where the next tracker run starts.
5. `entries` become session entries on the same message, each replacing one there with its ID and stored with each field it lacks taken from it, as Format 12.3 says of later replacements, with their `knownBy` IDs dropped and emptied as in step 3; on a root they are dropped. An entry that would take the path's session entries past their limit (Format 16) is dropped.

---

## 4. Randomness

Every random choice is a roll that any app reproduces exactly:

```text
roll(purpose, seed, messageId, subject):
  d = SHA-256(UTF-8("troupe-roll-1\n" + purpose + "\n" + seed + "\n" + messageId + "\n" + subject))
  return d[0]·2^40 + d[1]·2^32 + d[2]·2^24 + d[3]·2^16 + d[4]·2^8 + d[5]
```

| Use | Purpose | Message | Subject | Result |
| --- | --- | --- | --- | --- |
| Entry `chance` | `chance` | the message being built | entry reference | passes if `roll < chance · 2^48` |
| Group pick | `group` | the message being built | `<owner>/<group>` | weighted pick |
| Event `chance` | `event` | the triggering message | event name | passes if `roll < chance · 2^48` |
| Event outcome | `outcome` | the triggering message | event name | weighted pick |
| `roll(n)` | `dice` | the triggering message | `<event name>/<part>/<key>/<k>`: key is the compute key as written; part is `e` for the event or the outcome index; *k* numbers the `roll` calls in that expression by where they start, from 0 | `roll mod n + 1` |
| `{{pick}}` | `pick` | `""` | the options joined by `::`, then `#` and the macro's index among the picks in that string, from 0 | option `roll mod count` |

- **`seed`** is the session's. A message's ID is fixed before its prompt is built.
- **Weighted pick:** with candidates in order and total integer weight *W*, let `t = roll mod W`; pick the first candidate whose running total of weights exceeds `t`.
- `chance · 2^48` is exact in double precision, so `chance: 1` always passes and `0` never does.

Test vectors, with seed `k7Qm2xVb9TzR4pLc8NwYfA`:

| Purpose | Message | Subject | First 8 bytes of SHA-256 | Roll | Example result |
| --- | --- | --- | --- | --- | --- |
| `chance` | `4` | `veyra/weather_rain` | `9f4855e34dd8cc82` | 175133027421656 | fails `chance: 0.3` |
| `group` | `3` | `veyra/weather` | `5fa5e201f6978c17` | 105166066022039 | weights [3, 1]: t = 3, the second |
| `group` | `4` | `veyra/weather` | `fbcbed0cd7492b7c` | 276853273974601 | weights [3, 1]: t = 1, the first |
| `event` | `5` | `patrol` | `6b828105a92f7de1` | 118208254552367 | fails `chance: 0.3` |
| `outcome` | `5` | `patrol` | `ceab28794ed3ace2` | 227234513768147 | weights [3, 1]: t = 3, the second |
| `dice` | `5` | `attack/e/foe_hp/0` | `1f5e290008b11581` | 34489275254961 | `roll(6)` = 4 |
| `pick` | (empty) | `red::blue::green#0` | `16ce7d2a294c6160` | 25076118989132 | `green` |

---

## 5. Entry activation

This section is the deterministic baseline for choosing entries. Given the same files, session, seed and message ID, every conforming app MUST select the same entries, except for pulls and fitting, which depend on the app.

### 5.1 Candidates

When a prompt is built for a new message, the candidates are the entries, not `disabled` and not placed in `tracker`, of:

1. the scenario's worlds, then the session's worlds;
2. present characters in cast order, then the character being generated for if absent;
3. the scenario;
4. the session: entries added by messages on the path, the latest per ID, in the order their IDs first appear.

This is also the **file order**; within an owner, entries keep their array order. Entries the generation can't see under section 7 are left out.

### 5.2 Scanned text

An entry's scanned text is built from the last `scanDepth` messages on the path, counted as section 3.1 says, newest first. Each text part that the generation can see, in array order, contributes `<speaker name>: <text>`, or its text when it has no speaker, with macros resolved (Format 10). Contributions are joined with `\n`. Image parts are never scanned.

### 5.3 Matching

Matching works on Unicode scalar values, with scanned text and plain keys normalized to NFC. Apps SHOULD use Unicode 15.1 or later.

- **Case:** comparison uses simple case folding (statuses C and S of `CaseFolding.txt`).
- **Plain keys** match where no letter, digit or mark (General Categories L, N and M) directly touches either end of an occurrence. Keys containing Han, Hiragana, Katakana, Hangul, Thai, Lao, Khmer, Myanmar or Tibetan characters match anywhere.
- **Regex keys** are compiled unchanged as RE2 patterns, case-insensitive unless the pattern clears the flag, and match anywhere.
- An empty key, as in `hit('')`, matches nothing.

### 5.4 Activation records

Each new model message records the entries that **activated** for it in `activated`, in file order. For a recorded entry, *d* is the distance from the latest message on the path recording it to the message being built.

- **Sticky:** for an entry with `sticky`, if *d* ≤ `sticky`, the entry is kept without needing to match.
- **Cooldown:** if `sticky` < *d* ≤ `sticky` + `cooldown` (an unset `sticky` counts as 0), it can't activate.
- **Once:** an entry recorded anywhere on the path can't activate again.

### 5.5 Steps

1. **Sticky.** Candidates kept by `sticky` whose `when` holds are selected. If several share a group, the highest `priority` stays, ties broken by file order; the others are excluded for this message.
2. **Selection.** Four phases apply to every candidate not selected or excluded in step 1, each phase finishing before the next:
   1. **Match.** A candidate matches if a key matches its scanned text. An entry without `keys` or `pull` always matches.
   2. **Filter.** A matching candidate is excluded if its `when` is false, it is in cooldown, it is `once` and already recorded, or it fails its `chance` roll.
   3. **Group.** For each group of an owner with no selected entry, the remaining candidates with the highest `priority` compete, and one wins by a weighted group roll; the group's other remaining candidates are excluded. Candidates of a group that already has a selected entry are excluded.
   4. **Select.** The remaining candidates are selected.
3. **Fit.** If space runs out, the app drops entries selected in steps 1 and 2 below priority 100, lowest `priority` first, ties broken by dropping later entries in file order. It never drops priority-100 entries; if they don't fit, generation fails. Fitting never re-rolls.

The app then records the entries selected in steps 1 and 2 that survived step 3, except those kept by `sticky`, together with any entries pulled for the message.

### 5.6 Pulling

Entries with `pull` are retrieved when relevant, by either of two methods an app MAY offer: the model sees a catalog of their titles and requests entries by title; or the app finds entries by similarity search over titles and texts. Only entries the generation can see, that weren't selected or dropped by fitting, and whose `when` holds, with `hit()` checking their scanned text, are eligible; groups, `once`, `sticky`, `cooldown` and `chance` don't apply to pulling. Pulled entries are added after fitting (section 5.5); a pulled entry's text reaches the model, and the entry is recorded in `activated`, so its `sticky`, `cooldown` and `once` then count from that record (section 5.4). In apps that offer neither method, entries with `pull` activate only through their `keys`.

---

## 6. Prompt assembly

Troupe defines what goes into a prompt and in which slot; formatting, mapping to model roles, the order of slots and how much history to send are up to the app.

| Slot | Contents, in order |
| --- | --- |
| **System** | the app's own prompt; the session's `limits` (Format 12); selected entries placed in `system`; event directions (section 3.3); for a structured reply from the narrator or the single voice, the tracker's input other than the messages, taken at the prompt's evaluation point (section 3.4) |
| **Setting** | the premise; world descriptions, in the world order of section 5.1; the current location and its parents, innermost first |
| **People** | present model-played characters, then the character being generated for if absent: description and cast `notes`; the players' characters in cast order: description and cast `notes`; offstage model-played cast characters other than the one being generated for, whose name or alias, as a plain key, matches the scanned text (section 5.2) of the last 4 messages, as the generation can see it: their `summary`, in cast order, a character without one contributing nothing; dialogue examples of the present model-played characters in cast order, then of the character being generated for if absent |
| **Context** | selected entries placed in `context`; pinned messages |
| **History** | messages on the path with parts the generation can see, image parts reaching models without image input as their `alt`, with summaries it can see standing in for messages they cover where the app chooses, and entries with a numeric position inserted at their depth |

Entries keep file order within a slot, and everything in a slot is filtered by section 7. Every generation's System slot carries the session's `limits`, and fitting never drops them.

---

## 7. Knowledge

Some content is known only to certain characters.

- **Entries** follow Format 7.4.
- **History** follows the witness rule: a text or image part is known by its speaker, by the characters present after its message's changes, and, except on a root, by those present before them. `knownBy` on a part replaces this with exactly the listed characters; whispers and thoughts use it.
- **Summaries** follow Format 12.4; **pinned messages** follow their parts.

What a generation **can see**:

| Generation | Sees |
| --- | --- |
| a character, in `characters` mode | only what that character knows |
| the narrator, in `characters` mode | everything except content whose explicit `knownBy` doesn't name `narrator` |
| the single voice, in `narrator` mode | everything |

Knowledge applies only to what models receive; secrets between human players are out of scope.

---

## 8. Conformance

A conforming **app** reads files as a conforming reader (Format 17.1), follows Format 16, and does everything this document requires.

---

## Appendix A: Design decisions

| Decision | Instead of | Why |
| --- | --- | --- |
| Write-back carries only what a session changed | Rewriting every carried value from the path | Two sessions that continue one chronicle keep each other's progress; a key both changed takes the later write. |
| App actions unspecified: editing or deleting messages, continuing, previews, turn order | Procedures for each | A reader only ever sees the snapshot those actions leave, so the spec constrains the snapshot (summaries that match their messages) and leaves the actions to apps. |
| Story fixed, fitting a recorded baseline | Specifying only content, or only procedures | Outcomes replay exactly, and better fitting can come later. |
| Identical entry selection is a MUST | Leaving selection to each app | Every app gives the model the same lore for the same file and session, and the conformance suite can test selection. |
| Events in a single pass, once per round, one message per pass | Cascading rules | Deterministic, terminating, no accidental branches. |
| Witness knowledge, `["narrator"]` | Everyone knows everything; `[]` | Offstage characters miss events; no empty-list footgun. |
| Presence from openings, offstage summaries on mention | Everyone present, every summary | Casts and rosters scale. |
| One model-output payload; characters' replies carry only parts | Separate tracker and reply rules; state from every reply | Speakers, state and memories travel the same way from any transport, and a character's model never reads variable descriptions it mustn't know. |
| Model output adds story content only: newcomers without mechanics, entries without placement, no replacing characters, state names or directions | Accepting full characters and entries from a model | A reply, or text a player coaxes out of a model, can't add rules, recast a character or plant a standing instruction. |
| A model payload is read leniently, item by item | Discarding a payload that fails its schema | Models write `null` and empty values for optional fields; a bad newcomer or entry shouldn't lose a reply's text and changes. |
| `scene.present` filtered to the cast | Dropping a whole presence change for one unknown ID | Trackers often name someone the story never introduced; the rest of the change is still right. |
| A repeated write-back starts after the app's last one | Recording write-back points in the session | Keeps the file app-neutral; an app that receives a session without that point writes back from the root. |
| A root holds only the start's entries | Letting an extraction on a root add entries | In a session that continues a chronicle, later roots copy a root's entries and write-back skips them, so model entries there would be copied as memories and never written back. |
| Player edits on a new records-only message | Appending to the head when it is a player message | One place for every edit, and recorded firings never need re-evaluating. |
| Starting values exempt from `oneWay` | Preparing them like any change | An opening or a chronicle sets where the story starts, which may be below the variable's default. |
| Prompt slots, not a fixed order or history length | One mandated order; rules for trimming history | Apps keep prompt caches warm, and fit history to their models as they see fit; numeric positions count the history as sent. |
| SHA-256 rolls over seed, message and subject | A sequential generator | Order-independent, exact in JavaScript, fresh on regeneration. |
| Recorded activations; sticky not re-recorded | Recomputing history | Timers continue in any app, and run out. |
| Entries in the order worlds, characters, scenario; events scenario first | One owner order everywhere | Within a slot, entries read from the setting to the people to the scenario's own; the scenario runs the story, so its events come first. |
| One selection step, no recursion | Entries whose text activates other entries | Selection stays simple and order-independent; shared keys and `pull` reach related lore. |
| One conformance level | Core apps without mechanics | Every app plays every file the same way; a level for apps without mechanics only mattered for importing cards. |
