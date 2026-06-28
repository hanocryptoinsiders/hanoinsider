"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  Image as ImageIcon,
  X,
  Save,
  Video,
  FileText,
  TrendingUp,
  Star,
  StarOff,
  ExternalLink,
  RefreshCw,
  Globe,
  Lock,
  Copy,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import { RichReader } from "@/lib/rich-text";
import { ContentRichEditor } from "@/components/admin/ContentRichEditor";
import { countBodyWords } from "@/lib/content-body";
import {
  getContentItems,
  createContentItem,
  updateContentItem,
  deleteContentItem,
  publishContentItem,
  archiveContentItem,
  togglePremiumContent,
  togglePublicContent,
  type ContentItem,
} from "@/lib/content";
import { uploadContentThumbnail } from "@/lib/content-upload";
import { getCoinPickerOptions, type CoinPickerOption } from "@/lib/market.functions";
import { getPublicShareUrl } from "@/lib/site-url";
import { toast } from "sonner";

const categories = ["Macro", "Bitcoin", "Ethereum", "Altcoins", "On-chain", "Education", "Trading"];

type FilterKey = "All" | "insight" | "article" | "video" | "draft" | "published" | "archived" | "standard" | "premium";

type FormState = {
  type: "insight" | "article" | "video";
  category: string;
  title: string;
  slug: string;
  excerpt: string;
  tags: string;
  thumbnail: string;
  body: string;
  visibility: "Premium" | "Standard";
  allowComments: boolean;
  video_url: string;
  related_coin_slug: string;
  status: "draft" | "published" | "archived";
};

const emptyForm: FormState = {
  type: "insight",
  category: "Macro",
  title: "",
  slug: "",
  excerpt: "",
  tags: "",
  thumbnail: "",
  body: "",
  visibility: "Premium",
  allowComments: true,
  video_url: "",
  related_coin_slug: "",
  status: "draft",
};

export default function AdminContent() {
  const [filter, setFilter] = useState<FilterKey>("All");
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [draft, setDraft] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [coinOptions, setCoinOptions] = useState<CoinPickerOption[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorInstanceKey = editingId ?? "new";

  // ������ Data Loading ��������������������������������������������������������������������������������������������������������������������

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const data = await getContentItems(undefined, true);
      setContent(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load content items");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    getCoinPickerOptions()
      .then(setCoinOptions)
      .catch(() => setCoinOptions([]));
  }, []);

  // ������ Slug Generator ����������������������������������������������������������������������������������������������������������������

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleTitleChange = (val: string) => {
    setDraft((prev) => ({
      ...prev,
      title: val,
      slug: editingId ? prev.slug : generateSlug(val),
    }));
  };

  // ─── Form Actions ───────────────────────────────────────────────────────────

  const handleThumbnailUpload = async (file: File) => {
    setUploadState("uploading");
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadContentThumbnail(formData);
    if (!result.success) {
      setUploadState("error");
      setUploadError(result.error);
      toast.error(result.error);
      return;
    }
    setDraft((prev) => ({ ...prev, thumbnail: result.url }));
    setUploadState("success");
    toast.success("Image uploaded");
    setTimeout(() => setUploadState("idle"), 2000);
  };

  const handleSave = (targetStatus: "draft" | "published" | "archived") => {
    if (!draft.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!draft.slug.trim()) {
      toast.error("Slug is required");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          title: draft.title,
          slug: draft.slug,
          description: draft.excerpt || null,
          body: draft.body || null,
          thumbnail_url: draft.thumbnail || null,
          content_type: draft.type,
          category: draft.category || null,
          tags: draft.tags
            ? draft.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
          is_premium: draft.visibility === "Premium",
          related_coin_slug: draft.related_coin_slug.trim() || null,
          status: targetStatus,
          video_url: draft.type === "video" ? draft.video_url || null : null,
          published_at: targetStatus === "published" ? new Date().toISOString() : null,
        };

        if (editingId) {
          await updateContentItem(editingId, payload);
          toast.success("Content updated successfully");
        } else {
          await createContentItem(payload as any);
          toast.success("Content created successfully");
        }

        setOpen(false);
        setEditingId(null);
        setDraft(emptyForm);
        setPreview(false);
        loadItems();
      } catch (err: any) {
        toast.error(err.message || "Failed to save content item");
      }
    });
  };

  const handleEdit = (item: ContentItem) => {
    setEditingId(item.id);
    setDraft({
      type: item.content_type,
      category: item.category || "Macro",
      title: item.title,
      slug: item.slug,
      excerpt: item.description || "",
      tags: (item.tags || []).join(", "),
      thumbnail: item.thumbnail_url || "",
      body: item.body || "",
      visibility: item.is_premium ? "Premium" : "Standard",
      allowComments: true,
      video_url: item.video_url || "",
      related_coin_slug: item.related_coin_slug || "",
      status: item.status,
    });
    setOpen(true);
    setPreview(false);
    // Scroll to top of editor
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string, type: string, title: string) => {
    if (!confirm(`Delete "${title}"?\n\nThis action cannot be undone.`)) return;
    try {
      await deleteContentItem(id, type);
      toast.success("Content deleted");
      loadItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item");
    }
  };

  const handleQuickPublish = async (id: string, type: string) => {
    try {
      await publishContentItem(id, type);
      toast.success("Published");
      loadItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to publish");
    }
  };

  const handleQuickArchive = async (id: string, type: string) => {
    try {
      await archiveContentItem(id, type);
      toast.success("Archived");
      loadItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to archive");
    }
  };

  const handleTogglePremium = async (id: string, currentlyPremium: boolean, type: string) => {
    try {
      await togglePremiumContent(id, currentlyPremium, type);
      toast.success(currentlyPremium ? "Set to Standard" : "Set to Premium");
      loadItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle visibility");
    }
  };

  const publicLinkFor = (slug: string) => getPublicShareUrl(slug);

  const handleTogglePublic = async (id: string, currentlyPublic: boolean, type: string) => {
    try {
      const result = await togglePublicContent(id, !currentlyPublic, type);
      if (result.is_public) {
        try {
          await navigator.clipboard.writeText(publicLinkFor(result.slug));
          toast.success("Public link copied.");
        } catch {
          toast.success("Made public · share link ready");
        }
      } else {
        toast.success("Set to private");
      }
      loadItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to update public status");
    }
  };

  const handleCopyPublicLink = async (item: ContentItem) => {
    if (!item.is_public) {
      toast.error("Make this content public before copying a share link.");
      return;
    }
    if (!item.slug?.trim()) {
      toast.error("This item has no slug yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(publicLinkFor(item.slug));
      toast.success("Public link copied.");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleCloseEditor = () => {
    if (draft.title || draft.body !== emptyForm.body) {
      if (!confirm("Discard unsaved changes?")) return;
    }
    setOpen(false);
    setEditingId(null);
    setDraft(emptyForm);
    setPreview(false);
  };

  // ������ Filtering ��������������������������������������������������������������������������������������������������������������������������

  const filtered = content.filter((c) => {
    if (filter === "All") return true;
    if (filter === "standard") return !c.is_premium;
    if (filter === "premium") return c.is_premium;
    if (filter === "insight" || filter === "article" || filter === "video") {
      return c.content_type === filter;
    }
    return c.status === filter;
  });

  // ������ Render ��������������������������������������������������������������������������������������������������������������������������������

  const filterLabels: Record<FilterKey, string> = {
    All: "All",
    insight: "Insights",
    article: "Articles",
    video: "Videos",
    draft: "Drafts",
    published: "Published",
    archived: "Archived",
    standard: "Standard",
    premium: "Premium",
  };

  return (
    <>
      <PageHeader kicker="CONTENT CMS" title="Manage insights, articles & videos." />

      {/* ���� Controls Bar ���������������������������������������������������������������������������������������������� */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(filterLabels) as FilterKey[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3.5 py-1.5 text-xs transition ${
                filter === s ? "bg-foreground text-background" : "panel hover:bg-accent"
              }`}
            >
              {filterLabels[s]}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            if (open) {
              handleCloseEditor();
            } else {
              setDraft(emptyForm);
              setEditingId(null);
              setOpen(true);
            }
          }}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-sm hover:opacity-95 transition disabled:opacity-40"
        >
          {open ? (
            <>
              <X className="h-4 w-4" /> Discard
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> New Content
            </>
          )}
        </button>
      </div>

      {/* ���� Editor ���������������������������������������������������������������������������������������������������������� */}
      {open && (
        <section className="panel-elevated p-0 overflow-hidden border border-border/80 shadow-2xl">
          {/* Editor Header */}
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 flex-wrap bg-secondary/10">
            <p className="text-[11px] tracking-[0.2em] text-muted-foreground font-mono">
              {editingId ? `EDITING - ${draft.title || "Untitled"}` : "CREATE NEW CONTENT"}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setPreview(!preview)}
                className="inline-flex items-center gap-2 rounded-lg panel hover:bg-accent px-4 py-1.5 text-xs transition"
              >
                <Eye className="h-3.5 w-3.5" /> {preview ? "Back to Editor" : "Live Preview"}
              </button>
              <button
                type="button"
                onClick={() => handleSave("draft")}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg panel hover:bg-accent px-4 py-1.5 text-xs transition disabled:opacity-40"
              >
                <Save className="h-3.5 w-3.5" /> Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleSave("published")}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-4 py-1.5 text-xs font-semibold hover:bg-foreground/90 transition disabled:opacity-40"
              >
                {isPending ? (
                  <span className="animate-spin inline-block h-3 w-3 border border-current border-t-transparent rounded-full" />
                ) : null}
                {editingId ? "Update & Publish" : "Publish Now"}
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_320px]">
            {/* Main Composing Area */}
            <div className="p-6 space-y-5 border-r border-border">
              {!preview ? (
                <>
                  <div>
                    <label className="text-[10px] tracking-wider text-muted-foreground font-mono">
                      TITLE
                    </label>
                    <input
                      value={draft.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Title - make it land."
                      className="w-full bg-transparent font-display text-3xl placeholder:text-muted-foreground/40 focus:outline-none mt-1 border-b border-transparent focus:border-border/30 pb-1"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] tracking-wider text-muted-foreground font-mono">
                      URL SLUG
                    </label>
                    <input
                      value={draft.slug}
                      onChange={(e) =>
                        setDraft({ ...draft, slug: generateSlug(e.target.value) })
                      }
                      placeholder="url-friendly-slug"
                      className="w-full bg-transparent text-sm font-mono text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none mt-1 border-b border-transparent focus:border-border/30 pb-1"
                    />
                    {draft.slug && (
                      <p className="mt-1 text-[10px] text-muted-foreground/60 font-mono">
                        � /dashboard/{draft.type}s/{draft.slug}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] tracking-wider text-muted-foreground font-mono">
                      EXCERPT / DESCRIPTION
                    </label>
                    <textarea
                      value={draft.excerpt}
                      onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
                      rows={2}
                      placeholder="One-line excerpt shown on cards."
                      className="w-full bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none resize-none mt-1 border-b border-transparent focus:border-border/30 pb-1"
                    />
                  </div>

                  {/* Rich text body */}
                  <div>
                    <label className="text-[10px] tracking-wider text-muted-foreground font-mono block mb-2">
                      ARTICLE BODY
                    </label>
                    <ContentRichEditor
                      key={editorInstanceKey}
                      value={draft.body}
                      onChange={(html) => setDraft({ ...draft, body: html })}
                      disabled={isPending}
                      placeholder="Write your insight, article, or guide. Use the toolbar to format text, add links, and insert images."
                    />
                    <p className="mt-2 text-[10px] text-muted-foreground/50 font-mono">
                      {countBodyWords(draft.body)} words ·{" "}
                      {Math.max(1, Math.ceil(countBodyWords(draft.body) / 200))} min read · Legacy markdown
                      content is converted in the editor and saved as rich HTML on update.
                    </p>
                  </div>
                </>
              ) : (
                <div className="max-w-3xl mx-auto py-4">
                  {draft.thumbnail && (
                    <img
                      loading="lazy"
                      decoding="async"
                      src={draft.thumbnail}
                      alt=""
                      className="w-full h-64 object-cover rounded-xl border border-border mb-6"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
                      {draft.category}
                    </span>
                    <span className="text-muted-foreground/40">"</span>
                    <span className="text-[10px] rounded bg-secondary px-2 py-0.5 font-semibold text-foreground uppercase">
                      {draft.type}
                    </span>
                    <span
                      className={`text-[10px] rounded px-2 py-0.5 font-semibold uppercase ${
                        draft.visibility === "Premium"
                          ? "bg-foreground text-background"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {draft.visibility}
                    </span>
                  </div>
                  <h1 className="font-display text-4xl sm:text-5xl mt-3 leading-[1.05]">
                    {draft.title || "Untitled"}
                  </h1>
                  {draft.excerpt && (
                    <p className="mt-4 text-base text-muted-foreground">{draft.excerpt}</p>
                  )}

                  {draft.type === "video" && draft.video_url && (
                    <div className="mt-6 aspect-video w-full rounded-xl overflow-hidden border border-border bg-black flex items-center justify-center">
                      <p className="text-sm font-mono text-muted-foreground">
                        Video: {draft.video_url}
                      </p>
                    </div>
                  )}

                  <div className="mt-8 border-t border-border/40 pt-8">
                    <RichReader source={draft.body} />
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Settings */}
            <aside className="p-5 space-y-6 bg-surface/40 overflow-y-auto">
              {/* Content Type */}
              <div>
                <p className="text-[10px] tracking-wider text-muted-foreground font-mono">
                  CONTENT TYPE
                </p>
                <div className="mt-2 grid grid-cols-3 gap-1 panel p-1 text-xs">
                  {(
                    [
                      { key: "insight", label: "Insight", Icon: FileText },
                      { key: "article", label: "Article", Icon: FileText },
                      { key: "video", label: "Video", Icon: Video },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setDraft({ ...draft, type: t.key })}
                      className={`rounded py-1.5 flex flex-col items-center justify-center gap-1 transition ${
                        draft.type === t.key
                          ? "bg-foreground text-background shadow font-medium"
                          : "text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <t.Icon className="h-3 w-3" />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <p className="text-[10px] tracking-wider text-muted-foreground font-mono">
                  CATEGORY
                </p>
                <select
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Thumbnail */}
              <div>
                <p className="text-[10px] tracking-wider text-muted-foreground font-mono">
                  COVER IMAGE
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">
                  Cover image for cards and article headers — separate from inline images in the body editor.
                </p>
                {draft.thumbnail ? (
                  <div className="relative mt-2 rounded-md overflow-hidden border border-border">
                    <img
                      loading="lazy"
                      decoding="async"
                      src={draft.thumbnail}
                      alt=""
                      className="w-full h-32 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setDraft({ ...draft, thumbnail: "" });
                        setUploadState("idle");
                        setUploadError(null);
                      }}
                      className="absolute top-2 right-2 rounded-full bg-background/85 p-1 text-foreground hover:bg-background shadow"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {uploadState === "success" && (
                      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-emerald-500/90 px-2 py-0.5 text-[10px] text-white">
                        <CheckCircle2 className="h-3 w-3" /> Uploaded
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 flex flex-col items-center justify-center rounded-md border border-dashed border-border px-3 py-6 text-xs text-muted-foreground bg-background/10">
                    {uploadState === "uploading" ? (
                      <Loader2 className="h-5 w-5 mb-1.5 animate-spin text-muted-foreground" />
                    ) : uploadState === "error" ? (
                      <AlertCircle className="h-5 w-5 mb-1.5 text-red-400" />
                    ) : (
                      <ImageIcon className="h-5 w-5 mb-1.5 text-muted-foreground/60" />
                    )}
                    <span>
                      {uploadState === "uploading"
                        ? "Uploading…"
                        : uploadState === "error"
                        ? uploadError || "Upload failed"
                        : "Upload an image or paste a URL below"}
                    </span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleThumbnailUpload(file);
                    e.target.value = "";
                  }}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={uploadState === "uploading"}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs hover:bg-accent disabled:opacity-50"
                  >
                    {uploadState === "uploading" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Upload file
                  </button>
                </div>
                <input
                  value={draft.thumbnail}
                  onChange={(e) => {
                    setDraft({ ...draft, thumbnail: e.target.value });
                    setUploadState("idle");
                    setUploadError(null);
                  }}
                  placeholder="Or paste image URL"
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">JPG, PNG, or WebP · max 5 MB</p>
              </div>

              {/* Related coin (optional) */}
              <div>
                <p className="text-[10px] tracking-wider text-muted-foreground font-mono">
                  RELATED COIN (OPTIONAL)
                </p>
                <select
                  value={draft.related_coin_slug}
                  onChange={(e) => setDraft({ ...draft, related_coin_slug: e.target.value })}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">None — not linked to a coin</option>
                  {coinOptions.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name} ({c.symbol})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">
                  Links this content to a coin detail page and related-content sections.
                </p>
              </div>

              {/* Video URL  only for video type */}
              {draft.type === "video" && (
                <div>
                  <p className="text-[10px] tracking-wider text-muted-foreground font-mono">
                    VIDEO EMBED URL
                  </p>
                  <input
                    value={draft.video_url}
                    onChange={(e) => setDraft({ ...draft, video_url: e.target.value })}
                    placeholder="https://www.youtube.com/embed/..."
                    className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">
                    Use the embed URL (not the share URL). For YouTube: replace{" "}
                    <code className="font-mono text-[9px] bg-secondary px-1 rounded">watch?v=</code>{" "}
                    with{" "}
                    <code className="font-mono text-[9px] bg-secondary px-1 rounded">embed/</code>.
                  </p>
                </div>
              )}

              {/* Tags */}
              <div>
                <p className="text-[10px] tracking-wider text-muted-foreground font-mono">
                  TAGS (COMMA SEPARATED)
                </p>
                <input
                  value={draft.tags}
                  onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none"
                  placeholder="macro, bitcoin, eth"
                />
                {draft.tags && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {draft.tags
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/30 text-muted-foreground"
                        >
                          #{t}
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {/* Visibility Tier */}
              <div>
                <p className="text-[10px] tracking-wider text-muted-foreground font-mono">
                  VISIBILITY TIER
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1 panel p-1 text-xs">
                  {(["Premium", "Standard"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setDraft({ ...draft, visibility: v })}
                      className={`rounded px-2 py-1.5 text-center transition ${
                        draft.visibility === v
                          ? "bg-foreground text-background shadow font-medium"
                          : "text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
                  {draft.visibility === "Standard"
                    ? "Standard: included for all paid members."
                    : "Premium: extra-gated content for premium members."}
                </p>
              </div>
            </aside>
          </div>
        </section>
      )}

      {/* ���� Content Table ���������������������������������������������������������������������������������������������� */}
      {isLoading ? (
        <div className="panel p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-muted border-t-foreground" />
          <span className="text-sm font-mono mt-2">Loading content database...</span>
        </div>
      ) : (
        <section className="panel p-0 overflow-x-auto">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border border-b border-border">
            {[
              { label: "Total", value: content.length },
              { label: "Published", value: content.filter((c) => c.status === "published").length },
              { label: "Premium", value: content.filter((c) => c.is_premium).length },
              { label: "Drafts", value: content.filter((c) => c.status === "draft").length },
            ].map((s) => (
              <div key={s.label} className="px-5 py-3 text-center">
                <p className="font-display text-2xl text-foreground">{s.value}</p>
                <p className="text-[10px] tracking-wider text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="text-left text-[10px] tracking-wider text-muted-foreground border-b border-border bg-secondary/5">
                <th className="px-5 py-3">TYPE</th>
                <th className="px-5 py-3">TITLE</th>
                <th className="px-5 py-3">STATUS</th>
                <th className="px-5 py-3">TIER</th>
                <th className="px-5 py-3">CATEGORY</th>
                <th className="px-5 py-3">PUBLISHED</th>
                <th className="px-5 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    No content items found for the selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border last:border-0 hover:bg-secondary/5 transition"
                  >
                    {/* Type */}
                    <td className="px-5 py-3.5">
                      <span className="text-[10px] font-mono tracking-wider rounded bg-secondary px-2 py-0.5 uppercase text-foreground font-semibold">
                        {c.content_type}
                      </span>
                    </td>

                    {/* Title + Slug */}
                    <td className="px-5 py-3.5 max-w-[260px]">
                      <span className="font-medium text-foreground flex items-center gap-1.5">
                        <span className="truncate">{c.title}</span>
                        {c.is_public && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded bg-sky-500/15 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 text-[9px] font-mono tracking-wider">
                            <Globe className="h-2.5 w-2.5" /> PUBLIC
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground block truncate mt-0.5">
                        /{c.content_type}s/{c.slug}
                      </span>
                      {/* Tags */}
                      {c.tags && c.tags.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {c.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="text-[9px] font-mono text-muted-foreground/60 px-1 rounded bg-secondary/20"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-[10px] font-mono tracking-wider rounded px-2 py-0.5 font-medium ${
                          c.status === "published"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : c.status === "archived"
                            ? "bg-red-500/15 text-red-400 border border-red-500/20"
                            : "bg-secondary text-muted-foreground border border-border"
                        }`}
                      >
                        {c.status.toUpperCase()}
                      </span>
                    </td>

                    {/* Tier */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-[10px] tracking-wider rounded px-2 py-0.5 ${
                          c.is_premium
                            ? "bg-foreground text-background font-semibold"
                            : "bg-secondary text-muted-foreground border border-border"
                        }`}
                      >
                        {c.is_premium ? "PREMIUM" : "STANDARD"}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {c.category || ""}
                    </td>

                    {/* Published Date */}
                    <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">
                      {c.published_at ? new Date(c.published_at).toLocaleDateString() : ""}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end items-center gap-1">
                        {/* Publish (draft or archived � publish) */}
                        {c.status !== "published" && (
                          <button
                            onClick={() => handleQuickPublish(c.id, c.content_type)}
                            title="Publish"
                            className="rounded p-1.5 hover:bg-emerald-500/10 text-emerald-500 transition"
                          >
                            <TrendingUp className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Archive (published � archive) */}
                        {c.status === "published" && (
                          <button
                            onClick={() => handleQuickArchive(c.id, c.content_type)}
                            title="Archive"
                            className="rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground transition"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Toggle Premium / Free */}
                        <button
                          onClick={() => handleTogglePremium(c.id, c.is_premium, c.content_type)}
                          title={c.is_premium ? "Set as Standard" : "Set as Premium"}
                          className={`rounded p-1.5 hover:bg-accent transition ${
                            c.is_premium
                              ? "text-[oklch(0.78_0.14_85)]"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {c.is_premium ? (
                            <Star className="h-3.5 w-3.5 fill-current" />
                          ) : (
                            <StarOff className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {/* Toggle Public / Private share */}
                        <button
                          onClick={() => handleTogglePublic(c.id, !!c.is_public, c.content_type)}
                          title={c.is_public ? "Make Private" : "Make Public (shareable)"}
                          className={`rounded p-1.5 hover:bg-accent transition ${
                            c.is_public
                              ? "text-sky-400"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {c.is_public ? (
                            <Globe className="h-3.5 w-3.5" />
                          ) : (
                            <Lock className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {/* Copy public link (only when public) */}
                        <button
                          onClick={() => handleCopyPublicLink(c)}
                          title={c.is_public ? "Copy public link" : "Make public to copy a share link"}
                          className={`rounded p-1.5 hover:bg-accent transition ${
                            c.is_public ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/50"
                          }`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>

                        {/* View live page (published only) */}
                        {c.status === "published" && (
                          <a
                            href={`/dashboard/${c.content_type}s/${c.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            title="View live page"
                            className="rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground transition"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}

                        {/* Edit */}
                        <button
                          onClick={() => handleEdit(c)}
                          title="Edit"
                          className="rounded p-1.5 hover:bg-accent text-foreground transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(c.id, c.content_type, c.title)}
                          title="Delete"
                          className="rounded p-1.5 hover:bg-red-500/10 text-red-500 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
