// Checks the repository's documents and data:
//   - the schemas compile, and the examples and every complete bundle and session header in a Markdown document validate;
//   - examples/ and the first example of the README and the beginner's guide match the examples in spec/format.md (--write-examples rewrites examples/);
//   - every TypeScript interface in the spec lists exactly its schema's properties;
//   - the spec version agrees across the spec, the README, schema URLs, examples, documents in Markdown and cases;
//   - every conformance case is named <area>/<topic>.json, matches conformance/case.schema.json, and the files it names exist,
//     and its check and parse tests expect SCHEMA exactly when the schemas reject their input;
//   - cases with state, macro, cel or knows tests have inputs that pass the schemas, unknown properties included, and a
//     check test that expects no codes, so a runner confirms the inputs conform;
//   - relative Markdown links and #anchors resolve, and every "Format N.N" names a section.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { cited, formatCitation, sectionCitation, sections, slug } from "./sections.ts";

const root = resolve(import.meta.dir, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const problems: string[] = [];
const fail = (msg: string) => problems.push(msg);
const markdown = (readdirSync(root, { recursive: true }) as string[])
  .filter((f) => f.endsWith(".md") && !/(^|\/)(node_modules|\.git|dist|\.astro)\//.test(f))
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
  "lantern-heist/bundle.json": block("### B.2 A story", "json"),
  "lantern-heist/sessions/heist.troupe-session.jsonl": block("### B.3 Session", "text"),
};
const writeExamples = process.argv.includes("--write-examples");
for (const [name, text] of Object.entries(examples)) {
  const path = `examples/${name}`;
  if (writeExamples) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  else if (!existsSync(join(root, path)) || read(path) !== text) fail(`${path} differs from spec/format.md (bun run examples)`);
  if (name.endsWith(".json")) validate("bundle.schema.json", JSON.parse(text), path);
  else {
    const lines = text.trimEnd().split("\n").map((l) => JSON.parse(l));
    lines.forEach((line, i) => validate(i === 0 ? "session-header.schema.json" : "message.schema.json", line, `${path}:${i + 1}`));
  }
}
for (const doc of ["README.md", "guides/beginners.md"]) {
  const card = read(doc).match(/```json\n([\s\S]*?\n)```/)?.[1];
  if (card !== examples["elena-card.troupe.json"]) fail(`${doc}: the first example differs from Format 1.4's`);
}
const extra = (readdirSync(join(root, "examples"), { recursive: true }) as string[]).filter(
  (f) => /\.jsonl?$/.test(f) && !(f in examples),
);
if (extra.length) fail(`examples/ has files the spec doesn't define: ${extra.join(", ")}`);

// Every complete bundle written as a json block in a Markdown document; sessions there too, for their version
const docBundles: { where: string; troupe?: string }[] = [];
for (const doc of markdown) {
  const text = read(doc);
  for (const m of text.matchAll(/```json\n([\s\S]*?)\n```/g)) {
    let value: unknown;
    try {
      value = JSON.parse(m[1]);
    } catch (e) {
      // fragments such as a single entry or variable aren't JSON documents; a document that fails to parse is an error
      if (/"kind":\s*"(bundle|session)"/.test(m[1]))
        fail(`${doc}:${text.slice(0, m.index).split("\n").length}: ${(e as Error).message}`);
      continue;
    }
    const kind = (value as { kind?: string })?.kind;
    if (kind === "bundle" || kind === "session") {
      const line = text.slice(0, m.index).split("\n").length;
      validate(`${kind === "session" ? "session-header" : kind}.schema.json`, value, `${doc}:${line}`);
      docBundles.push({ where: `${doc}:${line}`, troupe: (value as { troupe?: string }).troupe });
    }
  }
}

// Spec version
const version = format.match(/^\*\*Version (\d+\.\d+) /m)?.[1];
if (!version) fail("spec/format.md has no version line");
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
  Limits: schemaOf("bundle.schema.json", "$defs", "limits"),
  SessionHeader: schemaOf("session-header.schema.json"),
  Message: schemaOf("message.schema.json"),
  Change: schemaOf("message.schema.json", "$defs", "change"),
};
for (const [name, schema] of Object.entries(interfaces)) {
  const body = format.match(new RegExp(`^interface ${name} \\{\n([\\s\\S]*?)\n\\}`, "m"))?.[1];
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
    if (typeof d.kind === "string" && ["bundle", "session"].includes(d.kind) && "troupe" in d && d.troupe !== version)
      fail(`${path}: a ${d.kind} has troupe ${d.troupe}, not ${version}`);
    Object.values(d).forEach(walk);
  };
  walk(value);
  if (!validCase(value)) fail(`${path}: ${ajv.errorsText(validCase.errors, { dataVar: "" })}`);
  for (const m of JSON.stringify(value).matchAll(/"(?:bundle|session)File":"([^"]+)"/g))
    if (!existsSync(join(root, dirname(path), m[1]))) fail(`${path}: ${m[1]} doesn't exist`);
  schemaCodes(path, value);
}

// A case's expected codes agree with the schemas: SCHEMA is expected exactly when an input fails them, apart from
// unknown properties (Format 13). Covers check tests and parse tests of a single JSON document or session.
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
  // state, macro, cel and knows tests need conforming inputs (conformance/README.md section 2)
  if ((c.tests as Record<string, any>[]).some((t) => ["state", "macro", "cel", "knows"].includes(t.type))) {
    const invalid = (name: string, value: unknown) => !validator(name)(value);
    if (c.sessionFile && session === undefined) fail(`${path}: ${c.sessionFile} has unreadable lines`);
    if (
      invalid("bundle.schema.json", bundle) ||
      (session && (invalid("session-header.schema.json", session[0]) || session.slice(1).some((m) => invalid("message.schema.json", m))))
    )
      fail(`${path}: state, macro, cel and knows tests need inputs that pass the schemas, unknown properties included`);
    const checks = (c.tests as Record<string, any>[]).filter((t) => t.type === "check");
    if (!checks.length) fail(`${path}: state, macro, cel and knows tests need a check test that expects no codes`);
    for (const t of checks)
      if (t.expect.codes.length) fail(`${path}: a check expects ${t.expect.codes.join(", ")}, so its state, macro, cel and knows tests have invalid inputs`);
  }
  (c.tests as Record<string, any>[]).forEach((t, i) => {
    const where = `${path}: test ${i + 1}${t.name ? ` (${t.name})` : ""}`;
    const codes: string[] | undefined = t.expect?.codes;
    let fails: boolean | undefined;
    if (t.type === "check" && codes && (session !== undefined || !c.sessionFile))
      fails = schemaFails("bundle.schema.json", bundle) || (session ? sessionFails(session) : false);
    else if (t.type === "parse" && typeof t.text === "string" && t.kind !== "package") {
      if (!codes || codes.some((code) => code === "PARSE" || code === "UNSUPPORTED_VERSION")) return;
      const schema = t.kind === "bundle" ? "bundle.schema.json" : undefined;
      try {
        if (schema) fails = schemaFails(schema, JSON.parse(t.text));
      } catch {
        return;
      }
      if (!schema) {
        const parsed = lines(t.text);
        if (!parsed) return;
        fails = sessionFails(parsed);
      }
      if (fails !== codes.includes("SCHEMA")) fail(`${where}: the schemas ${fails ? "reject" : "accept"} the input, but SCHEMA is ${fails ? "not " : ""}expected`);
      return;
    }
    if (fails !== undefined && codes && fails !== codes.includes("SCHEMA"))
      fail(`${where}: the schemas ${fails ? "reject" : "accept"} the input, but SCHEMA is ${fails ? "not " : ""}expected`);
  });
}

// Markdown links
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

// Section citations name sections of the spec
const formatSections = sections(format);
const cite = (where: string, text: string, own = false) => {
  const check = (items: string) => {
    for (const n of cited(items)) if (!formatSections.has(n)) fail(`${where}: cites Format ${n}, which doesn't exist`);
  };
  for (const m of text.matchAll(formatCitation)) check(m[1]);
  if (own) for (const m of text.matchAll(sectionCitation)) check(m[1]);
};
for (const doc of markdown) cite(doc, read(doc), doc === "spec/format.md");
for (const f of cases) cite(`conformance/cases/${f}`, read(`conformance/cases/${f}`));
for (const f of [...schemaFiles.map((f) => `schemas/${f}`), "conformance/case.schema.json"]) cite(f, read(f));

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`ok: ${schemaFiles.length} schemas, ${Object.keys(examples).length} examples, ${cases.length} cases, ${markdown.length} documents`);
