# Troupe authoring brief

One page for people and for LLMs asked to write Troupe files. Give it to a model whole, with the request. It is informative; [Troupe Format](../spec/format.md) is normative, and the [authoring guide](authoring.md) has patterns for bigger stories.

**A complete card:**

```json
{
  "troupe": "0.14",
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

**Shapes.** IDs start with a lowercase letter and use only `a–z`, `0–9` and `_`, at most 64 characters. Openings belong to scenarios and are `{"id", "content"}`, or `{"id", "title"}` for one the model writes; `content` is an array of parts, `[{"speaker": "mira", "text": "…"}]`, never a string. `examples` is an array of exchanges, each an array of `{"speaker": "char" | "user" | id, "text"}`. Write text in Markdown, not HTML, and put a character's actions in italics in the speaker's own part.

**Macros.** `{{char}}` is the character the text belongs to and `{{user}}` the player's character. `{{state.bell}}` and `{{own.nerve}}` show values: a value with a label shows its label, and a character or location ID shows its name. `{{scene.location}}` and `{{scene.present}}` show where the scene is and who is there, and `{{pick::a::b}}` picks one option at random. Macros work in descriptions, summaries, examples, premises, briefings, notes, entry texts, openings and image `alt`. Every other field, such as a name, title, label or key, is used as written, and so are conditions and what players and models write.

**Entries:** `{"id", "text"}` is always on. Add `keys` to activate on words, `position: "system"` for rules, or `depth: N` to place the text N messages from the end of the history instead; `knownBy: ["id"]` for secrets or one character's instructions, `when` for conditions, `chance` (a percent, 0–100), `priority` (0–100, 100 never left out). `sticky`, `cooldown` and `turn` count rounds: one player message and the replies to it.

**Scenarios** hold `openings` and, for stories, `cast` (an object without `character` is a player seat; the default is one seat and every character), `premise`, `entries` and `variables`. An opening's `set` gives starting values: `{"scene.location": "vault", "state.bell": 11}`.

**Variables** need `id`, `type` (`bool`, `int`, `string`, `enum` with `values`, or `set`) and `description`. Numbers are integers, so use a scale such as 0–100. Give `by: ["model"]` for values the story should update and `by: ["player"]` for choices the players make, and `of: "cast"` for one value per character. Read a scenario's variable as `state.bell`, a character's own as `own.nerve`, another character's as `state.kai.nerve`, and one key as `state.trust.kai`.

**Traps:**

1. Everyone knows a character's entries unless `knownBy` is set. Put secrets in `knownBy` entries.
2. CEL uses `&&`, `||` and `!`, never `and`, `or` or `not`, and strings inside it use single quotes: `"when": "state.phase == 'escape' && !hit('guard')"`. Look up a computed key with brackets: `state.trust[char]`.
3. Keys in `set` are written as they are read: `"state.bell"`, `"state.kai.nerve"`, never `"bell"` or `"own.nerve"`.
4. Don't count on a value reaching the model by itself: show it in the text that needs it, such as an entry with `{{state.bell}}`.
5. `speaker`, `knownBy`, cast `character` and `players` take character IDs, not names: `"speaker": "elena"`, not `"Elena Voss"`.
6. `knownBy: ["narrator"]` is for the narrator alone; in `characters` mode, an explicit `knownBy` hides an entry from the narrator unless it lists `narrator`. Narrator-only clues belong to the scenario, because a character's entries only count while they are present.
7. Characters, worlds and scenarios can't be called `char`, `user`, `narrator`, `session`, `state`, `scene`, `players` or `own`, a variable can't be called `scene` or `own`, and no variable key can be `char` or `user`; no ID can be a CEL word such as `var`, `loop`, `function` or `package`.
8. Leave the player's character out unless the story defines it; then mark its cast member `player`.
9. Don't write `null`, and don't write `""` or `[]` for a field without a value: leave it out.

Validate the result against `https://docs.troupes.ai/schema/0.14/bundle.schema.json` and fix every error before returning it. The schema doesn't check that IDs are unique, conditions or references, so check by hand that IDs are unique, that every `when` and macro names declared variables, and that every ID named exists.
