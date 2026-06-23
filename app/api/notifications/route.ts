/**
 * app/api/notifications/route.ts
 *
 * GET  /api/notifications        â€” Fetch recent notifications for the current user (with read status)
 * POST /api/notifications        â€” Create a new notification (admin only)
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    // Fetch last 20 notifications
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("id, title, message, type, link, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[notifications] fetch error:", error.message);
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    // Fetch which ones the user has read
    const { data: reads } = await supabase
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", user.id);

    const readSet = new Set((reads ?? []).map((r) => r.notification_id));

    const enriched = (notifications ?? []).map((n) => ({
      ...n,
      read: readSet.has(n.id),
    }));

    const unreadCount = enriched.filter((n) => !n.read).length;

    return NextResponse.json({ notifications: enriched, unreadCount });
  } catch (err) {
    console.error("[notifications] error:", err);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

export async function POST(request: Request) {
  try {
    // Verify admin
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, message, type = "info", link } = body as {
      title?: string;
      message?: string;
      type?: string;
      link?: string;
    };

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    const serviceClient = getServiceSupabase();

    const { data, error } = await serviceClient
      .from("notifications")
      .insert({
        title,
        message,
        type,
        link: link || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[notifications] create error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notification: data });
  } catch (err) {
    console.error("[notifications] POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    // Verify admin
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, title, message, type = "info", link } = body as {
      id?: string;
      title?: string;
      message?: string;
      type?: string;
      link?: string;
    };

    if (!id || !title || !message) {
      return NextResponse.json(
        { error: "Notification ID, title, and message are required" },
        { status: 400 }
      );
    }

    const serviceClient = getServiceSupabase();
    const { data, error } = await serviceClient
      .from("notifications")
      .update({
        title,
        message,
        type,
        link: link || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[notifications] update error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notification: data });
  } catch (err) {
    console.error("[notifications] PATCH error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // Verify admin
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
    }

    const serviceClient = getServiceSupabase();
    const { error } = await serviceClient
      .from("notifications")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[notifications] delete error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[notifications] DELETE error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
