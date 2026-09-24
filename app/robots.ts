import type { MetadataRoute } from "next";

const SITE = "https://www.chariotrealty.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: ["*"],
        allow: "/",
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "OAI-SearchBot",
          "ClaudeBot",
          "Claude-Web",
          "Claude-Search",
          "anthropic-ai",
          "PerplexityBot",
          "Google-Extended",
          "Googlebot",
          "CCBot",
          "Amazonbot",
        ],
        allow: "/",
      },
      {
        userAgent: "*",
        disallow: ["/admin", "/api/", "/_next/"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
