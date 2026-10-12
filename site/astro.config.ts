import { satteri } from "@astrojs/markdown-satteri";
import starlight from "@astrojs/starlight";
import { definePlugin } from "@astrojs/starlight/expressive-code";
import { defineConfig, fontProviders } from "astro/config";
import { troupeMarkdown } from "./src/markdown.ts";
import { repo, site, sources } from "./src/sources.ts";

const page = (route: string) => {
  const { label } = sources.find((s) => s.route === route)!;
  return { slug: route, label };
};

// Expressive Code makes a code block that scrolls a region, so keyboard users can reach it; names tell the regions apart.
const codeBlockNames = definePlugin({
  name: "code-block-names",
  hooks: {
    postprocessRenderedBlock({ codeBlock, renderData }) {
      const position = codeBlock.parentDocument?.positionInDocument;
      const pre = renderData.blockAst.children.find((n) => n.type === "element" && n.tagName === "pre");
      if (position && pre?.type === "element") {
        pre.properties["aria-label"] = `Code block ${position.groupIndex + 1}`;
      }
    },
  },
});

export default defineConfig({
  site,
  trailingSlash: "always",
  markdown: { processor: satteri({ hastPlugins: [troupeMarkdown] }) },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Atkinson Hyperlegible Next",
      cssVariable: "--font-sans",
      weights: ["200 800"],
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
      favicon: "/favicon.png",
      head: [{ tag: "link", attrs: { rel: "apple-touch-icon", href: "/apple-touch-icon.png" } }],
      customCss: ["./src/styles/theme.css"],
      components: {
        Head: "./src/components/Head.astro",
        SiteTitle: "./src/components/SiteTitle.astro",
        PageTitle: "./src/components/PageTitle.astro",
        Footer: "./src/components/Footer.astro",
        ThemeSelect: "./src/components/ThemeSelect.astro",
      },
      expressiveCode: { themes: ["rose-pine-moon", "rose-pine-dawn"], plugins: [codeBlockNames] },
      social: [{ icon: "github", label: "GitHub", href: repo }],
      editLink: { baseUrl: `${repo}/edit/main/site/` },
      markdown: { processedDirs: [".."] },
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
