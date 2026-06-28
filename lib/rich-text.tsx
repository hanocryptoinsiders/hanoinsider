import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { isHtmlContent, sanitizeRichHtml, RICH_CONTENT_CLASS } from "@/lib/content-body";

const markdownComponents = {
  h1: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="font-display text-4xl mt-12 mb-5 text-foreground" {...props} />
  ),
  h2: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="font-display text-3xl mt-10 mb-4 text-foreground" {...props} />
  ),
  h3: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="font-display text-2xl mt-8 mb-3 text-foreground" {...props} />
  ),
  p: ({ ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-[15px] sm:text-base leading-[1.8] text-foreground/85 my-4" {...props} />
  ),
  blockquote: ({ ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="my-6 border-l-2 border-[oklch(0.78_0.14_85)] pl-5 italic text-lg sm:text-xl font-display text-foreground/90 bg-secondary/10 py-1"
      {...props}
    />
  ),
  ul: ({ ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-4 space-y-2 pl-6 list-disc text-foreground/85" {...props} />
  ),
  ol: ({ ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="my-4 space-y-2 pl-6 list-decimal text-foreground/85" {...props} />
  ),
  li: ({ ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="text-[15px] leading-[1.7]" {...props} />
  ),
  a: ({ ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="underline underline-offset-2 text-foreground hover:text-[oklch(0.78_0.14_85)] transition-colors"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  img: ({ ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="my-8 w-full rounded-xl border border-border" loading="lazy" alt="" {...props} />
  ),
  code: ({ ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code className="rounded bg-secondary px-1.5 py-0.5 text-[0.85em] font-mono text-foreground" {...props} />
  ),
  hr: ({ ...props }: React.HTMLAttributes<HTMLHRElement>) => <hr className="my-8 border-border" {...props} />,
  pre: ({ ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className="rounded-xl border border-border bg-secondary/30 p-4 font-mono text-sm overflow-x-auto my-6" {...props} />
  ),
  table: ({ ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto my-6">
      <table className="w-full text-left text-sm border-collapse" {...props} />
    </div>
  ),
  thead: ({ ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="border-b border-border text-[10px] tracking-wider text-muted-foreground uppercase" {...props} />
  ),
  tbody: ({ ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody className="divide-y divide-border/40" {...props} />
  ),
  tr: ({ ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="hover:bg-secondary/5 transition-colors" {...props} />
  ),
  th: ({ ...props }: React.HTMLAttributes<HTMLTableCellElement>) => <th className="pb-3 pt-2 font-medium" {...props} />,
  td: ({ ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="py-3 text-muted-foreground" {...props} />
  ),
};

export function RichReader({ source, className = "" }: { source: string; className?: string }) {
  const trimmed = source?.trim() ?? "";
  if (!trimmed) return null;

  if (isHtmlContent(trimmed)) {
    const safe = sanitizeRichHtml(trimmed);
    return (
      <div
        className={`${RICH_CONTENT_CLASS} ${className} rich-content-html`}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  }

  return (
    <div className={`${RICH_CONTENT_CLASS} space-y-4 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={markdownComponents}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
