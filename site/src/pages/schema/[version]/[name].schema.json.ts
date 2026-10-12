import type { APIRoute, GetStaticPaths } from "astro";
import { versions } from "../../../schemas.ts";

export const getStaticPaths = (() =>
  versions.flatMap(({ version, files }) =>
    Object.entries(files).map(([file, text]) => ({
      params: { version, name: file.slice(0, -".schema.json".length) },
      props: { text },
    })),
  )) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => new Response(props.text);
