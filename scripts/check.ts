// Checks the repository's documents and data:
//   - the schemas compile, and the examples and every complete bundle in a Markdown document validate;
//   - examples/ and the README's first example match the examples in spec/format.md (--write-examples rewrites examples/);
//   - every TypeScript interface in the spec lists exactly its schema's properties;
//   - the spec version agrees across the documents, schema URLs, examples, bundles in Markdown and cases;
//   - every conformance case is named <area>/<topic>.json, matches conformance/case.schema.json, and the files it names exist,
//     and its check, chronicle and parse tests expect SCHEMA exactly when the schemas reject their input;
//   - relative Markdown links and #anchors resolve, and every "Format N.N" or "Play N.N" names a section.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = resolve(import.meta.dir, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const problems: string[] = [];
const fail = (msg: string) => problems.push(msg);
const markdown = (readdirSync(root, { recursive: true }) as string[])
  .filter((f) => f.endsWith(".md") && !/^(node_modules|\.git)\//.test(f))
  .sort();

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
  const next = format.indexOf("\n#", at + heading.length);
  const fence = format.indexOf("```" + lang + "\n", at);
  if (fence < 0 || (next >= 0 && fence > next)) throw new Error(`spec/format.md has no ${lang} block after "${heading}"`);
  const start = fence + lang.length + 4;
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
const readmeCard = read("README.md").match(/```json\n([\s\S]*?\n)```/)?.[1];
if (readmeCard !== examples["elena-card.troupe.json"]) fail("README.md: the first example differs from Format 1.4's");
const extra = readdirSync(join(root, "examples")).filter((f) => !(f in examples));
if (extra.length) fail(`examples/ has files the spec doesn't define: ${extra.join(", ")}`);

// Every complete bundle written as a json block in a Markdown document; sessions and chronicles there too, for their version
const docBundles: { where: string; troupe?: string }[] = [];
for (const doc of markdown) {
  const text = read(doc);
  for (const m of text.matchAll(/```json\n([\s\S]*?)\n```/g)) {
    let value: unknown;
    try {
      value = JSON.parse(m[1]);
    } catch {
      continue; // fragments such as a single entry or event
    }
    const kind = (value as { kind?: string })?.kind;
    if (kind === "bundle" || kind === "session" || kind === "chronicle") {
      const line = text.slice(0, m.index).split("\n").length;
      if (kind === "bundle") validate("bundle.schema.json", value, `${doc}:${line}`);
      docBundles.push({ where: `${doc}:${line}`, troupe: (value as { troupe?: string }).troupe });
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
for (const b of docBundles) if (b.troupe !== version) fail(`${b.where}: troupe is ${b.troupe}, not ${version}`);
if (!read("README.md").includes(`v${version} draft`)) fail(`README.md: the status line doesn't say v${version}`);
for (const doc of [...markdown, ...Object.keys(examples).map((n) => `examples/${n}`)])
  for (const m of read(doc).matchAll(/troupes\.ai\/schema\/(\d+\.\d+)\//g))
    if (m[1] !== version) fail(`${doc}: schema URL for version ${m[1]}, not ${version}`);

// TypeScript interfaces and schemas list the same properties
const schemaOf = (file: string, ...path: string[]) =>
  path.reduce((o: any, k) => o[k], JSON.parse(read(`schemas/${file}`))) as { properties?: Record<string, unknown> };
const interfaces: Record<string, ReturnType<typeof schemaOf>> = {
  Bundle: schemaOf("bundle.schema.json"),
  Character: schemaOf("bundle.schema.json", "$defs", "character"),
  Line: schemaOf("bundle.schema.json", "$defs", "line"),
  World: schemaOf("bundle.schema.json", "$defs", "world"),
  Location: schemaOf("bundle.schema.json", "$defs", "location"),
  Scenario: schemaOf("bundle.schema.json", "$defs", "scenario"),
  CastMember: schemaOf("bundle.schema.json", "$defs", "castMember"),
  Opening: schemaOf("bundle.schema.json", "$defs", "opening"),
  Entry: schemaOf("bundle.schema.json", "$defs", "entry"),
  Variable: schemaOf("bundle.schema.json", "$defs", "variable"),
  Event: schemaOf("bundle.schema.json", "$defs", "event"),
  Outcome: schemaOf("bundle.schema.json", "$defs", "outcome"),
  Limits: schemaOf("bundle.schema.json", "$defs", "limits"),
  SessionHeader: schemaOf("session-header.schema.json"),
  Message: schemaOf("message.schema.json"),
  Change: schemaOf("message.schema.json", "$defs", "change"),
  Summary: schemaOf("message.schema.json", "properties", "summary"),
  Chronicle: schemaOf("chronicle.schema.json"),
  ModelOutput: schemaOf("model-output.schema.json"),
};
const specText = format + read("spec/play.md");
for (const [name, schema] of Object.entries(interfaces)) {
  const body = specText.match(new RegExp(`^interface ${name} \\{\n([\\s\\S]*?)\n\\}`, "m"))?.[1];
  if (!body) {
    fail(`spec: no interface ${name}`);
    continue;
  }
  const fields = [...body.matchAll(/^  (\$?\w+)\??:/gm)].map((m) => m[1]).sort();
  const props = Object.keys(schema.properties ?? {}).sort();
  if (fields.join() !== props.join()) fail(`spec: interface ${name} lists ${fields.join(", ")}; its schema has ${props.join(", ")}`);
}

// Conformance cases: cases/<area>/<topic>.json, matching the case schema, and files they name exist
const caseFiles = (readdirSync(join(root, "conformance/cases"), { recursive: true }) as string[]).sort();
const cases = caseFiles.filter((f) => f.endsWith(".json"));
const validCase = ajv.compile(JSON.parse(read("conformance/case.schema.json")));
for (const f of caseFiles.filter((f) => f.endsWith(".jsonl"))) {
  let header: { troupe?: string };
  try {
    header = JSON.parse(read(`conformance/cases/${f}`).split("\n")[0]);
  } catch (e) {
    fail(`conformance/cases/${f}: ${(e as Error).message}`);
    continue;
  }
  if (header.troupe !== version) fail(`conformance/cases/${f}: troupe is ${header.troupe}, not ${version}`);
}
for (const f of cases) {
  const path = `conformance/cases/${f}`;
  if (!/^[a-z0-9-]+\/[a-z0-9-]+\.json$/.test(f)) fail(`${path}: isn't <area>/<topic>.json`);
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(read(path));
  } catch (e) {
    fail(`${path}: ${(e as Error).message}`);
    continue;
  }
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== "object") return;
    const d = o as Record<string, unknown>;
    if (typeof d.kind === "string" && ["bundle", "session", "chronicle"].includes(d.kind) && "troupe" in d && d.troupe !== version)
      fail(`${path}: a ${d.kind} has troupe ${d.troupe}, not ${version}`);
    Object.values(d).forEach(walk);
  };
  walk(value);
  if (!validCase(value)) fail(`${path}: ${ajv.errorsText(validCase.errors, { dataVar: "" })}`);
  for (const m of JSON.stringify(value).matchAll(/"(?:bundle|session|chronicle)File":"([^"]+)"/g))
    if (!existsSync(join(root, dirname(path), m[1]))) fail(`${path}: ${m[1]} doesn't exist`);
  schemaCodes(path, value);
}

// A case's expected codes agree with the schemas: SCHEMA is expected exactly when an input fails them, apart from
// unknown properties (Format 15). Covers check tests, chronicle checks and parse tests of a single JSON document or session.
function schemaFails(name: string, value: unknown): boolean {
  const v = validator(name);
  return !v(value) && (v.errors ?? []).some((e) => e.keyword !== "additionalProperties" && e.keyword !== "if");
}
function schemaCodes(path: string, c: Record<string, any>) {
  const withVersion = (o: Record<string, unknown>) => ({ troupe: version, ...o });
  const bundle = c.bundleFile ? JSON.parse(read(join(dirname(path), c.bundleFile))) : withVersion(c.bundle ?? { kind: "bundle" });
  const lines = (text: string): unknown[] | undefined => {
    try {
      return text.split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));
    } catch {
      return undefined; // a raw file with unreadable lines; parse tests cover it
    }
  };
  const session = c.sessionFile ? lines(read(join(dirname(path), c.sessionFile))) : c.session && [withVersion(c.session.header), ...c.session.messages];
  const sessionFails = (lines: unknown[]) =>
    schemaFails("session-header.schema.json", lines[0]) || lines.slice(1).some((m) => schemaFails("message.schema.json", m));
  (c.tests as Record<string, any>[]).forEach((t, i) => {
    const where = `${path}: test ${i + 1}${t.name ? ` (${t.name})` : ""}`;
    const codes: string[] | undefined = t.expect?.codes;
    let fails: boolean | undefined;
    if (t.type === "check" && codes && (session !== undefined || !c.sessionFile))
      fails = schemaFails("bundle.schema.json", bundle) || (session ? sessionFails(session) : false);
    else if (t.type === "chronicle" && codes) {
      const chronicle = t.chronicleFile ? JSON.parse(read(join(dirname(path), t.chronicleFile))) : withVersion(t.chronicle);
      fails = schemaFails("chronicle.schema.json", chronicle);
    } else if (t.type === "parse" && typeof t.text === "string" && t.kind !== "package") {
      const expected = codes ?? (t.expect?.ok === true ? [] : undefined);
      if (!expected || expected.some((code) => code === "PARSE" || code === "UNSUPPORTED_VERSION")) return;
      const schema = { bundle: "bundle.schema.json", chronicle: "chronicle.schema.json", modelOutput: "model-output.schema.json" }[
        t.kind as string
      ];
      try {
        if (schema) fails = schemaFails(schema, JSON.parse(t.text));
      } catch {
        return;
      }
      if (!schema) {
        const read = lines(t.text);
        if (!read) return;
        fails = sessionFails(read);
      }
      if (fails !== expected.includes("SCHEMA")) fail(`${where}: the schemas ${fails ? "reject" : "accept"} the input, but SCHEMA is ${fails ? "not " : ""}expected`);
      return;
    }
    if (fails !== undefined && codes && fails !== codes.includes("SCHEMA"))
      fail(`${where}: the schemas ${fails ? "reject" : "accept"} the input, but SCHEMA is ${fails ? "not " : ""}expected`);
  });
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

// Section citations: "Format 7.2", "Play 3.3", "Format Appendix B.2" and lists such as "Format 2.2, 14 and 16" anywhere,
// and "section 7.2" within a spec document
const sections = (path: string) =>
  new Set([...read(path).matchAll(/^#{2,3} (?:Appendix )?(\d+(?:\.\d+)?|[A-Z](?:\.\d+)?)[.: ]/gm)].map((m) => m[1]));
const specSections: Record<string, Set<string>> = { Format: sections("spec/format.md"), Play: sections("spec/play.md") };
const num = String.raw`(?:\d+(?:\.\d+)*|[A-E](?:\.\d+)*)(?![\w.]*\d)`;
const list = String.raw`${num}(?:(?:,| and) ${num})*`;
const cite = (where: string, text: string, own?: string) => {
  const check = (doc: string, items: string) => {
    for (const n of items.split(/,| and /).map((s) => s.trim()))
      if (!specSections[doc].has(n)) fail(`${where}: cites ${doc} ${n}, which doesn't exist`);
  };
  for (const m of text.matchAll(new RegExp(String.raw`\b(Format|Play) (?:Appendix )?(${list})`, "g"))) check(m[1], m[2]);
  if (own) for (const m of text.matchAll(new RegExp(String.raw`\bsections? (${list})(?! of Troupe)`, "g"))) check(own, m[1]);
};
for (const doc of markdown) cite(doc, read(doc), { "spec/format.md": "Format", "spec/play.md": "Play" }[doc]);
for (const f of cases) cite(`conformance/cases/${f}`, read(`conformance/cases/${f}`));

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`ok: ${schemaFiles.length} schemas, ${Object.keys(examples).length} examples, ${cases.length} cases, ${markdown.length} documents`);
