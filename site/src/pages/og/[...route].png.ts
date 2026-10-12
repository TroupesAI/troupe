import { getCollection } from "astro:content";
import { OGImageRoute } from "astro-og-canvas";
import { readme, site } from "../../sources.ts";

const fonts = "https://cdn.jsdelivr.net/fontsource/fonts";

// The social card of each page: the logo on its own night background, the page title, and the site.
export const { getStaticPaths, GET } = await OGImageRoute({
  pages: Object.fromEntries((await getCollection("docs")).map(({ id, data }) => [id, data])),
  getSlug: (route) => route,
  getImageOptions: (route, { title }) => ({
    title,
    description: route === "index" ? readme().tagline : new URL(site).host,
    logo: { path: "./src/assets/logo.webp", size: [160] },
    bgGradient: [[9, 4, 17]],
    fonts: [`${fonts}/newsreader@5.3.0/latin-600-normal.ttf`, `${fonts}/atkinson-hyperlegible-next@5.3.0/latin-400-normal.ttf`],
    font: {
      title: { families: ["Newsreader"], weight: "SemiBold", size: 80, color: [245, 243, 250] },
      description: { families: ["Atkinson Hyperlegible Next"], size: 36, lineHeight: 1.4, color: [190, 182, 210] },
    },
  }),
});
