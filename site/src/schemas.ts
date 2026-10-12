// The published schemas: the current version's from schemas/, and each released version's from its tag, v0.12 for
// 0.12. A released version's schemas never change, so the build fails if the current one's differ from its tag.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { read, repo, root, spec } from "./sources.ts";

type Version = { version: string; files: Record<string, string> };

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

const files = (names: string[], text: (name: string) => string) =>
  Object.fromEntries(
    names
      .filter((n) => n.endsWith(".schema.json"))
      .sort()
      .map((n) => [basename(n), text(n)]),
  );

// Released versions, newest first, fetched from GitHub once: their tags never change.
let released: Version[] | undefined;
const fetchReleased = (): Version[] => {
  const remote = `${repo}.git`;
  const tags = git("ls-remote", "--tags", "--refs", remote).match(/(?<=refs\/tags\/)v\d+\.\d+$/gm) ?? [];
  const versions: Version[] = [];
  if (tags.length) {
    const dir = mkdtempSync(join(tmpdir(), "troupe-schemas-"));
    try {
      git("init", "-q", "--bare", dir);
      git("-C", dir, "fetch", "-q", "--depth=1", remote, ...tags.map((t) => `refs/tags/${t}:refs/tags/${t}`));
      for (const tag of tags) {
        const names = git("-C", dir, "ls-tree", "--name-only", tag, "schemas/").split("\n");
        versions.push({ version: tag.slice(1), files: files(names, (n) => git("-C", dir, "show", `${tag}:${n}`)) });
      }
    } finally {
      rmSync(dir, { recursive: true });
    }
  }
  return versions.sort((a, b) => b.version.localeCompare(a.version, "en", { numeric: true }));
};

// Every published version, newest first. Offline, astro dev serves the current version alone; a build fails, so a
// deploy never drops a released version.
export const versions = (): Version[] => {
  try {
    released ??= fetchReleased();
  } catch (e) {
    if (!import.meta.env.DEV) throw e;
    console.warn(`Serving only the current schemas: released ones need GitHub (${(e as Error).message.split("\n")[0]})`);
  }
  const { version } = spec();
  const current = files(readdirSync(join(root, "schemas")), (n) => read(`schemas/${n}`));
  const tagged = released?.find((v) => v.version === version);
  if (tagged && JSON.stringify(tagged.files) !== JSON.stringify(current)) {
    throw new Error(`schemas/ differs from tag v${version}: a released version's schemas never change`);
  }
  return tagged ? released! : [{ version, files: current }, ...(released ?? [])];
};
