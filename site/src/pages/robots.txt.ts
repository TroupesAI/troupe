import type { APIRoute } from "astro";
import { site } from "../sources.ts";

export const GET: APIRoute = () => new Response(`User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap-index.xml\n`);
