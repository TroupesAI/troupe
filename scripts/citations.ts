// Section numbers and citations of them: "Format 7.2", "Format Appendix B.2" and lists such as "Format 2.2, 14 and 16"
// anywhere, and "section 7.2" within the spec. Shared by check.ts and the site.

// The number a heading starts with: "7.2 Activation", "1. Overview", "Appendix C: Design decisions", "B.1 A card with lore".
export const sectionNumber = (heading: string): string | undefined =>
  heading.match(/^(?:Appendix ([A-Z]):|(\d+(?:\.\d+)*)\.? |([A-Z]\.\d+(?:\.\d+)*) )/)?.slice(1).find(Boolean);

// The numbers of a document's sections, from its level 2 and 3 headings.
export const sections = (markdown: string) =>
  new Set([...markdown.matchAll(/^#{2,3} (.+)$/gm)].map((m) => sectionNumber(m[1])).filter((n) => n !== undefined));

const num = String.raw`(?:\d+(?:\.\d+)*|[A-Z](?![a-z])(?:\.\d+)*)(?![\w.]*\d)`;
const list = String.raw`${num}(?:(?:,| and) ${num})*`;
export const formatCitation = new RegExp(String.raw`\bFormat (?:Appendix )?(${list})`, "g");
export const sectionCitation = new RegExp(String.raw`\bsections? (${list})(?! of Troupe)`, "g");

// The section numbers in a matched list.
export const cited = (list: string) => list.split(/,| and /).map((s) => s.trim());
