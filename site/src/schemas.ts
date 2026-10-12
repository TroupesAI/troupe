// The published schemas: the current version's from schemas/, and each released version's from its tag, v0.12 for
// 0.12. A released version's schemas never change, so the build fails if the current one's differ from its tag.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { read, repo, root, spec } from "./sources.ts";

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });

const files = (names: string[], text: (name: string) => string) =>
  Object.fromEntries(
    names
      .filter((n) => n.endsWith(".schema.json"))
      .sort()
      .map((n) => [basename(n), text(n)]),
  );

const remote = `${repo}.git`;
const tags = git("ls-remote", "--tags", "--refs", remote).match(/(?<=refs\/tags\/)v\d+\.\d+$/gm) ?? [];
export const versions: { version: string; files: Record<string, string> }[] = [];
if (tags.length) {
  const dir = mkdtempSync(join(tmpdir(), "troupe-schemas-"));
  git("init", "-q", "--bare", dir);
  git("-C", dir, "fetch", "-q", "--depth=1", remote, ...tags.map((t) => `refs/tags/${t}:refs/tags/${t}`));
  for (const tag of tags) {
    const names = git("-C", dir, "ls-tree", "--name-only", tag, "schemas/").split("\n");
    versions.push({ version: tag.slice(1), files: files(names, (n) => git("-C", dir, "show", `${tag}:${n}`)) });
  }
  rmSync(dir, { recursive: true });
}
versions.sort((a, b) => b.version.localeCompare(a.version, "en", { numeric: true })); // newest first

const current = files(readdirSync(join(root, "schemas")), (n) => read(`schemas/${n}`));
const tagged = versions.find((v) => v.version === spec.version);
if (!tagged) versions.unshift({ version: spec.version, files: current });
else if (JSON.stringify(tagged.files) !== JSON.stringify(current)) {
  throw new Error(`schemas/ differs from tag v${spec.version}: a released version's schemas never change`);
}
