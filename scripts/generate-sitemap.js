import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { routes, SITE_URL } from "../data/routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");
const sitemapPath = path.join(publicDir, "sitemap.xml");
const robotsPath = path.join(publicDir, "robots.txt");

const siteUrl = SITE_URL.replace(/\/+$/, "");
const today = new Date().toISOString().split("T")[0];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toAbsoluteUrl(routeUrl) {
  if (routeUrl === "/") {
    return `${siteUrl}/`;
  }
  return `${siteUrl}${routeUrl.startsWith("/") ? routeUrl : `/${routeUrl}`}`;
}

function validateRoutes(routeList) {
  const seen = new Set();
  for (const route of routeList) {
    if (!route.url || !route.changefreq || typeof route.priority !== "number") {
      throw new Error(`Invalid route entry: ${JSON.stringify(route)}`);
    }
    if (route.url.includes("://")) {
      throw new Error(`Route URL must be path-only. Found: ${route.url}`);
    }
    if (seen.has(route.url)) {
      throw new Error(`Duplicate route found: ${route.url}`);
    }
    seen.add(route.url);
  }
}

function buildSitemapXml(routeList) {
  const urlNodes = routeList
    .map((route) => {
      const loc = toAbsoluteUrl(route.url);
      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${escapeXml(route.changefreq)}</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>
`;
}

async function generate() {
  validateRoutes(routes);
  await fs.mkdir(publicDir, { recursive: true });

  const xml = buildSitemapXml(routes);
  await fs.writeFile(sitemapPath, xml, "utf8");

  const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
  await fs.writeFile(robotsPath, robots, "utf8");

  console.log(`Generated: ${path.relative(projectRoot, sitemapPath)}`);
  console.log(`Generated: ${path.relative(projectRoot, robotsPath)}`);
  console.log(`Total URLs: ${routes.length}`);
}

generate().catch((error) => {
  console.error("Sitemap generation failed.");
  console.error(error.message || error);
  process.exit(1);
});
