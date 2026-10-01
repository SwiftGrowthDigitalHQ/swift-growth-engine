import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const seoConfigPath = path.join(projectRoot, "src", "data", "legal-seo.json");
const baseHtmlPath = path.join(distDir, "index.html");
const siteUrl = "https://www.swiftgrowthdigital.com";

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function replaceMeta(html, selector, replacement) {
  const updated = html.replace(selector, replacement);
  if (updated === html) throw new Error(`Expected metadata tag not found: ${selector}`);
  return updated;
}

async function generate() {
  const [baseHtml, seoConfigText] = await Promise.all([
    fs.readFile(baseHtmlPath, "utf8"),
    fs.readFile(seoConfigPath, "utf8"),
  ]);
  const seoConfig = JSON.parse(seoConfigText);

  for (const [route, metadata] of Object.entries(seoConfig.pages)) {
    if (metadata.route !== route || !metadata.title || !metadata.description) {
      throw new Error(`Invalid legal page metadata for ${route}`);
    }

    let html = baseHtml.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttribute(metadata.title)}</title>`);
    if (html === baseHtml) throw new Error(`Expected title tag not found for ${route}`);

    const description = escapeAttribute(metadata.description);
    const title = escapeAttribute(metadata.title);
    const canonical = `${siteUrl}${route}`;
    html = replaceMeta(html, /<meta name="description" content="[^"]*"\s*\/?\s*>/, `<meta name="description" content="${description}" />`);
    html = replaceMeta(html, /<meta property="og:title" content="[^"]*"\s*\/?\s*>/, `<meta property="og:title" content="${title}" />`);
    html = replaceMeta(html, /<meta property="og:description" content="[^"]*"\s*\/?\s*>/, `<meta property="og:description" content="${description}" />`);
    html = replaceMeta(html, /<meta property="og:url" content="[^"]*"\s*\/?\s*>/, `<meta property="og:url" content="${canonical}" />`);
    html = replaceMeta(html, /<meta name="twitter:title" content="[^"]*"\s*\/?\s*>/, `<meta name="twitter:title" content="${title}" />`);
    html = replaceMeta(html, /<meta name="twitter:description" content="[^"]*"\s*\/?\s*>/, `<meta name="twitter:description" content="${description}" />`);
    html = replaceMeta(html, /<link rel="canonical" href="[^"]*"\s*\/?\s*>/, `<link rel="canonical" href="${canonical}" />`);

    const fileName = `${route.replace(/^\//, "")}.html`;
    await fs.writeFile(path.join(distDir, fileName), html, "utf8");
    console.log(`Generated: dist/${fileName}`);
  }
}

generate().catch((error) => {
  console.error("Legal page metadata generation failed.");
  console.error(error.message || error);
  process.exit(1);
});
