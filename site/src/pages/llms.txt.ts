import type { APIRoute } from "astro";
import { site, sources, tagline } from "../sources.ts";

// The site for language models (llmstxt.org): what Troupe is, and each document as Markdown.
export const GET: APIRoute = () =>
  new Response(
    [`# Troupe`, `> ${tagline}`, sources.map((s) => `- [${s.label}](${site}/${s.route}.md)`).join("\n"), `All of them in one file: ${site}/llms-full.txt`].join("\n\n") + "\n",
  );
