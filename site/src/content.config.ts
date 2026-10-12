import { defineCollection } from "astro:content";
import type { LoaderContext } from "astro/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { read, readme, root, sources } from "./sources.ts";

// Markdown text as plain text: links become their text, and emphasis and code marks go.
const plain = (markdown: string) => markdown.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*`]/g, "");

// Reads the documents in place. Each one's first line, "# Title", becomes the page title, and the spec's contents list
// gives way to the table of contents. The store changes only once every document has rendered, so a document with an
// error leaves the last good pages in place.
const load = async ({ config, store, parseData, renderMarkdown, generateDigest }: LoaderContext) => {
  const entries = [];
  for (const { file, route } of sources) {
    const text = read(file);
    const [, title, rest] = text.match(/^# (.+)\n([\s\S]*)$/) ?? [];
    if (!title) throw new Error(`${file} doesn't start with a title`);
    let body = rest.replace(/^## Contents\n[\s\S]*?\n---\n/m, "");
    let data: Record<string, unknown> = { title, description: plain(body.match(/^\w.*$/m)![0]) };
    if (route === "index") {
      const { tagline, main } = readme(text);
      body = main;
      data = {
        title,
        description: tagline,
        template: "splash",
        hero: {
          tagline,
          image: { file: "site/src/assets/logo.webp" },
          actions: [
            { text: "Start the beginner's guide", link: "/guides/beginners/", icon: "right-arrow" },
            { text: "Read the spec", link: "/format/", variant: "minimal" },
          ],
        },
      };
    }
    entries.push({
      id: route,
      filePath: relative(fileURLToPath(config.root), join(root, file)),
      digest: generateDigest(text),
      data: await parseData({ id: route, data, filePath: file }),
      rendered: await renderMarkdown(body, { fileURL: pathToFileURL(join(root, file)) }),
    });
  }
  store.clear();
  for (const entry of entries) store.set(entry);
};

let watching = false;

export const collections = {
  docs: defineCollection({
    loader: {
      name: "troupe",
      load: async (context) => {
        await load(context);
        if (watching || !context.watcher) return;
        watching = true;
        const files = sources.map((s) => join(root, s.file));
        context.watcher.add(files);
        context.watcher.on("change", (path) => {
          if (files.includes(path)) load(context).catch((e: Error) => context.logger.error(e.message));
        });
      },
    },
    schema: docsSchema(),
  }),
};
