import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_URL } from "../data/routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");

const sitemapPath = path.join(publicDir, "sitemap.xml");
const primaryOrigin = SITE_URL.replace(/\/+$/, "");

function extractLocs(xml) {
  const matches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
  return Array.from(matches, (match) => match[1].trim());
}

function findDuplicates(list) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of list) {
    if (seen.has(item)) {
      duplicates.add(item);
      continue;
    }
    seen.add(item);
  }
  return Array.from(duplicates);
}

async function validate() {
  const xml = await fs.readFile(sitemapPath, "utf8");
  if (!xml.includes("<urlset")) {
    throw new Error("Invalid sitemap.xml: missing <urlset>.");
  }

  const locs = extractLocs(xml);
  if (locs.length === 0) {
    throw new Error("sitemap.xml has no URLs.");
  }

  const invalidDomain = locs.filter((loc) => !loc.startsWith(primaryOrigin));
  if (invalidDomain.length > 0) {
    throw new Error(`Found non-primary-domain URLs:\n${invalidDomain.join("\n")}`);
  }

  const duplicates = findDuplicates(locs);
  if (duplicates.length > 0) {
    throw new Error(`Found duplicate URLs in sitemap.xml:\n${duplicates.join("\n")}`);
  }

}

validate()
  .then(() => {
    console.log("SEO validation passed.");
  })
  .catch((error) => {
    console.error("SEO validation failed.");
    console.error(error.message || error);
    process.exit(1);
  });
