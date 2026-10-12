# Troupe implementer's guide

This guide is informative. It collects advice for apps that show and play Troupe files: how to present things and how to run the parts the specification leaves to the app. Nothing here affects interoperability. [Troupe Format](../spec/format.md) and [Troupe Play](../spec/play.md) are the normative documents, and where this guide seems to disagree with them, they win.

## Characters

- **Who speaks next** is up to the app. A good default: prefer present characters named in the last message, and let each model-played character speak at most once per player message before returning control.

## Authoring

- **YAML.** Editors may let authors write a bundle in YAML that maps one to one onto JSON, for block scalars and comments. Export and share the JSON.

## Telling people what's wrong

- **Diagnostics.** Show authors the checks a reader reports (Format 17.2), especially unknown macros, which are left as written. Also show conditions that fail at runtime, which count as false (Format 11.2).
- **Exporting** to another format loses data ([Character Card V2/V3 and Troupe](character-cards.md)). Show people what was left out.

## Play

- **The end.** Show people when an event ends the story on their path (Format 9). They may still continue.
- **Time.** Set the session's `timezone` from the player's device, so `hour` and `weekday` match where they are (Format 11.1).
- **Rolls.** Every roll follows from the seed and message IDs (Play 4). If players shouldn't predict or reroll outcomes, assign message IDs on the server and keep the seed from them during play.
- **State.** Cache state however you like; it is always the bundle's starting values plus the recorded changes (Play 3.2).
- **Narrator mode.** The single voice sees everything (Play 7). Mark content that only some characters know, such as "Known only to Kai:", so the model keeps secrets in character.

## Trackers and model output

- **A separate tracker call** works best for state, and it can use a cheaper model than the story (Play 3.4).
- **When to extract.** Run the tracker after every player and model message. Events `on: "player"` that read model-set values, such as dice checks, see the player's action only if the tracker has run on it.
- **Plain or structured replies.** Most chats need only plain replies. In `characters` mode each reply is one character's turn, so its speaker is known, and actions and scene description stay inside the text, usually in italics. A structured reply is needed only when one reply voices several characters, as in `narrator` mode, or marks content such as a private thought with `knownBy`. A character's reply carries no state (Play 3.4), so state comes from a tracker.

## Prompts

- **Caching.** Troupe fixes what each prompt slot holds, not the order of slots (Play 6). Sending slots that change rarely before those that change often keeps prompt caches warm.

## Chronicles

- **Ownership.** Let people read, edit and delete every memory and value in their chronicles.
- **History.** Keep earlier versions of a chronicle if people may want to undo a write-back; the file holds only the current one.
