import { defineRouteMiddleware } from "@astrojs/starlight/route-data";
import { getImage } from "astro:assets";
import { site, sources } from "./sources.ts";

export const onRequest = defineRouteMiddleware(async ({ locals }) => {
  const { entry, head, toc } = locals.starlightRoute;
  // Starlight's hero renders its image once at 400px, which high-density screens stretch. It gets a 2x copy, at a
  // quality that keeps the logo's fine strands and stars.
  const image = entry.data.hero?.image;
  if (image && "file" in image) {
    const { src, srcSet, attributes } = await getImage({
      src: image.file,
      width: 400,
      densities: [1, 2],
      quality: 90,
      loading: "eager",
      decoding: "async",
    });
    const attrs = Object.entries(attributes)
      .filter(([, value]) => value !== undefined)
      .map(([name, value]) => `${name}="${value}"`)
      .join(" ");
    entry.data.hero!.image = { html: `<img src="${src}" srcset="${srcSet.attribute}" ${attrs} alt="${image.alt ?? ""}">` };
  }
  // "Troupe Format", not "Troupe Format | Troupe".
  const title = head.find((h) => h.tag === "title");
  if (title && entry.data.title.includes("Troupe")) title.content = entry.data.title;

  // Pages without a document of their own, such as /schema/, share the home page's social card.
  const card = sources.some((s) => s.route === entry.id) ? entry.id : "index";
  head.push({ tag: "meta", attrs: { property: "og:image", content: `${site}/og/${card}.png` } });

  // In the spec's table of contents, sections nest under their parts up to the appendices, and "1. Overview" replaces
  // Starlight's own link to the top.
  if (entry.id !== "format" || !toc) return;
  const items: typeof toc.items = [];
  let part: (typeof items)[number] | undefined;
  for (const item of toc.items.slice(1)) {
    const isPart = item.text.startsWith("Part ");
    if (isPart || item.text.startsWith("Appendix")) part = undefined;
    (part?.children ?? items).push(item);
    if (isPart) part = item;
  }
  toc.items = items;
});
