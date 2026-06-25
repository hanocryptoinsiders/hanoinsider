import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type ModerationAction =
  | "hide_message"
  | "unhide_message"
  | "delete_message"
  | "mute_user"
  | "ban_user"
  | "unban_user"
  | "unmute_user";

export async function POST(req: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!adminProfile || adminProfile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const action: ModerationAction = body.action;
  const messageId: string | undefined = body.message_id;
  const targetUserId: string | undefined = body.target_user_id;
  const reason: string | undefined = body.reason;
  const until: string | undefined = body.until; // ISO date string for mute duration
  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }

  let result: unknown = null;

  switch (action) {
    case "hide_message": {
      if (!messageId) return NextResponse.json({ error: "message_id required" }, { status: 400 });
      const { error } = await supabase
        .from("chat_messages")
        .update({ is_hidden: true })
        .eq("id", messageId);
      if (error) throw error;
      result = { hidden: true };
      break;
    }

    case "unhide_message": {
      if (!messageId) return NextResponse.json({ error: "message_id required" }, { status: 400 });
      const { error } = await supabase
        .from("chat_messages")
        .update({ is_hidden: false })
        .eq("id", messageId);
      if (error) throw error;
      result = { unhidden: true };
      break;
    }

    case "delete_message": {
      if (!messageId) return NextResponse.json({ error: "message_id required" }, { status: 400 });
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("id", messageId);
      if (error) throw error;
      result = { deleted: true };
      break;
    }

    case "mute_user": {
      if (!targetUserId) return NextResponse.json({ error: "target_user_id required" }, { status: 400 });
      const { error } = await supabase
        .from("chat_user_status")
        .upsert({
          user_id: targetUserId,
          status: "muted",
          until: until ?? null,
          reason: reason ?? null,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      result = { muted: true };
      break;
    }

    case "ban_user": {
      if (!targetUserId) return NextResponse.json({ error: "target_user_id required" }, { status: 400 });
      const { error } = await supabase
        .from("chat_user_status")
        .upsert({
          user_id: targetUserId,
          status: "banned",
          until: null, // permanent ban
          reason: reason ?? null,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      result = { banned: true };
      break;
    }

    case "unban_user":
    case "unmute_user": {
      if (!targetUserId) return NextResponse.json({ error: "target_user_id required" }, { status: 400 });
      const { error } = await supabase
        .from("chat_user_status")
        .upsert({
          user_id: targetUserId,
          status: "active",
          until: null,
          reason: null,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      result = { restored: true };
      break;
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  // Log the moderation action
  await supabase.from("chat_moderation_actions").insert({
    admin_id: user.id,
    target_user: targetUserId ?? null,
    message_id: messageId ?? null,
    action,
    reason: reason ?? null,
  });

  return NextResponse.json({ ok: true, result });
}
