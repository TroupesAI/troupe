# Troupe Play

**Version 0.11 (draft)** · October 11, 2026

This document defines how an app plays Troupe files: how it starts and continues a session, computes state, runs events, rolls dice, activates entries, fills a prompt and applies knowledge. Apps that follow it give the model the same inputs and record the same outcomes for the same files, seed and message IDs. [Troupe Format](format.md) defines the files and comes first.

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

Troupe separates **what a story is** (content, state, knowledge and recorded outcomes) from **how an app fits it to a model** (which entries to activate, where to place them, what to leave out). The first is fixed by this specification. The second has a deterministic baseline that apps follow when they create a message (sections 5 and 6). Because every outcome is recorded, later versions can add better activation and fitting methods without changing how existing sessions replay.

### 1.2 Conventions

Format 2 applies here, including requirement keywords. "Format 7.2" means section 7.2 of Troupe Format; a section number alone means this document. Normative references are listed in Format Appendix H. The [implementer's guide](../guides/implementers.md) gives informative advice.

---

## 2. Sessions

### 2.1 Starting

1. Generate a `seed` of at least 96 random bits, such as 16 bytes in base64url.
2. Fill the player seats; rename brought-in characters, worlds or locations whose IDs clash (Format 12.5), except characters meant as replacements (Format 12.2).
3. Ask the questions of variables with `ask`.
4. Create a root message for the chosen opening, `from: "system"`, with `opening` set and the content copied as written, or empty for an opening without `content`. It records, in order: the chronicles' values in one `{"by": "rules", "set": …}` change, when the session continues chronicles (section 2.2); a change `{"by": "rules", "set": …}` with the opening's `set` and the starting `scene.present` (Format 6.3); and a change `{"by": "player", "set": …}` with the answers. Without an opening, the player's first message is the root and carries the chronicles' values first, then its own changes, then the answers; when a chronicle character with no bundle character joins, the chronicles' change also sets `scene.present` (section 2.2).
5. Evaluate events at the root. Opening macros see their results.
6. For an opening without `content`, generate the first model message as a child of the root (or of the root's event message), for a present model-played character chosen by the app, or the narrator.

Swiping to another opening creates another root, starting again from step 4.

### 2.2 Continuing chronicles

- **Starting.** A session that continues a chronicle lists it in `chronicles` and copies the chronicle's `character` into the header's `characters`, where it replaces the bundle character with the same ID (Format 12.2). The character keeps that ID for life, so bundle references to it still work. A chronicle character with no bundle character joins the cast and is present at the start: an opening's change includes it (Format 6.3), and without an opening the chronicles' change on the root sets `scene.present` to the starting presence (section 3.2) plus every such character, in cast order. `persona` is offered as the player's character for the first seat, and the chronicle's `limits` are added to the session's `lines` and `veils`, without duplicates, in order. Its `memories` are copied onto the root as session entries, a memory without `knownBy` getting the character's, and the `values` of all its chronicles are recorded on the root in one `{"by": "rules"}` change, before any other change (section 2.1). The session never needs the chronicle file to replay.
- **Persona keys.** Keys of carried keyed variables that name the persona are rewritten to the session's first player's character, and back to the persona's ID when written back.
- **Writing back.** Apps write back to the chronicle when they choose, such as when a conversation pauses, by rewriting it from the head path. `values` keeps only carried keys, and takes the latest value of each carried key that a change on the path set. Each carried session entry on the path, the latest version of its ID, replaces the memory with that ID or is added after the others, and with `disabled` removes it; root entries unchanged from how the start copied them are skipped. With several chronicles in a session, each has a distinct character; a carried entry goes to the chronicle of every character in its `knownBy`, or to all of them without `knownBy`, and clashing entry IDs from different chronicles are renamed on the root.

### 2.3 Turns

Who speaks next is up to the app. Apps MAY let a person take over a model-played character (Format 12.2).

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

1. every variable's initial value; no location; the whole cast present except the joiners (Format 12.2);
2. the `changes` of every message on the path from the root to that message, in path order, and within a message in array order.

Playing never modifies a bundle: state is the bundle's starting values plus the changes recorded in the session. Derived variables are computed from that state when read; one whose expression fails at runtime is absent. Readers apply recorded changes and never re-run events or trackers on load. The state at a message includes its own changes. Branches never share state. Keys, values and validity are defined in Format 8.5.

### 3.3 Recording changes

Before recording, apps prepare each value, using the state just before the change:

1. normalize a set: remove duplicates, then order listed members as declared;
2. for `by: "model"`, limit the difference from the current value to `maxStep`;
3. for `oneWay` variables, keep the current value instead of a move backward; a set keeps its current members and accepts additions;
4. round `number` values to the nearest double to the decimal that ECMAScript `Number.prototype.toFixed(6)` produces;
5. clamp to `min` and `max`.

Then they drop each key whose value is still invalid, or whose channel isn't allowed: `player` needs `by` to include `player` or the variable to have `ask`; `model` needs `by` to include `model`; scene keys accept every channel. Dropped keys produce a warning; the rest are kept. Within a message, changes are recorded in the order they happen: on a root, the chronicles' values, the opening's change, then the answers (section 2.1); on any message, player and model changes before the changes of the events they trigger.

**Readers** re-apply steps 1, 4 and 5 when loading and drop invalid keys, but don't re-check channels, `maxStep` or `oneWay`, so history survives later edits to the bundle.

**Player edits** to state are recorded on the head if it is a player message, else on a new `from: "system"` child of the head with empty `content`. Events are then evaluated at that message.

**Events.** At each root, after each player or model message once its player and model changes are recorded, after player edits, and after a player's calls (section 3.4):

1. Events in use are evaluated once each, in the order scenario, worlds, characters (cast order), each in array order, in a single pass, skipping events whose `on` doesn't match the triggering message; a root made from an opening, and a records-only message, match neither. Each sees the state, firings and counts left by those before it. Messages added by events don't trigger evaluation.
2. An event fires when its `when` is true; it isn't `once` with an earlier firing on the path; its distance from its last firing is greater than `cooldown`, so it fires at most once per round (an event that fired after a player message can't fire again after the replies in that round); and its `chance` roll succeeds.
3. A firing chooses an outcome by a weighted roll, if there are `outcomes`. The event's `set` and `compute`, then the outcome's, produce new values; later keys replace earlier ones. Every `compute` expression sees the state before this firing. Values are prepared as above.
4. The firing is recorded on the triggering message as `{"by": "rules", "event": name, "outcome": index, "set": {…}}`, even when `set` is empty.
5. The `message` parts of all firings in the pass, event before outcome, form one `from: "system"` message, a child of the triggering message, which becomes the head.
6. `direct` texts go into the System slot of every prompt built while no model message lies on the path after the triggering message. `end` finishes the story on that path.

### 3.4 Model output

Models may produce state as well as story. One payload carries it, through either of two transports. Its schema is `model-output.schema.json` (Format Appendix A):

```ts
interface ModelOutput {
  parts?: { speaker?: string; text: string; knownBy?: string[] }[];   // a reply's parts
  changes?: Record<string, Json>;  // keys that changed, with new values
  reason?: string;
  entries?: Entry[];               // session entries to add, such as memories
  characters?: Character[];        // newcomers who appeared, with a change adding them to scene.present
  calls?: { event: string; args?: Record<string, Json> }[];   // callable events invoked
}
```

- **Tracker.** A separate model call or a tool call reads the messages since the last extraction on the path and returns everything but `parts` and `calls`. Its input is, for each variable whose `by` includes `model`, its key, type, `values` or range, `description` and current value; the scene, with location names and the cast; entries placed in `tracker` whose `when` holds; and the messages, with full knowledge.
- **Structured reply.** The story model returns the whole payload in its reply.
- **Plain reply.** Without structure, the reply is one text part whose `speaker` is the message's `char`, or none for the narrator. Apps MUST NOT guess `knownBy` from plain text.

Calls need a transport that returns results during generation, such as tool calling. A model's call is evaluated against the state of the message being built, after earlier calls, and recorded there like a firing, with `args` (`{}` when it has no params); `args` marks a call. The model receives the firing's `direct` texts (event, then outcome) and the changed values as the result. Call directions are only ever results: they never enter later prompts, so a structured reply, whose calls are evaluated after it with its `changes` first, gets none, and authors put follow-ups in `message`. The `message` parts of a model's calls form one `from: "system"` message after the model message, before any message from the event pass that follows it. A player's call is recorded on the player's message, or on a records-only system message, and events are then evaluated there; the call's `message` parts and the pass's form one `from: "system"` message after it, calls first. `{{args.<id>}}` in a call's message is resolved when the message is recorded, since stored messages keep no arguments. Apps record `changes` as `{"by": "model", …}`, prepared as in section 3.3, on the newest message covered; `entries` as session entries on the same message; and `characters` in the header. Speakers and `knownBy` IDs that name no character in the session are dropped. An extraction that finds nothing SHOULD record `{"by": "model", "set": {}}`, which marks where the next one starts. Failure is not fatal. Events `on: "model"` wait for the extraction.

A condition written in plain words, such as "Elena has told the crew about the key", is a `bool` variable with `by: ["model"]` and `oneWay`, whose description is that sentence. Once set, it stays set and replays exactly.

### 3.5 Edits and regeneration

Changes are history. When a message's content is edited, the app SHOULD re-derive that message's `model` and `rules` changes, and the event message they add, and keep its `player` changes and the calls a player made; other messages keep their records. A regenerated message is a new sibling with its own changes and rolls. Continuing a stopped message appends to it, keeping its ID and rolls.

---

## 4. Randomness

Every random choice is a roll that any app reproduces exactly:

```text
roll(purpose, seed, messageId, subject):
  d = SHA-256(UTF-8("troupe-roll-1\n" + purpose + "\n" + seed + "\n" + messageId + "\n" + subject))
  return d[0]·2^40 + d[1]·2^32 + d[2]·2^24 + d[3]·2^16 + d[4]·2^8 + d[5]
```

The result is below 2^53, so JavaScript computes it exactly without BigInt.

| Use | Purpose | Message | Subject | Result |
| --- | --- | --- | --- | --- |
| Entry `chance` | `chance` | the message being built | entry reference | passes if `roll < chance · 2^48` |
| Group pick | `group` | the message being built | `<owner>/<group>` | weighted pick |
| Event `chance` | `event` | the triggering message | event name | passes if `roll < chance · 2^48` |
| Event outcome | `outcome` | the triggering message | event name | weighted pick |
| `roll(n)` | `dice` | the triggering message | `<event name>/<part>/<key>/<k>`: key is the compute key as written; part is `e` for the event or the outcome index; *k* numbers the `roll` calls in that expression by where they start, from 0 | `roll mod n + 1` |
| `{{pick}}` | `pick` | `""` | the options joined by `::`, then `#` and the macro's index among the picks in that field, from 0 | option `roll mod count` |

- **`seed`** is the session's. Apps MUST assign a message's ID before building its prompt. Continuing a message keeps its ID, so its rolls repeat; regenerating creates a new ID and new rolls.
- **Weighted pick:** with candidates in order and total integer weight *W*, let `t = roll mod W`; pick the first candidate whose running total of weights exceeds `t`.
- `chance · 2^48` is exact in double precision, so `chance: 1` always passes and `0` never does.
- Identical picks in different fields agree, by design.
- A callable event invoked more than once on the same message appends `#<k>` to the end of each subject, where *k* counts the event's earlier valid recorded calls on that message, from the second call on.

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

An entry's scanned text is built from the last `scanDepth` messages on the path that aren't hidden and have content, newest first. Each text part, and each audio part with a `transcript` taken as its text, that the generation can see, in array order, contributes `<speaker name>: <text>`, or its text when it has no speaker, with comments removed and author macros resolved. Contributions are joined with `\n`. Reasoning, image, tool and untranscribed audio parts are never scanned. A key that names a character therefore matches whenever that character speaks.

### 5.3 Matching

Matching works on Unicode scalar values, with scanned text and plain keys normalized to NFC. Apps SHOULD use Unicode 15.1 or later; the conformance suite tests only characters whose properties have been stable since 15.1.

- **Case:** comparison uses simple case folding (statuses C and S of `CaseFolding.txt`), as JavaScript regular expressions with the `iu` flags and Go's `unicode.SimpleFold` do.
- **Plain keys** match where no letter, digit or mark (General Categories L, N and M) directly touches either end of an occurrence. Keys containing Han, Hiragana, Katakana, Hangul, Thai, Lao, Khmer, Myanmar or Tibetan characters match anywhere.
- **Regex keys** are compiled unchanged as RE2 patterns, case-insensitive unless the pattern clears the flag, and match anywhere.

### 5.4 Activation records

Each new model message records the entries that **activated** for it in `activated`, in file order. For a recorded entry, *d* is the distance from the latest message recording it to the message being built.

- **Sticky:** if *d* ≤ `sticky`, the entry is kept without needing to match.
- **Cooldown:** if `sticky` < *d* ≤ `sticky` + `cooldown` (an unset `sticky` counts as 0), it can't activate.
- **Once:** an entry recorded anywhere on the path can't activate again.

Entries kept by `sticky` are not recorded again, so stickiness runs out.

### 5.5 Steps

1. **Sticky.** Candidates kept by `sticky` are selected unless their `when` is false, in which case they remain candidates for step 2. If several share a group, the highest `priority` stays, ties broken by file order; the others are excluded for this message.
2. **Passes.** Selection runs in up to three passes. In pass 1, an entry's **text to match** is its scanned text. In later passes it is its scanned text, a newline, and the **chain text**: the resolved texts, in file order and joined with newlines, of every entry with `chain` selected before the pass began. Pass 2 runs if step 1 or pass 1 selected an entry with `chain`; pass 3 runs if pass 2 did. Each pass applies four phases to every candidate not yet selected or excluded, each phase finishing before the next:
   1. **Match.** A candidate matches if a key matches its text to match. An entry without `keys` or `pull` matches in every pass.
   2. **Filter.** A matching candidate whose `when` is false waits for the next pass. One in cooldown, `once` and already recorded, or failing its `chance` roll is excluded.
   3. **Group.** For each group of an owner with no selected entry, the remaining candidates with the highest `priority` compete, and one wins by a weighted group roll; the group's other remaining candidates are excluded. Candidates of a group that already has a selected entry are excluded.
   4. **Select.** The remaining candidates are selected.
3. **Fit.** If space runs out, the app drops entries below priority 100, lowest `priority` first, ties broken by dropping later entries in file order. It never drops priority-100 entries; if they don't fit, generation fails. Fitting never re-rolls. How an app shortens examples and history is its own choice.

The app then records the entries selected in steps 1 and 2 that survived step 3, except those kept by `sticky`, together with any entries pulled for the message. Previews and other prompts that don't create a model message record nothing. Continuing a message reuses its records.

### 5.6 Pulling

Entries with `pull` are retrieved when relevant, by either of two methods an app MAY offer: the model sees a catalog of their titles and requests entries by title, for example through a tool; or the app finds entries by similarity search over titles and texts. Only entries the generation can see, that are not already selected, and whose `when` holds, with `hit()` checking their scanned text, are eligible. A pulled entry's text reaches the model, and the entry is recorded in `activated`. In apps that offer neither method, entries with `pull` activate only through their `keys`.

---

## 6. Prompt assembly

Troupe defines what goes into a prompt and in which slot; formatting, mapping to model roles and the order of slots are up to the app.

| Slot | Contents, in order |
| --- | --- |
| **System** | the app's own prompt; the session's `limits` (Format 12.4); selected entries placed in `system`; event directions (section 3.3) |
| **Setting** | the premise; world descriptions; the current location and its parents |
| **People** | present model-played characters, then the character being generated for if absent: description and cast `notes`; the players' characters; offstage cast characters whose name or alias, as a plain key, matches the scanned text (section 5.2) of the last 4 messages, as the generation can see it: their `summary`, a character without one contributing nothing; dialogue examples of the present model-played characters and the character being generated for |
| **Context** | selected entries placed in `context`; pinned messages |
| **History** | messages on the path with parts the generation can see, with summaries it can see standing in for messages they cover where the app chooses, and entries with a numeric position inserted at their depth |

Entries keep file order within a slot, and everything in a slot is filtered by section 7. Apps MUST apply the session's `limits` to every generation in the session, media included, in the System slot and in the app's own wording, and never drop them to save space. Conformance covers what each slot holds and its order, not the order of slots.

---

## 7. Knowledge

Some content is known only to certain characters.

- **Entries** are known by their `knownBy`, or by everyone without it. `["narrator"]` means only the narrator.
- **History** follows the witness rule: a text, image or audio part is known by its speaker, by the characters present after its message's changes, and, except on a root, by those present before them. `knownBy` on a part replaces this with exactly the listed characters; whispers and thoughts use it.
- **Summaries** follow Format 12.4; **pinned messages** follow their parts.

What a generation **can see**:

| Generation | Sees |
| --- | --- |
| a character, in `characters` or `mixed` mode | only what that character knows |
| the narrator, in `characters` or `mixed` mode | everything except content whose explicit `knownBy` doesn't name `narrator` |
| the single voice, in `narrator` mode | everything |

Knowledge limits what models see, never what people see; secrets between human players are out of scope.

---

## 8. Conformance

### 8.1 Levels

- **Core** apps implement everything except **mechanics**: `variables`, `events`, and opening `set` keys other than `scene.location` and `scene.present`. Core includes `when`, `hit()`, CEL and the scene, so imported character cards and lorebooks play in Core. Carried values are mechanics; a Core app MAY continue a chronicle, ignoring its values. It records no changes to them, so writing back leaves them as they were.
- **Full** apps also implement mechanics.

A Core app MUST refuse to play a file that uses mechanics, other than a chronicle's carried values. Pulling is optional at both levels. An app without multiplayer lets one person control every player seat.

### 8.2 Requirements

A conforming **app** reads files as a conforming reader (Format 17.1), and also selects entries, computes rolls, fills prompt slots, applies knowledge rules and the session's `limits`, records the scene, keeps player and model text literal and follows Format 16; a Full app also computes and records state and evaluates events, all exactly as this document describes.

---

## Appendix A: Design decisions

| Decision | Instead of | Why |
| --- | --- | --- |
| Story fixed, fitting a recorded baseline | Specifying only content, or only procedures | Outcomes replay exactly, and better fitting can come later. |
| Identical entry selection is a MUST | Leaving selection to each app | Lorebooks behaving differently in every app is the most common complaint about today's cards. |
| Events in a single pass, once per round, one message per pass | Cascading rules | Deterministic, terminating, no accidental branches. |
| Witness knowledge, `["narrator"]` | Everyone knows everything; `[]` | Offstage characters miss events; no empty-list footgun. |
| Presence from openings, offstage summaries on mention | Everyone present, every summary | Casts and rosters scale. |
| One model-output payload | Separate tracker and reply rules | Speakers, state and memories travel the same way from any transport. |
| Prompt slots, not a fixed order | One mandated order | Apps keep prompt caches warm with long contexts. |
| SHA-256 rolls over seed, message and subject | A sequential generator | Order-independent, exact in JavaScript, fresh on regeneration. |
| Recorded activations; sticky not re-recorded | Recomputing history | Timers continue in any app, and run out. |
| Batch passes; cumulative chain text | Per-entry loops, grouping after chaining | Order-independent selection; losing entries never activate others. |
| Core plays cards; Full adds mechanics; partial apps refuse | One level, or fallbacks | Simple apps are easy and still play imported cards; no app tells a different story. |
