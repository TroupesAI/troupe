// Turns the repository's Markdown into site pages: section numbers become heading ids, links point into the site,
// and citations such as "Format 7.2" become links.
import type { SatteriProcessorOptions } from "@astrojs/markdown-satteri";
import type { Element, ElementContent, Text } from "hast";
import { renderMermaidSVG } from "beautiful-mermaid";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { formatCitation, sectionCitation, sectionNumber } from "../../scripts/sections.ts";
import { resolve, root, sources } from "./sources.ts";

type Plugin = NonNullable<SatteriProcessorOptions["hastPlugins"]>[number];

// Within the spec, "section 7.2" is a citation too.
const specCitation = new RegExp(`${formatCitation.source}|${sectionCitation.source}`, "g");

const link = (href: string, text: string): Element => ({
  type: "element",
  tagName: "a",
  properties: { href },
  children: [{ type: "text", value: text }],
});

// "Format 2.2, 14 and 16" becomes [Format 2.2], [14] and [16].
const cite = (text: string, pattern: RegExp, page: string): ElementContent[] | undefined => {
  const out: ElementContent[] = [];
  let at = 0;
  for (const m of text.matchAll(pattern)) {
    const list = m[1] ?? m[2];
    const [first, ...rest] = list.split(/(, | and )/);
    const prefix = m[0].slice(0, -list.length);
    out.push({ type: "text", value: text.slice(at, m.index) }, link(`${page}#${first}`, prefix + first));
    for (let i = 0; i < rest.length; i += 2) out.push({ type: "text", value: rest[i] }, link(`${page}#${rest[i + 1]}`, rest[i + 1]));
    at = m.index + m[0].length;
  }
  if (!at) return;
  out.push({ type: "text", value: text.slice(at) });
  return out;
};

export const troupeMarkdown: Plugin = ({ fileURL }) => {
  const file = fileURL ? relative(root, fileURLToPath(fileURL)) : "";
  if (!sources.some((s) => s.file === file)) return;
  const isSpec = file === "spec/format.md";
  return {
    name: "troupe",
    element: [
      {
        filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
        visit(node, ctx) {
          // The title is taken out before rendering, so an h1 here is a part of the spec, such as "Part I: Authoring".
          if (node.tagName === "h1") return { ...node, tagName: "h2", properties: { ...node.properties, className: ["part"] } };
          const id = sectionNumber(ctx.textContent(node));
          if (!id) return;
          // The number gets its own span, so it can read quieter than the title.
          const properties = { ...node.properties, id };
          const [first, ...rest] = node.children;
          const number = first?.type === "text" ? first.value.match(/^\S+(?: [A-Z]:)?(?= )/)?.[0] : undefined;
          if (first?.type !== "text" || !number) return { ...node, properties };
          const children: ElementContent[] = [
            { type: "element", tagName: "span", properties: { className: ["sn"] }, children: [{ type: "text", value: number }] },
            { type: "text", value: first.value.slice(number.length) },
            ...rest,
          ];
          return { ...node, properties, children };
        },
      },
      {
        // A table header row with no text, such as the README's "| | |", names nothing.
        filter: ["thead"],
        visit(node, ctx) {
          if (!ctx.textContent(node).trim()) ctx.removeNode(node);
        },
      },
      {
        filter: ["a"],
        visit(node, ctx) {
          if (typeof node.properties.href === "string") ctx.setProperty(node, "href", resolve(node.properties.href, file));
        },
      },
    ],
    text(node: Text, ctx) {
      for (let p = ctx.parent(node); p?.type === "element"; p = ctx.parent(p)) {
        if (/^(a|code|pre|h\d)$/.test(p.tagName)) return;
      }
      const nodes = isSpec ? cite(node.value, specCitation, "") : cite(node.value, formatCitation, "/format/");
      if (nodes) ctx.replaceNode(node, nodes);
    },
  };
};

// A Mermaid diagram as inline SVG, drawn at build time in the site's colors, so it follows the theme without a script.
// The renderer's font rules go, since the page sets the font, and its markers' ids take a key unique within the page.
export const diagram = (code: string, key: number) => {
  const svg = renderMermaidSVG(code, {
    bg: "var(--sl-color-bg)",
    fg: "var(--sl-color-white)",
    accent: "var(--sl-color-accent)",
    transparent: true,
    padding: 8,
  })
    .replace(/^\s*(@import|text \{).*$/gm, "")
    .replaceAll("arrowhead", `arrowhead-${key}`)
    .replace(/\s*\n\s*/g, " ");
  return `<figure class="diagram">${svg}</figure>`;
};
