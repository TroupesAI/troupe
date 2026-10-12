import type { APIRoute, GetStaticPaths } from "astro";
import { markdown, sources } from "../sources.ts";

export const getStaticPaths = (() => sources.map((source) => ({ params: { route: source.route }, props: { source } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => new Response(markdown(props.source));
