// Checks the repository's documents and data:
//   - the schemas compile, and the examples and every complete bundle in the spec and guides validate;
//   - examples/ matches the examples in spec/format.md (--write-examples rewrites them);
//   - the spec version agrees across the documents, schema $ids and examples;
//   - every conformance case is valid JSON;
//   - relative Markdown links and #anchors resolve.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = resolve(import.meta.dir, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const problems: string[] = [];
const fail = (msg: string) => problems.push(msg);

// Schemas
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const schemaFiles = readdirSync(join(root, "schemas")).filter((f) => f.endsWith(".schema.json"));
for (const f of schemaFiles) ajv.addSchema(JSON.parse(read(`schemas/${f}`)), f);
const validator = (name: string) => {
  const v = ajv.getSchema(name);
  if (!v) throw new Error(`no schema ${name}`);
  return v;
};
for (const f of schemaFiles) validator(f); // compile every schema, including ones nothing below uses
const validate = (name: string, value: unknown, where: string) => {
  const v = validator(name);
  if (!v(value)) fail(`${where}: ${ajv.errorsText(v.errors, { dataVar: "" })}`);
};

// Examples: extracted from the code block after each heading of spec/format.md
const format = read("spec/format.md");
const block = (heading: string, lang: string): string => {
  const at = format.indexOf(heading);
  if (at < 0) throw new Error(`spec/format.md has no heading "${heading}"`);
  const start = format.indexOf("```" + lang + "\n", at) + lang.length + 4;
  return format.slice(start, format.indexOf("\n```", start)) + "\n";
};
const examples: Record<string, string> = {
  "elena-card.troupe.json": block("### 1.4 A first example", "json"),
  "mira-card.troupe.json": block("### B.1 A card with lore", "json"),
  "lantern-heist.troupe.json": block("### B.2 A story", "json"),
  "lantern-heist.troupe-session.jsonl": block("### B.3 Session", "text"),
  "mira.troupe-chronicle.json": block("### B.4 Chronicle", "json"),
};
const writeExamples = process.argv.includes("--write-examples");
for (const [name, text] of Object.entries(examples)) {
  const path = `examples/${name}`;
  if (writeExamples) writeFileSync(join(root, path), text);
  else if (!existsSync(join(root, path)) || read(path) !== text) fail(`${path} differs from spec/format.md (bun run examples)`);
  if (name.endsWith(".troupe.json")) validate("bundle.schema.json", JSON.parse(text), path);
  else if (name.endsWith(".troupe-chronicle.json")) validate("chronicle.schema.json", JSON.parse(text), path);
  else {
    const lines = text.trimEnd().split("\n").map((l) => JSON.parse(l));
    lines.forEach((line, i) => validate(i === 0 ? "session-header.schema.json" : "message.schema.json", line, `${path}:${i + 1}`));
  }
}
const extra = readdirSync(join(root, "examples")).filter((f) => !(f in examples));
if (extra.length) fail(`examples/ has files the spec doesn't define: ${extra.join(", ")}`);

// Every complete bundle written as a json block in the spec and guides
for (const doc of ["spec/format.md", "spec/play.md", "guides/authoring.md", "guides/character-cards.md", "guides/beginners.md"]) {
  const text = read(doc);
  for (const m of text.matchAll(/```json\n([\s\S]*?)\n```/g)) {
    let value: unknown;
    try {
      value = JSON.parse(m[1]);
    } catch {
      continue; // fragments such as a single entry or event
    }
    if ((value as { kind?: string })?.kind === "bundle") {
      const line = text.slice(0, m.index).split("\n").length;
      validate("bundle.schema.json", value, `${doc}:${line}`);
    }
  }
}

// Spec version
const version = format.match(/^\*\*Version (\d+\.\d+) /m)?.[1];
if (!version) fail("spec/format.md has no version line");
if (read("spec/play.md").match(/^\*\*Version (\d+\.\d+) /m)?.[1] !== version) fail("spec/play.md's version differs from spec/format.md's");
for (const f of schemaFiles) {
  const id: string = JSON.parse(read(`schemas/${f}`)).$id;
  if (!id.includes(`/schema/${version}/`)) fail(`schemas/${f}: $id ${id} isn't version ${version}`);
}
for (const [name, text] of Object.entries(examples)) {
  const first = JSON.parse(text.split("\n")[0].startsWith("{\"") ? text.split("\n")[0] : text);
  if (first.troupe !== version) fail(`examples/${name}: troupe is ${first.troupe}, not ${version}`);
}

// Conformance cases
for (const f of readdirSync(join(root, "conformance/cases"))) {
  if (!/^\d{3}-[a-z0-9-]+\.json$/.test(f)) fail(`conformance/cases/${f}: name isn't NNN-topic.json`);
  try {
    JSON.parse(read(`conformance/cases/${f}`));
  } catch (e) {
    fail(`conformance/cases/${f}: ${(e as Error).message}`);
  }
}

// Markdown links
const slug = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
const anchors = (path: string) => new Set([...read(path).matchAll(/^#{1,6} (.+)$/gm)].map((m) => slug(m[1])));
const markdown = ["README.md", "CONTRIBUTING.md", "SECURITY.md", "AGENTS.md", "CHANGELOG.md", "spec/format.md", "spec/play.md", "guides/implementers.md", "guides/authoring.md", "guides/character-cards.md", "guides/beginners.md", "conformance/README.md"];
for (const doc of markdown) {
  const text = read(doc).replace(/```[\s\S]*?```/g, "");
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const href = m[1];
    if (/^[a-z]+:/.test(href)) continue;
    const [file, anchor] = href.split("#");
    const target = file ? join(dirname(doc), file) : doc;
    if (!existsSync(join(root, target))) fail(`${doc}: link to missing ${href}`);
    else if (anchor && target.endsWith(".md") && !anchors(target).has(anchor)) fail(`${doc}: no heading for #${anchor} in ${target}`);
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`ok: ${schemaFiles.length} schemas, ${Object.keys(examples).length} examples, ${readdirSync(join(root, "conformance/cases")).length} cases, ${markdown.length} documents`);
