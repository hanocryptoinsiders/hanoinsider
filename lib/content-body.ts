import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

/** Detect stored HTML (TipTap output) vs legacy markdown. */
export function isHtmlContent(source: string): boolean {
  const trimmed = source.trim();
  if (!trimmed) return false;
  if (!trimmed.startsWith("<")) return false;
  return /<(p|h[1-6]|ul|ol|li|blockquote|div|img|pre|hr|strong|em|a)\b/i.test(trimmed);
}

/** Convert legacy markdown to HTML for the TipTap editor (does not mutate stored content until save). */
export function bodyForEditor(raw: string): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return "";
  if (isHtmlContent(trimmed)) return trimmed;
  return marked.parse(trimmed, { async: false }) as string;
}

export function sanitizeRichHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "h1",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "img",
      "pre",
      "code",
      "hr",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel", "class"],
  });
}

/** Plain-text word count for markdown or HTML bodies. */
export function countBodyWords(source: string): number {
  if (!source?.trim()) return 0;
  const text = isHtmlContent(source)
    ? source.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    : source.replace(/[#>*_`[\]()!-]/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

export function estimateReadingMinutes(source: string, wpm = 200): number {
  const words = countBodyWords(source);
  return Math.max(1, Math.ceil(words / wpm));
}

/** Shared typography wrapper class for rendered article HTML. */
export const RICH_CONTENT_CLASS =
  "rich-content prose prose-invert max-w-none text-foreground/85 leading-relaxed";
