const SITE_URL = "https://swiftgrowthdigital.com";

/**
 * Route overrides and custom entries for sitemap generation.
 * Auto-discovered page routes are merged with this config by `path`.
 */
export default [
  {
    path: "/",
    canonicalUrl: `${SITE_URL}/`,
    source: "src/pages/Index.tsx",
    changefreq: "daily",
    priority: 1.0,
  },
  {
    path: "/about",
    canonicalUrl: `${SITE_URL}/about`,
    changefreq: "monthly",
    priority: 0.8,
  },
  {
    path: "/services",
    canonicalUrl: `${SITE_URL}/services`,
    source: "src/pages/Services.tsx",
    changefreq: "weekly",
    priority: 0.9,
  },
  {
    path: "/contact",
    canonicalUrl: `${SITE_URL}/contact`,
    source: "src/pages/Contact.tsx",
    changefreq: "monthly",
    priority: 0.8,
  },
  {
    path: "/blog",
    canonicalUrl: `${SITE_URL}/blog`,
    source: "src/pages/Blog.tsx",
    changefreq: "monthly",
    priority: 0.7,
  },
  {
    path: "/admin",
    exclude: true,
  },
];
