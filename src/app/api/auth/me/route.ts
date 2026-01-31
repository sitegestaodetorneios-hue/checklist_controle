import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login expirado" }, { status: 401 });

  const prefsQ = await supabaseAdmin
    .from("user_prefs")
    .select("turno_default,notify_enabled,notify_checklist,notify_pendencias")
    .eq("user_id", user.id)
    .maybeSingle();

  const prefs = prefsQ.data || {
    turno_default: "08:00",
    notify_enabled: true,
    notify_checklist: true,
    notify_pendencias: true,
  };

  return NextResponse.json({ ok: true, user, prefs });
}
