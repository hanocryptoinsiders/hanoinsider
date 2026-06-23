/**
 * app/api/notifications/read/route.ts
 *
 * POST /api/notifications/read
 * Body: { notificationId: string } or { all: true }
 *
 * Marks notification(s) as read for the current user.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (body.all === true) {
      // Mark ALL unread notifications as read
      const { data: notifications } = await supabase
        .from("notifications")
        .select("id");

      if (notifications && notifications.length > 0) {
        const { data: existingReads } = await supabase
          .from("notification_reads")
          .select("notification_id")
          .eq("user_id", user.id);

        const alreadyRead = new Set(
          (existingReads ?? []).map((r) => r.notification_id)
        );

        const toInsert = notifications
          .filter((n) => !alreadyRead.has(n.id))
          .map((n) => ({
            notification_id: n.id,
            user_id: user.id,
          }));

        if (toInsert.length > 0) {
          await supabase.from("notification_reads").insert(toInsert);
        }
      }

      return NextResponse.json({ success: true });
    }

    // Mark single notification as read
    const { notificationId } = body as { notificationId?: string };

    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId or all:true required" },
        { status: 400 }
      );
    }

    await supabase.from("notification_reads").upsert(
      {
        notification_id: notificationId,
        user_id: user.id,
      },
      { onConflict: "notification_id,user_id" }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[notifications/read] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
