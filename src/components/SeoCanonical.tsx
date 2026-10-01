import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import legalSeo from "@/data/legal-seo.json";

const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://www.swiftgrowthdigital.com").replace(/\/+$/, "");

function normalizePath(pathname: string) {
  if (!pathname || pathname === "/") {
    return "/";
  }
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function SeoCanonical() {
  const location = useLocation();

  useEffect(() => {
    const normalizedPath = normalizePath(location.pathname);
    const canonicalHref = `${SITE_URL}${normalizedPath === "/" ? "/" : normalizedPath}`;
    const pageSeo = legalSeo.pages[normalizedPath as keyof typeof legalSeo.pages];

    let canonicalEl = document.querySelector("link[rel='canonical']");
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute("href", canonicalHref);

    let ogUrlEl = document.querySelector("meta[property='og:url']");
    if (!ogUrlEl) {
      ogUrlEl = document.createElement("meta");
      ogUrlEl.setAttribute("property", "og:url");
      document.head.appendChild(ogUrlEl);
    }
    ogUrlEl.setAttribute("content", canonicalHref);

    const setMeta = (selector: string, attribute: "name" | "property", key: string, content: string) => {
      let element = document.querySelector<HTMLMetaElement>(selector);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    const title = pageSeo?.title || legalSeo.defaultTitle;
    const description = pageSeo?.description || legalSeo.defaultDescription;
    document.title = title;
    setMeta("meta[name='description']", "name", "description", description);
    setMeta("meta[property='og:title']", "property", "og:title", title);
    setMeta("meta[property='og:description']", "property", "og:description", description);
    setMeta("meta[name='twitter:title']", "name", "twitter:title", title);
    setMeta("meta[name='twitter:description']", "name", "twitter:description", description);
  }, [location.pathname]);

  return null;
}
