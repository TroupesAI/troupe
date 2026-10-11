# Troupe implementer's guide

This guide is informative. It collects advice for apps that show and play Troupe files: how to present things and how to run the parts the specification leaves to the app. Nothing here affects interoperability. [Troupe Format](../spec/format.md) and [Troupe Play](../spec/play.md) are the normative documents, and where this guide seems to disagree with them, they win.

## Characters

- **Images.** Name a character's `images` `neutral`, `happy`, `sad`, `angry`, `surprised`, `afraid` and `embarrassed`, optionally grouped as `<set>/<name>`. When a character has no image for the name you want, fall back to `neutral` in the same set, then `neutral`, then `avatar` (Format 4).
- **Who speaks next** is up to the app (Play 2.3). A good default: prefer present characters named in the last message, and let each model-played character speak at most once per player message before returning control.

## Telling people what's wrong

- **Diagnostics.** Show authors the checks a reader reports (Format 17.2), especially unknown macros, which are left as written, and conditions that fail at runtime, which count as false.
- **Missing extensions.** A file that `requires` an extension the app lacks can't be played (Format 15). Show its metadata and explain what's missing.
- **Mechanics in a Core app.** A Core app refuses files that use mechanics (Play 8.1). Show the file anyway and explain why it can't be played.
- **Exporting** to another format loses data (Format Appendix E.2). Show people what was left out.

## Play

- **The end.** Show people when an event ends the story on their path (Format 9). They may still continue.
- **Time.** Set the session's `timezone` from the player's device, so `hour` and `weekday` match where they are (Format 11.1).
- **State.** Cache state however you like; it is always the bundle's starting values plus the recorded changes (Play 3.2).
- **Narrator mode.** The single voice sees everything (Play 7). Mark content that only some characters know, such as "Known only to Kai:", so the model keeps secrets in character.

## Trackers and model output

- **A separate tracker call** works best for state, and it can use a cheaper model than the story (Play 3.4).
- **When to extract.** Run the tracker after each model message. Running it less often, or after player messages too, also works.
- **Plain or structured replies.** Most chats need only plain replies. In `characters` mode each reply is one character's turn, so its speaker is known, and actions and scene description stay inside the text, usually in italics. A structured reply is needed only when one reply voices several characters, as in `narrator` mode, or marks content such as a private thought with `knownBy`. State can still come from a tracker either way.

## Prompts

- **Caching.** Troupe fixes what each prompt slot holds, not the order of slots (Play 6). Sending slots that change rarely before those that change often keeps prompt caches warm.

## Chronicles

- **Ownership.** Let people read, edit and delete every memory and value in their chronicles.
- **History.** Keep earlier versions of a chronicle if people may want to undo a write-back; the file holds only the current one.
