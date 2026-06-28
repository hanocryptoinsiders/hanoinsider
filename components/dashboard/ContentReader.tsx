"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Heart, MessageCircle, Bookmark, Share2, Lock, Trash2, Send, MessageSquare, Coins } from "lucide-react";
import { RichReader } from "@/lib/rich-text";
import { estimateReadingMinutes } from "@/lib/content-body";
import type { ContentItem } from "@/lib/content";
import { findCoinProfile } from "@/lib/coin-profiles";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getPublicShareUrl } from "@/lib/site-url";
import { copyOrShareUrl } from "@/lib/share-content";
import { toast } from "sonner";

/**
 * ContentReaderDisplay
 *
 * Receives pre-fetched, pre-gated data as props and manages interactive
 * database-backed likes and comments in the frontend.
 */
interface ContentReaderProps {
  item: ContentItem;
  /** True when content is premium AND user does not have premium access */
  locked: boolean;
  contentType: "insight" | "article" | "video";
}

interface CommentWithProfile {
  id: string;
  content_id: string;
  user_id: string;
  text: string;
  created_at: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function ContentReaderDisplay({ item, locked, contentType }: ContentReaderProps) {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();

  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoadingLikesComments, setIsLoadingLikesComments] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [discussionReloadKey, setDiscussionReloadKey] = useState(0);

  const backTo =
    contentType === "insight"
      ? "/dashboard/insights"
      : contentType === "article"
      ? "/dashboard/articles"
      : "/dashboard/videos";

  const readingTime = item.body ? estimateReadingMinutes(item.body) : 5;
  const relatedCoin = item.related_coin_slug ? findCoinProfile(item.related_coin_slug) : undefined;

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoadingLikesComments(true);
      setCommentsError(null);

      try {
        const { count: totalLikes, error: likesError } = await supabase
          .from("content_likes")
          .select("*", { count: "exact", head: true })
          .eq("content_id", item.id);

        if (cancelled) return;
        if (likesError) throw likesError;
        setLikesCount(totalLikes || 0);

        const userId = user?.id;
        if (userId) {
          const { data: userLike, error: userLikeError } = await supabase
            .from("content_likes")
            .select("id")
            .eq("content_id", item.id)
            .eq("user_id", userId)
            .maybeSingle();

          if (cancelled) return;
          if (userLikeError) throw userLikeError;
          setHasLiked(!!userLike);
        } else {
          setHasLiked(false);
        }

        const { data: commentsList, error: commentsFetchError } = await supabase
          .from("content_comments")
          .select("id, content_id, user_id, text, created_at")
          .eq("content_id", item.id)
          .order("created_at", { ascending: false });

        if (cancelled) return;
        if (commentsFetchError) throw commentsFetchError;

        const rows = commentsList ?? [];
        const userIds = [...new Set(rows.map((c) => c.user_id).filter(Boolean))];

        let profileMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", userIds);

          if (cancelled) return;
          if (profilesError) throw profilesError;

          profileMap = Object.fromEntries(
            (profiles ?? []).map((p) => [
              p.id,
              { full_name: p.full_name, avatar_url: p.avatar_url },
            ]),
          );
        }

        setComments(
          rows.map((c) => ({
            ...c,
            profiles: profileMap[c.user_id] ?? null,
          })),
        );
      } catch (err: unknown) {
        if (cancelled) return;
        console.error("Error loading likes and comments:", err);
        setCommentsError(
          err instanceof Error ? err.message : "Could not load discussion. Please refresh.",
        );
      } finally {
        if (!cancelled) {
          setIsLoadingLikesComments(false);
        }
      }
    }

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [item.id, user?.id, discussionReloadKey, supabase]);

  const handleLikeToggle = async () => {
    if (!user) {
      toast.error("Please sign in to like this content");
      return;
    }

    // Optimistic update
    const originalHasLiked = hasLiked;
    const originalLikesCount = likesCount;
    setHasLiked(!originalHasLiked);
    setLikesCount((prev) => (originalHasLiked ? prev - 1 : prev + 1));

    try {
      if (originalHasLiked) {
        // Unlike
        const { error } = await supabase
          .from("content_likes")
          .delete()
          .eq("content_id", item.id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from("content_likes")
          .insert({
            content_id: item.id,
            user_id: user.id,
          });

        if (error) throw error;
      }
    } catch (err: any) {
      // Rollback
      setHasLiked(originalHasLiked);
      setLikesCount(originalLikesCount);
      toast.error(err.message || "Failed to update like status");
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to comment");
      return;
    }

    const trimmedText = newCommentText.trim();
    if (!trimmedText) return;

    if (trimmedText.length > 1000) {
      toast.error("Comment cannot exceed 1000 characters");
      return;
    }

    setIsSubmittingComment(true);
    try {
      const { data: insertedData, error } = await supabase
        .from("content_comments")
        .insert({
          content_id: item.id,
          user_id: user.id,
          text: trimmedText,
        })
        .select("id, content_id, user_id, text, created_at")
        .single();

      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      setComments((prev) => [
        {
          ...(insertedData as Omit<CommentWithProfile, "profiles">),
          profiles: profile ?? null,
        },
        ...prev,
      ]);
      setNewCommentText("");
      toast.success("Comment posted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to post comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("content_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) throw error;

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("Comment deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete comment");
    }
  };

  const handleShare = async () => {
    if (!item.slug?.trim()) {
      toast.error("This item has no shareable link yet.");
      return;
    }

    let isPublic = item.is_public;
    if (isPublic !== true) {
      const { data: shared } = await supabase
        .from("public_shared_content")
        .select("slug")
        .eq("slug", item.slug)
        .maybeSingle();
      isPublic = !!shared;
    }

    if (!isPublic) {
      toast.error("Make this content public in admin before copying a share link.");
      return;
    }

    setIsSharing(true);
    const url = getPublicShareUrl(item.slug);
    const result = await copyOrShareUrl(item.title, url);
    setIsSharing(false);

    if (result === "copied") {
      toast.success("Public link copied.");
    } else if (result === "shared") {
      toast.success("Link shared.");
    } else if (result === "failed") {
      toast.error("Could not copy link.");
    }
  };

  const scrollToComments = () => {
    const el = document.getElementById("comments-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <article className="-mt-2">
      <Link
        href={backTo}
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to {contentType}s
      </Link>

      {/* Hero Header */}
      <header className="mt-6 grid lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch">
        <div className="space-y-5 flex flex-col justify-center">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
              {item.category || contentType}
            </span>
            {item.is_premium && (
              <span className="flex items-center gap-1 rounded bg-foreground text-background px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase">
                <Lock className="h-2 w-2" /> PREMIUM
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl sm:text-5xl leading-[1.05] text-foreground">
            {item.title}
          </h1>

          {item.description && (
            <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
              {item.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-2">
            <span className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-full bg-gradient-to-br from-foreground/30 to-foreground/10 border border-white/10" />
              <span className="text-foreground">The Hano Insiders</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {readingTime} min read
            </span>
            {item.published_at && (
              <span>· {new Date(item.published_at).toLocaleDateString()}</span>
            )}
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <span
                  key={t}
                  className="text-[10px] font-mono text-muted-foreground/75 px-2 py-0.5 rounded bg-secondary/20"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {relatedCoin && (
            <Link
              href={`/dashboard/coins/${relatedCoin.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/20 px-3 py-2 text-xs text-foreground hover:bg-secondary/40 transition w-fit"
            >
              <Coins className="h-3.5 w-3.5 text-[oklch(0.78_0.14_85)]" />
              Related coin: {relatedCoin.name} ({relatedCoin.symbol})
            </Link>
          )}
        </div>

        <div className="relative h-64 lg:h-auto rounded-xl overflow-hidden border border-border bg-secondary/10">
          {item.thumbnail_url ? (
            <img
              loading="lazy"
              decoding="async"
              src={item.thumbnail_url}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground/30 font-mono text-xs">
              No Image Provided
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
        </div>
      </header>

      {/* Action bar */}
      <div className="mt-8 flex items-center justify-between border-y border-border py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={handleLikeToggle}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs hover:bg-accent transition ${
              hasLiked ? "text-[oklch(0.78_0.14_85)] bg-secondary/30" : "text-muted-foreground"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${hasLiked ? "fill-current" : ""}`} />
            {likesCount}
          </button>
          <button
            onClick={scrollToComments}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition"
          >
            <MessageCircle className="h-3.5 w-3.5" /> {comments.length}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSaved((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs hover:bg-accent transition ${
              saved ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
            {saved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={isSharing}
            title={item.is_public ? "Copy public share link" : "Not public — enable sharing in admin"}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition disabled:opacity-50"
          >
            <Share2 className="h-3.5 w-3.5" /> {isSharing ? "…" : "Share"}
          </button>
        </div>
      </div>

      {/* Body & Locked Content */}
      <div className="mt-10">
        {contentType === "video" && !locked && item.video_url && (
          <div className="mb-8 aspect-video w-full rounded-xl overflow-hidden border border-border bg-black">
            <iframe
              src={item.video_url}
              title={item.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
        )}

        <div className="relative">
          {locked ? (
            <>
              {/* Safe static placeholder — does NOT contain actual premium body */}
              <div className="pointer-events-none select-none blur-[6px] opacity-40 space-y-6">
                <p className="text-base sm:text-lg leading-[1.8]">
                  Across the last 48 hours, we have watched liquidity quietly rotate back into the
                  mid-cap basket. Funding stays neutral, perp open-interest is climbing, and on-chain
                  flows confirm the move. The cleanest market context are the ones the timeline ignores.
                </p>
                <h3 className="font-display text-2xl mt-8 mb-3">Technical structure shift</h3>
                <p className="text-base sm:text-lg leading-[1.8]">
                  We are long structure, not levels. Risk stays defined at the prior low; invalidation
                  is mechanical, not emotional. If the dollar rolls from here, the trade compounds.
                  Add on retests of broken resistance. Reduce into the next liquidity pocket.
                </p>
              </div>

              {/* Upgrade CTA overlay */}
              <div className="absolute inset-0 flex items-start justify-center pt-10">
                <div className="panel-elevated p-8 text-center max-w-md border border-border shadow-2xl">
                  <Lock className="h-6 w-6 mx-auto text-muted-foreground/60 mb-2 animate-pulse" />
                  <h3 className="font-display text-2xl text-foreground">Premium Analysis Locked</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    Upgrade to Premium to unlock the full analysis.
                  </p>
                  <Link
                    href="/pricing"
                    className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-foreground text-background font-semibold px-5 py-3 text-sm hover:opacity-90 transition"
                  >
                    Unlock with Premium
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <RichReader source={item.body || ""} />
          )}
        </div>
      </div>

      {/* Comments Section */}
      <section id="comments-section" className="mt-12 border-t border-border pt-10 pb-16">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-display text-xl sm:text-2xl text-foreground">
            Discussion ({comments.length})
          </h3>
        </div>

        {/* Comment input form */}
        {user ? (
          <form onSubmit={handlePostComment} className="mb-8 space-y-3">
            <div className="relative rounded-xl border border-border bg-secondary/5 p-3 focus-within:border-foreground/30 transition">
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Share your thoughts or analysis..."
                rows={3}
                className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-muted-foreground/60 text-foreground"
                maxLength={1000}
              />
              <div className="flex justify-between items-center mt-2 border-t border-border/40 pt-2.5">
                <span className="text-[10px] text-muted-foreground/60 font-mono">
                  {newCommentText.length} / 1000
                </span>
                <button
                  type="submit"
                  disabled={isSubmittingComment || !newCommentText.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background px-4 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-40 disabled:hover:opacity-40 transition cursor-pointer"
                >
                  {isSubmittingComment ? (
                    <span className="h-3.5 w-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  Post
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="panel p-6 mb-8 text-center bg-secondary/5 border border-border/60 rounded-xl">
            <p className="text-sm text-muted-foreground">
              Only members can join the discussion.{" "}
              <Link href="/login" className="text-foreground underline underline-offset-4 hover:text-[oklch(0.78_0.14_85)] transition-colors">
                Sign in
              </Link>{" "}
              or{" "}
              <Link href="/register" className="text-foreground underline underline-offset-4 hover:text-[oklch(0.78_0.14_85)] transition-colors">
                create an account
              </Link>{" "}
              to post a comment.
            </p>
          </div>
        )}

        {/* Comments listing */}
        {isLoadingLikesComments ? (
          <div className="flex items-center justify-center py-10">
            <span className="animate-spin rounded-full h-5 w-5 border-2 border-muted border-t-foreground" />
          </div>
        ) : commentsError ? (
          <div className="panel p-8 text-center border border-destructive/30 bg-destructive/5 rounded-xl">
            <p className="text-sm text-destructive">{commentsError}</p>
            <button
              type="button"
              onClick={() => setDiscussionReloadKey((k) => k + 1)}
              className="mt-3 text-xs underline text-muted-foreground hover:text-foreground"
            >
              Try again
            </button>
          </div>
        ) : comments.length === 0 ? (
          <div className="panel p-10 text-center border border-border/40 bg-secondary/5 rounded-xl">
            <MessageCircle className="h-8 w-8 text-muted-foreground/45 mx-auto mb-2" strokeWidth={1.2} />
            <p className="text-sm text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => {
              const isOwner = user?.id === comment.user_id;
              const commentatorName = comment.profiles?.full_name || "Hano Insiders Member";
              const commentatorInitials = commentatorName.charAt(0).toUpperCase();
              const commentatorAvatar = comment.profiles?.avatar_url;

              return (
                <div key={comment.id} className="group flex gap-4 items-start border-b border-border/30 pb-5 last:border-0 last:pb-0">
                  <div className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0">
                    {commentatorAvatar ? (
                      <img src={commentatorAvatar} alt={commentatorName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground uppercase">{commentatorInitials}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-foreground">{commentatorName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-muted-foreground/60 hover:text-destructive sm:opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-destructive/10 cursor-pointer"
                          title="Delete comment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {comment.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </article>
  );
}

