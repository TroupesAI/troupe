import { satteri } from "@astrojs/markdown-satteri";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
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
  integrations: [
    starlight({
      title: "Troupe",
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
