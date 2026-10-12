import { satteri } from "@astrojs/markdown-satteri";
import starlight from "@astrojs/starlight";
import { defineConfig, fontProviders } from "astro/config";
import { dirname } from "node:path";
import { troupeMarkdown } from "./src/markdown.ts";
import { repo, sources } from "./src/sources.ts";

const page = (route: string) => {
  const { label } = sources.find((s) => s.route === route)!;
  return { slug: route, label };
};

export default defineConfig({
  site: "https://docs.troupes.ai",
  trailingSlash: "always",
  markdown: { processor: satteri({ hastPlugins: [troupeMarkdown] }) },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Atkinson Hyperlegible Next",
      cssVariable: "--font-sans",
      weights: ["200 800"],
      styles: ["normal", "italic"],
      fallbacks: ["sans-serif"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "Newsreader",
      cssVariable: "--font-serif",
      weights: ["200 800"],
      fallbacks: ["serif"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "JetBrains Mono",
      cssVariable: "--font-mono",
      weights: ["100 800"],
      fallbacks: ["monospace"],
    },
  ],
  integrations: [
    starlight({
      title: "Troupe",
      logo: { src: "./src/assets/logo.webp", alt: "" },
      favicon: "/favicon.png",
      head: [{ tag: "link", attrs: { rel: "apple-touch-icon", href: "/apple-touch-icon.png" } }],
      customCss: ["./src/styles/theme.css"],
      components: { Head: "./src/components/Head.astro" },
      expressiveCode: { themes: ["rose-pine-moon", "rose-pine-dawn"] },
      social: [{ icon: "github", label: "GitHub", href: repo }],
      editLink: { baseUrl: `${repo}/edit/main/site/` },
      markdown: { processedDirs: [...new Set(sources.map((s) => `../${dirname(s.file)}`))] },
      routeMiddleware: "./src/routeData.ts",
      sidebar: [
        {
          label: "Guides",
          items: ["guides/beginners", "guides/authoring", "guides/authoring-brief", "guides/character-cards"].map(page),
        },
        { label: "Reference", items: [page("format"), { label: "Schemas", link: "/schema/" }, page("conformance")] },
      ],
    }),
  ],
});
