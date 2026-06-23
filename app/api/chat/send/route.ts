import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

  // Verify premium or admin
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_premium")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 403 });
  }

  const isPremium =
    profile.is_premium === true ||
    profile.role === "premium" ||
    profile.role === "admin";

  if (!isPremium) {
    return NextResponse.json(
      { error: "Premium membership required to send messages" },
      { status: 403 }
    );
  }

  // Check if user is muted/banned
  const { data: statusRow } = await supabase
    .from("chat_user_status")
    .select("status, until")
    .eq("user_id", user.id)
    .maybeSingle();

  if (statusRow && (statusRow.status === "muted" || statusRow.status === "banned")) {
    const expired = statusRow.until && new Date(statusRow.until) < new Date();
    if (!expired) {
      return NextResponse.json(
        {
          error:
            statusRow.status === "banned"
              ? "You have been banned from the community chat."
              : "You are temporarily muted from sending messages.",
        },
        { status: 403 }
      );
    }
  }

  // Parse body
  const body = await req.json().catch(() => null);
  if (!body || typeof body.content !== "string" || typeof body.room_id !== "string") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const content = body.content.trim();
  const roomId = body.room_id;
  const replyToId = body.reply_to_id ?? null;

  if (!content || content.length < 1 || content.length > 2000) {
    return NextResponse.json(
      { error: "Message must be between 1 and 2000 characters" },
      { status: 400 }
    );
  }

  // Verify room exists and check admin_only restriction
  const { data: room, error: roomError } = await supabase
    .from("chat_rooms")
    .select("id, admin_only")
    .eq("id", roomId)
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (room.admin_only && profile.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can post in this room" },
      { status: 403 }
    );
  }

  // Insert message
  const { data: message, error: insertError } = await supabase
    .from("chat_messages")
    .insert({
      room_id: roomId,
      user_id: user.id,
      content,
      reply_to_id: replyToId,
    })
    .select("id, content, created_at, user_id, room_id, reply_to_id")
    .single();

  if (insertError) {
    console.error("[chat/send] Insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }

  return NextResponse.json({ message }, { status: 201 });
}
