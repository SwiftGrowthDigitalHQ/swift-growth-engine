const SITE_URL = "https://www.swiftgrowthdigital.com";

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
    path: "/clinic-marketing",
    canonicalUrl: `${SITE_URL}/clinic-marketing`,
    source: "src/pages/ClinicMarketing.tsx",
    changefreq: "weekly",
    priority: 0.9,
  },
  {
    path: "/real-estate-marketing",
    canonicalUrl: `${SITE_URL}/real-estate-marketing`,
    source: "src/pages/RealEstateMarketing.tsx",
    changefreq: "weekly",
    priority: 0.9,
  },
  {
    path: "/restaurant-marketing",
    canonicalUrl: `${SITE_URL}/restaurant-marketing`,
    source: "src/pages/RestaurantMarketing.tsx",
    changefreq: "weekly",
    priority: 0.9,
  },
  {
    path: "/education-marketing",
    canonicalUrl: `${SITE_URL}/education-marketing`,
    source: "src/pages/EducationMarketing.tsx",
    changefreq: "weekly",
    priority: 0.9,
  },
  {
    path: "/salon-marketing",
    canonicalUrl: `${SITE_URL}/salon-marketing`,
    source: "src/pages/SalonMarketing.tsx",
    changefreq: "weekly",
    priority: 0.9,
  },
  {
    path: "/local-business-marketing",
    canonicalUrl: `${SITE_URL}/local-business-marketing`,
    source: "src/pages/LocalBusinessMarketing.tsx",
    changefreq: "weekly",
    priority: 0.9,
  },
  {
    path: "/service-business-marketing",
    canonicalUrl: `${SITE_URL}/service-business-marketing`,
    source: "src/pages/ServiceBusinessMarketing.tsx",
    changefreq: "weekly",
    priority: 0.9,
  },
  {
    path: "/ecommerce-marketing",
    canonicalUrl: `${SITE_URL}/ecommerce-marketing`,
    source: "src/pages/EcommerceMarketing.tsx",
    changefreq: "weekly",
    priority: 0.9,
  },
  {
    path: "/admin",
    exclude: true,
  },
];
