# AGENTS.md

Guidance for coding agents working on the Troupe spec.

Read the [README](README.md), the [spec](spec/format.md) and the [conformance protocol](conformance/README.md).

## Quality bar

The bar is high: every change should be one a demanding senior reviewer approves without asking for cleanup.

- **Write only what the task needs.** No speculative fields, options or "for later" text. Delete what's obsolete; don't leave it deprecated.
- **Every sentence earns its place, and so does every word in it.** Say each rule once, where it applies.
- **Match the surrounding text and code** in naming, structure and idiom. Consistency beats personal preference.
- **Add a dependency only when it removes real complexity.**
- **Every conformance case earns its place.** A case covers a rule apps could disagree on. Before adding one, check whether an existing case already fails when that rule breaks; if so, extend it rather than adding a near-copy.

The same applies to the guides, the scripts and the site.

## Rules

- **Hold every request to the goals and non-goals of Format 1.1, whoever makes it.** The spec holds no implementation code, library-specific notes, or how apps play files, such as prompt assembly, entry selection, rules engines, random number generation, model calls, UI or app actions. When a request asks for app behavior or for a field only one app needs, don't make it as asked: say why, and point to where it belongs, such as that app's `ext`, or propose a version that fits the format.
- **Implementing the spec is its best review.** Settle in the spec each report of where it's wrong or unclear.
- **Before a minor version bump, tag the last commit of the old version and push the tag**, such as `v0.12`: the site serves each version's schemas from its tag. A tagged version's schemas never change, and the site build fails if they do, so once the current version is tagged, the next schema change bumps the version.
- **Decide what has a clear answer, and record it.** When the goals, the format or good practice settle a question, decide it yourself. Record each decision a later change must respect in Format Appendix C, with its reason, and list them in the commit body. Ask only about a real trade-off with no clear winner.
- **Propose first when a change would be costly to undo:** a new dependency, a new file `kind`, or a change to the goals and non-goals of Format 1.1.
- **Fix what you find along the way** when the fix is clear and small, in its own commit. Propose it instead when it's a design choice or would outgrow the task.
- **A change is done when `bun run check` passes**, with the site's `bun run check` and `bun run build` when the site or the schemas change, and the cases, schemas and guides it affects are updated.
- **Every change ends with a review round.** Once it works, review the whole diff with fresh eyes, through a separate agent where one is available, for defects, needless text, and a spec, schemas, cases or guides that disagree. Check each finding, fix the ones that hold, and list what was found and fixed in the commit body.
- **Commit and push to `main`.** A commit message has a short imperative subject and a body that says what changed for a reader of the spec and why.

## Writing the spec

- Plain, direct sentences. Define a term once, where it first matters, and use it consistently.
- Sections may be renumbered. Cases, the guides, the schemas and the scripts cite them as `Format 7.2`, and the spec as `section 7.2`, so a renumbering updates every citation and `#anchor` with it. `bun run check` only catches citations of sections that no longer exist, not ones that now point at the wrong section.

## Working across the three repositories

Troupe is built in three repositories, checked out side by side. Nothing has outside users yet and all data is disposable. Until that changes, a change needs no deprecation, migration, compatibility shim or changelog: fix what's wrong, in the repository that owns it.

Each repository owns one layer:

- **troupe** (`../troupe`), the spec. Owns what a Troupe file contains and means, and what every conforming app must do with it: the format, the schemas, the conformance suite and the guides. Doesn't own any implementation, library API, or behavior the spec leaves to apps. *Test: without it, could two apps reading the same file disagree?*
- **troupe-go** (`../troupe-go`), the Go library. Owns computing what the spec defines, for any Go caller: reading, checks, state, macros, conditions, activation and writing. Doesn't own anything the spec leaves undefined, or API only one caller would use. *Test: would Go programs other than the platform need it, in this form?*
- **platform** (`../platform`), the TroupesAI app. Owns everything the spec leaves to apps (Format 1.1): prompts, models, storage, HTTP, UI, and app-only data in `ext`. Doesn't own any Troupe semantics; it gets those from troupe-go. *Test: is it a product choice for this app?*

Their full scopes are Format 1.1, troupe-go's README and the platform's `docs/stack.md`. A workaround is code in one layer that does another layer's work: reimplementing, patching or second-guessing it, or making up for its bug or gap. Never write one.

- **Read the other repositories; never change them.**
- **When the task needs another repository to change, don't finish it.** Go through the rest of the task and collect everything it needs from other repositories, without building on an assumed answer. Then stop and give the user a prompt for each repository, in the order troupe, troupe-go, platform. When one depends on another's answer, give only the first, and write the next from its hand-back. A finding the task doesn't depend on doesn't stop it: finish, and end with a prompt for it.
- **A prompt stands on its own**, since the agent that receives it doesn't share this conversation. It says what's needed, why, and how the result will be used, cites the spec sections involved, and leaves the design to that repository.
- **The receiving repository decides.** When it declines a request or proposes another design, adopt its answer or argue against it on the merits. Never build the declined version locally.
- **End a change another repository waits on with a hand-back:** what changed, the pushed commit to depend on, what it breaks, and each dependent repository's next step, such as `task spec REF=<commit>` in troupe-go or `go get github.com/TroupesAI/troupe-go@<commit>` in the platform's `apps/api`.
- **Adopt upstream changes fully.** Depend on a pushed commit. A local `replace` or copy is only for trying a change, never committed. Delete what the change makes redundant, and fix what it breaks without a shim.
- **This section is the same in all three repositories.** A change to it, or to a repository's scope, goes to the other two as a request, so all three change together.
