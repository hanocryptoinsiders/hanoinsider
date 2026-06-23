import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

export function RichReader({ source, className = "" }: { source: string; className?: string }) {
  return (
    <div className={`prose prose-invert max-w-none text-foreground/85 leading-relaxed space-y-4 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: ({ ...props }) => <h1 className="font-display text-4xl mt-12 mb-5 text-foreground" {...props} />,
          h2: ({ ...props }) => <h2 className="font-display text-3xl mt-10 mb-4 text-foreground" {...props} />,
          h3: ({ ...props }) => <h3 className="font-display text-2xl mt-8 mb-3 text-foreground" {...props} />,
          p: ({ ...props }) => <p className="text-[15px] sm:text-base leading-[1.8] text-foreground/85 my-4" {...props} />,
          blockquote: ({ ...props }) => (
            <blockquote className="my-6 border-l-2 border-[oklch(0.78_0.14_85)] pl-5 italic text-lg sm:text-xl font-display text-foreground/90 bg-secondary/10 py-1" {...props} />
          ),
          ul: ({ ...props }) => <ul className="my-4 space-y-2 pl-6 list-disc text-foreground/85" {...props} />,
          ol: ({ ...props }) => <ol className="my-4 space-y-2 pl-6 list-decimal text-foreground/85" {...props} />,
          li: ({ ...props }) => <li className="text-[15px] leading-[1.7]" {...props} />,
          a: ({ ...props }) => (
            <a className="underline underline-offset-2 text-foreground hover:text-[oklch(0.78_0.14_85)] transition-colors" target="_blank" rel="noreferrer" {...props} />
          ),
          img: ({ ...props }) => (
            <img className="my-8 w-full rounded-xl border border-border" loading="lazy" {...props} />
          ),
          code: ({ ...props }) => (
            <code className="rounded bg-secondary px-1.5 py-0.5 text-[0.85em] font-mono text-foreground" {...props} />
          ),
          hr: ({ ...props }) => <hr className="my-8 border-border" {...props} />,
          pre: ({ ...props }) => (
            <pre className="rounded-xl border border-border bg-secondary/30 p-4 font-mono text-sm overflow-x-auto my-6" {...props} />
          ),
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-6">
              <table className="w-full text-left text-sm border-collapse" {...props} />
            </div>
          ),
          thead: ({ ...props }) => <thead className="border-b border-border text-[10px] tracking-wider text-muted-foreground uppercase" {...props} />,
          tbody: ({ ...props }) => <tbody className="divide-y divide-border/40" {...props} />,
          tr: ({ ...props }) => <tr className="hover:bg-secondary/5 transition-colors" {...props} />,
          th: ({ ...props }) => <th className="pb-3 pt-2 font-medium" {...props} />,
          td: ({ ...props }) => <td className="py-3 text-muted-foreground" {...props} />,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
