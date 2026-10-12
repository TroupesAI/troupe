// The repository's documents and how the site addresses them. Everything that reads them goes through this file.
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, resolve as resolvePath } from "node:path";
import { sectionNumber, slug } from "../../scripts/sections.ts";

export const site = "https://docs.troupes.ai";
export const repo = "https://github.com/TroupesAI/troupe";
// The repository: Astro runs in site/, and bundling moves this module, so import.meta.url won't do.
export const root = resolvePath("..");
export const read = (file: string) => readFileSync(join(root, file), "utf8");

export const sources = [
  { file: "README.md", route: "index", label: "Overview" },
  { file: "spec/format.md", route: "format", label: "Troupe Format" },
  { file: "guides/beginners.md", route: "guides/beginners", label: "Beginner's guide" },
  { file: "guides/authoring.md", route: "guides/authoring", label: "Authoring guide" },
  { file: "guides/authoring-brief.md", route: "guides/authoring-brief", label: "Authoring brief" },
  { file: "guides/character-cards.md", route: "guides/character-cards", label: "Character Card V2/V3" },
  { file: "conformance/README.md", route: "conformance", label: "Conformance" },
];

export const url = (route: string) => (route === "index" ? "/" : `/${route}/`);

// The documents are read on each use rather than once, so astro dev shows edits without a restart.

// The README as the home page: its first paragraph says what Troupe is, and its main part ends where its sections for
// the repository begin.
export const readme = (text = read("README.md")) => {
  const [, tagline, main] = text.match(/^# .+\n+(.+)\n([\s\S]*?)\n## Contributing\n/) ?? [];
  if (!main) throw new Error("README.md has no first paragraph or no Contributing section");
  return { tagline, main };
};

// From the spec's version line, "**Version 0.12 (draft)** · October 12, 2026".
export const spec = () => {
  const [, version, status] = read("spec/format.md").match(/^\*\*Version (\S+) \((\w+)\)\*\*/m) ?? [];
  if (!version) throw new Error("spec/format.md has no version line");
  return { version, status };
};

// A heading's id on the site is its section number when it has one, such as 7.2 or B.1, so links read like
// citations; other headings keep the GitHub anchor that the documents' own links use.
const anchor = (file: string, hash: string) => {
  const heading = [...read(file).matchAll(/^#{1,6} (.+)$/gm)].find((m) => slug(m[1]) === hash);
  if (!heading) throw new Error(`no heading for #${hash} in ${file}`);
  return sectionNumber(heading[1]) ?? hash;
};

// Where a link in one of the documents points on the site: a page, a schema, or the file on GitHub.
export const resolve = (href: string, from: string): string => {
  if (/^[a-z]+:/.test(href)) return href;
  const [path, hash] = href.split("#");
  const file = path ? normalize(join(dirname(from), path)).replace(/\/$/, "") : from;
  const source = sources.find((s) => s.file === file);
  if (source) return `${path ? url(source.route) : ""}${hash ? `#${anchor(file, hash)}` : ""}`;
  if (file === "schemas") return "/schema/";
  if (/^schemas\/[^/]+\.json$/.test(file)) return `/schema/${spec().version}/${file.slice("schemas/".length)}`;
  if (existsSync(join(root, file))) {
    return `${repo}/${statSync(join(root, file)).isDirectory() ? "tree" : "blob"}/main/${file}${hash ? `#${hash}` : ""}`;
  }
  throw new Error(`${from}: link to missing ${href}`);
};

// A document as Markdown with every link absolute, to read away from the site.
export const markdown = ({ file, route }: (typeof sources)[number]) =>
  read(file)
    .split(/(^```[\s\S]*?^```$)/m)
    .map((part, i) =>
      i % 2 ? part : part.replace(/\]\(([^)\s]+)\)/g, (_, href) => `](${new URL(resolve(href, file), site + url(route))})`),
    )
    .join("");
