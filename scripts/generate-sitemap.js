import fs from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import routesConfig from "../data/routes.js";
import blogsConfig from "../data/blogs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");
const pagesDir = path.join(projectRoot, "src", "pages");
const siteUrl = (process.env.SITE_URL || "https://www.swiftgrowthdigital.com").replace(/\/+$/, "");
const shouldGzip = process.env.GZIP_SITEMAP === "true";
const today = toDateOnly(new Date().toISOString());

const defaultPageChangefreq = "monthly";
const defaultPagePriority = 0.6;
const defaultBlogChangefreq = "monthly";
const defaultBlogPriority = 0.7;

const ignoredPageFiles = new Set([
  "NotFound.tsx",
  "BlogPost.tsx",
]);

const xmlEscapeMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

function escapeXml(input) {
  return String(input).replace(/[&<>"']/g, (char) => xmlEscapeMap[char]);
}

function toDateOnly(value) {
  return new Date(value).toISOString().split("T")[0];
}

function toKebabCase(input) {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

function toAbsoluteUrl(inputPath) {
  if (!inputPath) {
    return siteUrl;
  }
  if (/^https?:\/\//i.test(inputPath)) {
    return inputPath;
  }
  const normalizedPath = inputPath.startsWith("/") ? inputPath : `/${inputPath}`;
  return `${siteUrl}${normalizedPath}`;
}

function getDefaultPriority(routePath) {
  if (routePath === "/") {
    return 1.0;
  }
  if (routePath === "/blog" || routePath.startsWith("/blog/")) {
    return 0.7;
  }
  if (routePath === "/services" || routePath.endsWith("-marketing")) {
    return 0.9;
  }
  return defaultPagePriority;
}

function getDefaultChangefreq(routePath) {
  if (routePath === "/") {
    return "daily";
  }
  if (routePath === "/services" || routePath.endsWith("-marketing")) {
    return "weekly";
  }
  if (routePath === "/blog" || routePath.startsWith("/blog/")) {
    return "monthly";
  }
  return defaultPageChangefreq;
}

async function resolveLastmod({ lastmod, updatedAt, source }) {
  if (lastmod) {
    return toDateOnly(lastmod);
  }
  if (updatedAt) {
    return toDateOnly(updatedAt);
  }
  if (source) {
    const sourcePath = path.resolve(projectRoot, source);
    try {
      const stats = await fs.stat(sourcePath);
      return toDateOnly(stats.mtime.toISOString());
    } catch {
      return today;
    }
  }
  return today;
}

async function discoverPageRoutes() {
  const files = await fs.readdir(pagesDir, { withFileTypes: true });
  const entries = [];

  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith(".tsx")) {
      continue;
    }
    if (ignoredPageFiles.has(file.name)) {
      continue;
    }

    const basename = file.name.replace(/\.tsx$/, "");
    const routePath = basename === "Index" ? "/" : `/${toKebabCase(basename)}`;
    entries.push({
      path: routePath,
      source: path.join("src", "pages", file.name).replace(/\\/g, "/"),
      changefreq: getDefaultChangefreq(routePath),
      priority: getDefaultPriority(routePath),
    });
  }

  return entries;
}

function mergeRouteConfig(discoveredRoutes, configuredRoutes) {
  const merged = new Map();

  for (const entry of discoveredRoutes) {
    merged.set(entry.path, entry);
  }

  for (const entry of configuredRoutes) {
    const prev = merged.get(entry.path) || {};
    merged.set(entry.path, { ...prev, ...entry });
  }

  return Array.from(merged.values());
}

function buildUrlsetXml(entries) {
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${escapeXml(entry.lastmod)}</lastmod>
    <changefreq>${escapeXml(entry.changefreq)}</changefreq>
    <priority>${escapeXml(entry.priority.toFixed(1))}</priority>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildSitemapIndexXml(entries) {
  const items = entries
    .map(
      (entry) => `  <sitemap>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${escapeXml(entry.lastmod)}</lastmod>
  </sitemap>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>
`;
}

async function writeTextFile(filename, content) {
  await fs.mkdir(publicDir, { recursive: true });
  await fs.writeFile(path.join(publicDir, filename), content, "utf8");
}

async function writeGzipFile(filename) {
  const sourcePath = path.join(publicDir, filename);
  const destinationPath = `${sourcePath}.gz`;

  await new Promise((resolve, reject) => {
    const gzip = zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });
    const source = createReadStream(sourcePath);
    const destination = createWriteStream(destinationPath);

    source.on("error", reject);
    gzip.on("error", reject);
    destination.on("error", reject);
    destination.on("finish", resolve);

    source.pipe(gzip).pipe(destination);
  });
}

async function generate() {
  const discoveredRoutes = await discoverPageRoutes();
  const mergedRoutes = mergeRouteConfig(discoveredRoutes, routesConfig)
    .filter((entry) => !entry.exclude && entry.path && !entry.path.includes(":"));

  const pagesEntries = [];
  for (const route of mergedRoutes) {
    pagesEntries.push({
      loc: toAbsoluteUrl(route.canonicalUrl || route.path),
      lastmod: await resolveLastmod(route),
      changefreq: route.changefreq || getDefaultChangefreq(route.path),
      priority: Number(route.priority ?? getDefaultPriority(route.path)),
    });
  }

  const blogEntries = [];
  for (const blog of blogsConfig) {
    if (!blog.slug || blog.exclude) {
      continue;
    }
    blogEntries.push({
      loc: toAbsoluteUrl(blog.canonicalUrl || `/blog/${blog.slug}`),
      lastmod: await resolveLastmod(blog),
      changefreq: blog.changefreq || defaultBlogChangefreq,
      priority: Number(blog.priority ?? defaultBlogPriority),
    });
  }

  const allEntries = [...pagesEntries, ...blogEntries];

  const sitemapPagesXml = buildUrlsetXml(pagesEntries);
  const sitemapBlogXml = buildUrlsetXml(blogEntries);
  const sitemapMainXml = buildUrlsetXml(allEntries);

  await writeTextFile("sitemap-pages.xml", sitemapPagesXml);
  await writeTextFile("sitemap-blog.xml", sitemapBlogXml);
  await writeTextFile("sitemap.xml", sitemapMainXml);

  const sitemapIndexXml = buildSitemapIndexXml([
    { loc: `${siteUrl}/sitemap.xml`, lastmod: today },
    { loc: `${siteUrl}/sitemap-pages.xml`, lastmod: today },
    { loc: `${siteUrl}/sitemap-blog.xml`, lastmod: today },
  ]);
  await writeTextFile("sitemap-index.xml", sitemapIndexXml);

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
  await writeTextFile("robots.txt", robotsTxt);

  if (shouldGzip) {
    await writeGzipFile("sitemap.xml");
    await writeGzipFile("sitemap-pages.xml");
    await writeGzipFile("sitemap-blog.xml");
    await writeGzipFile("sitemap-index.xml");
  }

  console.log("Sitemap generation complete.");
  console.log(`Pages: ${pagesEntries.length}`);
  console.log(`Blogs: ${blogEntries.length}`);
  console.log(`Output directory: ${publicDir}`);
}

generate().catch((error) => {
  console.error("Sitemap generation failed.");
  console.error(error);
  process.exit(1);
});
