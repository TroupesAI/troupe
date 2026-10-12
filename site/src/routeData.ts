import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

// In the spec's table of contents, sections nest under their parts up to the appendices, and "1. Overview" replaces
// Starlight's own link to the top.
export const onRequest = defineRouteMiddleware(({ locals }) => {
  const { entry, toc } = locals.starlightRoute;
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
