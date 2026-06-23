import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

const ticketSchema = z.object({
  subject: z.string().min(3).max(140),
  message: z.string().min(10).max(5000),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, subject, message, status, created_at, updated_at, admin_response")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tickets: data || [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = ticketSchema.safeParse(await request.json());
  if (!payload.success) return NextResponse.json({ error: "Invalid ticket details" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({ user_id: user.id, subject: payload.data.subject, message: payload.data.message, status: "open" })
    .select("id, subject, message, status, created_at, updated_at, admin_response")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket: data });
}