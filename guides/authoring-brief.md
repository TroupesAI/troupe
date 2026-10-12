# Troupe authoring brief

One page for people and for LLMs asked to write Troupe files. Give it to a model whole, with the request. It is informative; [Troupe Format](../spec/format.md) is normative, and the [authoring guide](authoring.md) has patterns for bigger stories.

**A complete card:**

```json
{
  "troupe": "0.12",
  "kind": "bundle",
  "characters": [{
    "id": "mira",
    "name": "Mira",
    "description": "A sarcastic starship engineer.",
    "entries": [
      { "id": "ship", "keys": ["Kestrel"], "text": "The Kestrel is Mira's patched-up freighter." },
      { "id": "debt", "knownBy": ["mira"], "text": "Mira owes the Corvane syndicate money." }
    ]
  }],
  "scenarios": [{
    "id": "kestrel",
    "openings": [{ "id": "docked", "content": [{ "speaker": "mira", "text": "*She doesn't look up.* It's supposed to sound like that." }] }]
  }]
}
```

**Shapes.** IDs start with a lowercase letter and use only `a–z`, `0–9` and `_`, at most 64 characters. Openings belong to scenarios and are `{"id", "content"}`, or `{"id", "title"}` for one the model writes; `content` and event `message` are arrays of parts, `[{"speaker": "mira", "text": "…"}]`, never strings. `examples` is an array of exchanges, each an array of `{"speaker": "char" | "user" | id, "text"}`. Text is Markdown, never HTML; put a character's actions in italics in the speaker's own part.

**Macros.** `{{char}}` is the character the text belongs to and `{{user}}` the player's character. `{{state.bell}}` and `{{own.nerve}}` show values; `{{@kai}}` shows a name. Name other characters with `{{@kai}}` rather than writing "Kai", so renames and recasts keep working.

**Entries:** `{"id", "text"}` is always on. Add `keys` to activate on words, `position: "system"` for rules, `knownBy: ["id"]` for secrets or one character's instructions, `when` for conditions, `priority` (0–100, 100 never dropped).

**Scenarios** hold `openings` and, for stories, `cast` (an object without `character` is a player seat; the default is one seat and every character), `premise`, `entries`, `variables` and `events`.

**Variables** need `id`, `type` (`bool`, `int`, `number`, `string`, `enum` with `values`, or `set`) and `description`. Give `by: ["model"]` for values the story should update, and `of: "characters"` for one value per character. Read a scenario's variable as `state.bell`, a character's own as `own.nerve`, and another character's as `state.kai.nerve`.

**Events** need `id` and `when`. `set` takes plain values; `compute` takes CEL strings. Durations count rounds: one player message and the replies to it. An event `on: "player"` runs before the reply, so it can roll for what the player attempted and `direct` the reply.

**Traps:**

1. `set` takes plain values: `"set": {"hp": 10}`. Expressions go in `compute`: `"compute": {"hp": "state.hp - 1"}`.
2. A character's entries reach every character present unless `knownBy` is set. Put secrets in `knownBy` entries.
3. Inside CEL, strings use single quotes: `"when": "state.phase == 'escape'"`. Look up a computed key with brackets: `state.trust[char]`.
4. Numbers in CEL arithmetic match the variable's type: `state.trust.kai - 0.1` for a `number`, `state.hp - 1` for an `int`.
5. `chance` is 0–1, not a percentage. `weight` and `priority` are integers.
6. A numeric `position` is a depth in history, not an order; write `4`, not `"4"`.
7. Without `by`, only openings, events and chronicle values can change a variable, and players can change one with `ask`.
8. An entry, a variable and an event of the same owner can't share an ID.
9. `knownBy: ["narrator"]` is for the narrator alone; an explicit `knownBy` hides an entry from the narrator unless it lists `narrator`. Narrator-only clues belong to the scenario, because a character's entries only count while they are present.
10. Characters, worlds and scenarios can't be called `char`, `user`, `narrator`, `session`, `state`, `scene`, `players` or `own`, and a variable can't be called `scene` or `own`; no ID can be a CEL word such as `var`, `loop`, `function` or `package`.
11. Leave the player's character out unless the story defines it; then mark its cast member `player`.
12. Don't write `null`. Leave fields out.

Validate the result against `bundle.schema.json` and fix every error before returning it.
