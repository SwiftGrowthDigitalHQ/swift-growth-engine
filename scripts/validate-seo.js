import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");
const primaryOrigin = "https://www.swiftgrowthdigital.com";

const sitemapFiles = [
  "sitemap.xml",
  "sitemap-pages.xml",
  "sitemap-blog.xml",
  "sitemap-index.xml",
];

function extractLocs(xml) {
  const matches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
  return Array.from(matches, (match) => match[1].trim());
}

function validatePrimaryDomain(urls, label) {
  const invalid = urls.filter((url) => !url.startsWith(primaryOrigin));
  if (invalid.length > 0) {
    throw new Error(`${label}: Found non-primary domain URLs:\n${invalid.join("\n")}`);
  }
}

function findDuplicates(urls) {
  const seen = new Set();
  const duplicates = new Set();
  for (const url of urls) {
    if (seen.has(url)) {
      duplicates.add(url);
    } else {
      seen.add(url);
    }
  }
  return Array.from(duplicates);
}

async function validateSitemapFiles() {
  const locsByFile = new Map();

  for (const file of sitemapFiles) {
    const fullPath = path.join(publicDir, file);
    const xml = await fs.readFile(fullPath, "utf8");
    const locs = extractLocs(xml);
    validatePrimaryDomain(locs, file);
    const inFileDuplicates = findDuplicates(locs);
    if (inFileDuplicates.length > 0) {
      throw new Error(`Duplicate URLs found inside ${file}:\n${inFileDuplicates.join("\n")}`);
    }
    locsByFile.set(file, locs);
  }

  const pageLocs = locsByFile.get("sitemap-pages.xml") || [];
  const blogLocs = locsByFile.get("sitemap-blog.xml") || [];
  const overlap = pageLocs.filter((url) => blogLocs.includes(url));
  if (overlap.length > 0) {
    throw new Error(`Duplicate URLs found between sitemap-pages.xml and sitemap-blog.xml:\n${overlap.join("\n")}`);
  }
}

async function validateRobots() {
  const robots = await fs.readFile(path.join(publicDir, "robots.txt"), "utf8");
  const expected = `Sitemap: ${primaryOrigin}/sitemap.xml`;
  if (!robots.includes(expected)) {
    throw new Error(`robots.txt must contain "${expected}"`);
  }
}

async function run() {
  await validateSitemapFiles();
  await validateRobots();
  console.log("SEO validation passed.");
}

run().catch((error) => {
  console.error("SEO validation failed.");
  console.error(error.message || error);
  process.exit(1);
});
