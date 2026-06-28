"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Link as LinkIcon,
  ImageIcon,
  Undo2,
  Redo2,
  Loader2,
} from "lucide-react";
import { bodyForEditor, countBodyWords } from "@/lib/content-body";
import { uploadContentImage } from "@/lib/content-upload";

type ContentRichEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md p-2 transition ${
        active
          ? "bg-foreground text-background shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

export function ContentRichEditor({
  value,
  onChange,
  placeholder = "Write your article — headings, lists, links, and images supported.",
  disabled = false,
}: ContentRichEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
          class: "underline underline-offset-2 text-[oklch(0.78_0.14_85)]",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "my-6 w-full rounded-xl border border-border",
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: bodyForEditor(value),
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[420px] max-w-none focus:outline-none px-4 py-4 text-[15px] leading-[1.75] text-foreground/90 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-xl [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-2 [&_blockquote]:border-[oklch(0.78_0.14_85)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-foreground/80 [&_pre]:rounded-lg [&_pre]:bg-secondary/40 [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-sm [&_code]:rounded [&_code]:bg-secondary/50 [&_code]:px-1 [&_code]:font-mono [&_a]:underline",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const insertImageFromFile = useCallback(
    async (file: File) => {
      if (!editor || uploadingRef.current) return;
      uploadingRef.current = true;
      try {
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadContentImage(formData, "inline");
        if (!result.success) {
          window.alert(result.error || "Image upload failed");
          return;
        }
        editor.chain().focus().setImage({ src: result.url, alt: file.name }).run();
      } finally {
        uploadingRef.current = false;
      }
    },
    [editor],
  );

  const insertImageByUrl = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Image URL");
    if (!url?.trim()) return;
    const alt = window.prompt("Alt text (optional)") || "";
    editor.chain().focus().setImage({ src: url.trim(), alt }).run();
  }, [editor]);

  const wordCount = countBodyWords(editor?.getHTML() ?? value);

  if (!editor) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-border bg-background/40">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background/40 overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-secondary/20 px-2 py-2 sticky top-0 z-10">
        <ToolbarButton
          title="Undo"
          disabled={disabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Redo"
          disabled={disabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton
          title="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive("underline")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={editor.isActive("strike")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Blockquote"
          active={editor.isActive("blockquote")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Code block"
          active={editor.isActive("codeBlock")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Divider"
          disabled={disabled}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton title="Insert link" active={editor.isActive("link")} disabled={disabled} onClick={setLink}>
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Upload inline image" disabled={disabled} onClick={() => imageInputRef.current?.click()}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Image from URL" disabled={disabled} onClick={insertImageByUrl}>
          <span className="text-[10px] font-bold px-0.5">URL</span>
        </ToolbarButton>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void insertImageFromFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <EditorContent editor={editor} />

      <div className="border-t border-border/60 px-4 py-2 text-[10px] text-muted-foreground font-mono flex justify-between">
        <span>{wordCount} words</span>
        <span>{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
      </div>
    </div>
  );
}
