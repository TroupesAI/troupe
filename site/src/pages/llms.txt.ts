import type { APIRoute } from "astro";
import { readme, site, sources } from "../sources.ts";

// The site for language models (llmstxt.org): what Troupe is, and each document as Markdown.
export const GET: APIRoute = () =>
  new Response(
    [`# Troupe`, `> ${readme().tagline}`, [...sources.map((s) => `- [${s.label}](${site}/${s.route}.md)`), `- [All of them in one file](${site}/llms-full.txt)`].join("\n")].join("\n\n") + "\n",
  );
