import type { APIRoute } from "astro";
import { markdown, sources } from "../sources.ts";

export const GET: APIRoute = () => new Response(sources.map(markdown).join("\n\n"));
