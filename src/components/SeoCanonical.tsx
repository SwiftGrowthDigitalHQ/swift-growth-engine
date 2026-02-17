import { useEffect } from "react";
import { useLocation } from "react-router-dom";

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
  }, [location.pathname]);

  return null;
}
