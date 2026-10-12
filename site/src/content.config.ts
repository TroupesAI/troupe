import { defineCollection } from "astro:content";
import type { LoaderContext } from "astro/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { read, root, sources, spec } from "./sources.ts";

// Reads the documents in place. Each one's first line, "# Title", becomes the page title; the spec's version line
// moves to the page title area, and its contents list gives way to the table of contents.
const load = async ({ config, store, parseData, renderMarkdown, generateDigest, watcher }: LoaderContext) => {
  store.clear();
  for (const { file, route } of sources) {
    const text = read(file);
    const [, title, rest] = text.match(/^# (.+)\n([\s\S]*)$/) ?? [];
    if (!title) throw new Error(`${file} doesn't start with a title`);
    const body = rest.replace(spec.versionLine, "").replace(/^## Contents\n[\s\S]*?\n---\n/m, "");
    store.set({
      id: route,
      filePath: relative(fileURLToPath(config.root), join(root, file)),
      digest: generateDigest(text),
      data: await parseData({ id: route, data: { title } }),
      rendered: await renderMarkdown(body, { fileURL: pathToFileURL(join(root, file)) }),
    });
  }
  watcher?.add(sources.map((s) => join(root, s.file)));
};

export const collections = {
  docs: defineCollection({
    loader: {
      name: "troupe",
      load: async (context) => {
        await load(context);
        context.watcher?.on("change", (path) => {
          if (sources.some((s) => join(root, s.file) === path)) load(context);
        });
      },
    },
    schema: docsSchema(),
  }),
};
