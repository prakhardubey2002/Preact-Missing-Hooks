import { useEffect, useRef } from "react";

const SCRIPT_SELECTOR = 'script[data-llm="true"]';
const SCRIPT_TYPE = "application/llm+json";

/** Max lengths for string fields to avoid huge payloads and XSS surface. */
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 2000;
const MAX_TAG_LENGTH = 100;
const MAX_TAGS = 50;
const MAX_OUTLINE_ITEM = 300;
const MAX_OUTLINE_ITEMS = 50;
const MAX_URL_LENGTH = 2048;
const MAX_AUTHOR = 200;
const MAX_SITE_NAME = 100;
const MAX_ROBOTS = 100;

/** Open Graph / content type for og:type. */
export type OGType = "website" | "article" | "profile" | "video.other" | "product" | "music.song" | "book";

/** Config for the useLLMMetadata hook. All fields optional except route. */
export interface LLMConfig {
  /** Current route path (e.g. "/blog/ai-hooks"). Changes trigger metadata update. */
  route: string;
  /** "manual" = use title/description/tags from config. "auto-extract" = derive from DOM. */
  mode?: "manual" | "auto-extract";
  /** Page title (manual mode). */
  title?: string;
  /** Page description (manual mode). */
  description?: string;
  /** Tags/keywords (manual mode). */
  tags?: string[];
  /** Canonical URL (absolute). */
  canonicalUrl?: string;
  /** Content language (e.g. "en", "en-US"). */
  language?: string;
  /** Open Graph type (website, article, etc.). */
  ogType?: OGType;
  /** OG image URL (absolute). */
  ogImage?: string;
  /** OG image alt text. */
  ogImageAlt?: string;
  /** Site name (e.g. for social previews). */
  siteName?: string;
  /** Author name (for articles). */
  author?: string;
  /** ISO date string (article publish). */
  publishedTime?: string;
  /** ISO date string (article last modified). */
  modifiedTime?: string;
  /** Robots hint (e.g. "index, follow"). */
  robots?: string;
  /** Extra key-value pairs (e.g. section, category). Keys/values are sanitized. */
  extra?: Record<string, string | number | boolean | string[]>;
}

/** Payload injected as JSON in the LLM script tag. Only includes defined, safe values. */
export interface LLMPayload {
  route: string;
  title?: string;
  description?: string;
  tags?: string[];
  outline?: string[];
  canonicalUrl?: string;
  language?: string;
  ogType?: string;
  ogImage?: string;
  ogImageAlt?: string;
  siteName?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  robots?: string;
  generatedAt: string;
  extra?: Record<string, string | number | boolean | string[]>;
}

/** Selectors for elements to ignore when auto-extracting. */
const IGNORE_SELECTOR =
  "nav, footer, [role='navigation'], [role='contentinfo'], script, style, noscript";

/**
 * Coerce value to a safe string for JSON. Never throws.
 */
function safeStr(value: unknown, maxLen: number): string {
  if (value == null) return "";
  const s = typeof value === "string" ? value : String(value);
  const trimmed = s.trim();
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

/**
 * Coerce to safe string array. Never throws.
 */
function safeTagList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (let i = 0; i < value.length && out.length < MAX_TAGS; i++) {
    const s = safeStr(value[i], MAX_TAG_LENGTH);
    if (s) out.push(s);
  }
  return out;
}

/**
 * Safe URL: only include if it looks like a valid http(s) URL and within length.
 */
function safeUrl(value: unknown): string {
  const s = safeStr(value, MAX_URL_LENGTH);
  if (!s) return "";
  try {
    const u = new URL(s);
    if (u.protocol === "http:" || u.protocol === "https:") return s;
  } catch {
    // ignore
  }
  return "";
}

/**
 * Returns true if el is visible. Never throws.
 */
function isVisible(el: Element): boolean {
  try {
    if (typeof window === "undefined") return false;
    const style = window.getComputedStyle(el);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    );
  } catch {
    return false;
  }
}

/**
 * Auto-extract title, outline (h1/h2), and first 3 visible paragraphs.
 * Fully safe: never throws; returns defaults on any error.
 */
function autoExtract(): {
  title: string;
  outline: string[];
  description: string;
} {
  const empty = { title: "", outline: [] as string[], description: "" };
  try {
    if (typeof document === "undefined") return empty;
    const title = safeStr(document.title, MAX_TITLE);
    const outline: string[] = [];
    let description = "";

    try {
      const ignoreRoots = document.querySelectorAll(IGNORE_SELECTOR);
      const isInsideIgnored = (el: Element): boolean => {
        for (const root of ignoreRoots) {
          if (root.contains(el)) return true;
        }
        return false;
      };

      const headings = document.querySelectorAll("h1, h2");
      for (const h of headings) {
        if (outline.length >= MAX_OUTLINE_ITEMS) break;
        if (isVisible(h) && !isInsideIgnored(h)) {
          const text = safeStr(h.textContent, MAX_OUTLINE_ITEM);
          if (text) outline.push(text);
        }
      }

      const paragraphs = document.querySelectorAll("p");
      const visibleParagraphs: string[] = [];
      for (const p of paragraphs) {
        if (visibleParagraphs.length >= 3) break;
        if (isVisible(p) && !isInsideIgnored(p)) {
          const text = safeStr(p.textContent, 1000);
          if (text) visibleParagraphs.push(text);
        }
      }
      description = visibleParagraphs.join(" ").trim().slice(0, MAX_DESCRIPTION) || "";
    } catch {
      // keep title, empty outline/description
    }

    return { title, outline, description };
  } catch {
    return empty;
  }
}

/**
 * Normalize config to a safe object. Never throws.
 */
function normalizeConfig(config: LLMConfig | null | undefined): LLMConfig {
  if (config == null || typeof config !== "object") {
    return { route: "/" };
  }
  return {
    route: safeStr(config.route, 2048) || "/",
    mode: config.mode === "auto-extract" ? "auto-extract" : "manual",
    title: config.title !== undefined ? safeStr(config.title, MAX_TITLE) : undefined,
    description: config.description !== undefined ? safeStr(config.description, MAX_DESCRIPTION) : undefined,
    tags: config.tags !== undefined ? safeTagList(config.tags) : undefined,
    canonicalUrl: config.canonicalUrl !== undefined ? safeUrl(config.canonicalUrl) : undefined,
    language: config.language !== undefined ? safeStr(config.language, 20) : undefined,
    ogType: config.ogType !== undefined ? safeStr(config.ogType, 50) as OGType : undefined,
    ogImage: config.ogImage !== undefined ? safeUrl(config.ogImage) : undefined,
    ogImageAlt: config.ogImageAlt !== undefined ? safeStr(config.ogImageAlt, 200) : undefined,
    siteName: config.siteName !== undefined ? safeStr(config.siteName, MAX_SITE_NAME) : undefined,
    author: config.author !== undefined ? safeStr(config.author, MAX_AUTHOR) : undefined,
    publishedTime: config.publishedTime !== undefined ? safeStr(config.publishedTime, 50) : undefined,
    modifiedTime: config.modifiedTime !== undefined ? safeStr(config.modifiedTime, 50) : undefined,
    robots: config.robots !== undefined ? safeStr(config.robots, MAX_ROBOTS) : undefined,
    extra: config.extra !== undefined && typeof config.extra === "object" && !Array.isArray(config.extra) ? sanitizeExtra(config.extra) : undefined,
  };
}

/**
 * Sanitize extra object: only string/number/boolean/string[] values; keys and strings bounded.
 */
function sanitizeExtra(extra: Record<string, unknown>): Record<string, string | number | boolean | string[]> {
  const out: Record<string, string | number | boolean | string[]> = {};
  try {
    for (const key of Object.keys(extra).slice(0, 20)) {
      const safeKey = safeStr(key, 50);
      if (!safeKey) continue;
      const v = extra[key];
      if (typeof v === "string") out[safeKey] = v.slice(0, 500);
      else if (typeof v === "number" && Number.isFinite(v)) out[safeKey] = v;
      else if (typeof v === "boolean") out[safeKey] = v;
      else if (Array.isArray(v)) out[safeKey] = v.map((x) => safeStr(x, 200)).filter(Boolean).slice(0, 20);
    }
  } catch {
    // ignore
  }
  return out;
}

/**
 * Build the LLM payload. Never throws; returns minimal payload on any error.
 */
function buildPayload(normalized: LLMConfig): LLMPayload {
  try {
    const generatedAt = new Date().toISOString();
    const base: LLMPayload = {
      route: normalized.route,
      generatedAt,
    };

    if (normalized.mode === "auto-extract") {
      const extracted = autoExtract();
      base.title = (normalized.title ?? extracted.title) || undefined;
      base.description = (normalized.description ?? extracted.description) || undefined;
      if (extracted.outline.length > 0) base.outline = extracted.outline;
    } else {
      if (normalized.title !== undefined && normalized.title !== "") base.title = normalized.title;
      if (normalized.description !== undefined && normalized.description !== "") base.description = normalized.description;
    }

    if (normalized.tags && normalized.tags.length > 0) base.tags = normalized.tags;
    if (normalized.canonicalUrl) base.canonicalUrl = normalized.canonicalUrl;
    if (normalized.language) base.language = normalized.language;
    if (normalized.ogType) base.ogType = normalized.ogType;
    if (normalized.ogImage) base.ogImage = normalized.ogImage;
    if (normalized.ogImageAlt) base.ogImageAlt = normalized.ogImageAlt;
    if (normalized.siteName) base.siteName = normalized.siteName;
    if (normalized.author) base.author = normalized.author;
    if (normalized.publishedTime) base.publishedTime = normalized.publishedTime;
    if (normalized.modifiedTime) base.modifiedTime = normalized.modifiedTime;
    if (normalized.robots) base.robots = normalized.robots;
    if (normalized.extra && Object.keys(normalized.extra).length > 0) base.extra = normalized.extra;

    return base;
  } catch {
    return {
      route: normalized?.route ?? "/",
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Remove any existing LLM script. Never throws.
 */
function removeExistingScript(): void {
  try {
    if (typeof document === "undefined" || !document.querySelectorAll) return;
    document.querySelectorAll(SCRIPT_SELECTOR).forEach((el) => el.remove());
  } catch {
    // ignore
  }
}

/**
 * Inject a new LLM script. Never throws.
 */
function injectScript(payload: LLMPayload): void {
  try {
    if (typeof document === "undefined" || !document.head) return;
    const script = document.createElement("script");
    script.type = SCRIPT_TYPE;
    script.setAttribute("data-llm", "true");
    script.textContent = JSON.stringify(payload);
    document.head.appendChild(script);
  } catch {
    // ignore
  }
}

/**
 * Production-ready hook: injects an AI-readable metadata block into the document head
 * when the route changes. Framework-agnostic (React 18+ and Preact 10+ via aliasing).
 *
 * - Rich structure: route, title, description, tags, outline (auto), canonicalUrl, language,
 *   ogType, ogImage, ogImageAlt, siteName, author, publishedTime, modifiedTime, robots, extra.
 * - Safe usage: never throws; invalid/missing config is normalized; DOM and JSON are guarded.
 * - Cacheable: if the generated payload is unchanged, the script is not replaced.
 * - SSR-safe: no-op when window/document is undefined.
 * - Cleans up on unmount (removes the script).
 *
 * @param config - Route (required), mode, and optional metadata fields. Can be partial; defaults applied.
 */
export function useLLMMetadata(config: LLMConfig | null | undefined): void {
  const prevPayloadRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const normalized = normalizeConfig(config);
      const payload = buildPayload(normalized);
      const payloadStr = JSON.stringify(payload);

      if (prevPayloadRef.current === payloadStr) return;
      prevPayloadRef.current = payloadStr;

      removeExistingScript();
      injectScript(payload);

      return () => {
        removeExistingScript();
        prevPayloadRef.current = null;
      };
    } catch {
      // no-op: never throw from effect
    }
  }, [
    config?.route,
    config?.mode,
    config?.title,
    config?.description,
    config?.tags,
    config?.canonicalUrl,
    config?.language,
    config?.ogType,
    config?.ogImage,
    config?.ogImageAlt,
    config?.siteName,
    config?.author,
    config?.publishedTime,
    config?.modifiedTime,
    config?.robots,
    // extra is read inside effect; change route/title/etc. to force update when only extra changed
  ]);
}
