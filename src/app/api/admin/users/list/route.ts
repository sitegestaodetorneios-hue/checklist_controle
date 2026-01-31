import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login expirado" }, { status: 401 });
  if (!user.unidade_id) return NextResponse.json({ error: "Usuário sem unidade" }, { status: 400 });

  if (user.role !== "admin_unit" && user.role !== "admin_global") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const uQ = await supabaseAdmin
    .from("ct_users")
    .select("id,username,nome,role,unidade_id,ativo")
    .eq("unidade_id", user.unidade_id)
    .order("username", { ascending: true });

  if (uQ.error) return NextResponse.json({ error: uQ.error.message }, { status: 500 });

  const prefsQ = await supabaseAdmin
    .from("user_prefs")
    .select("user_id,turno_default,notify_enabled,notify_checklist,notify_pendencias")
    .eq("unidade_id", user.unidade_id);

  if (prefsQ.error) return NextResponse.json({ error: prefsQ.error.message }, { status: 500 });

  const prefs = new Map<string, any>();
  for (const p of (prefsQ.data || []) as any[]) prefs.set(String(p.user_id), p);

  const rows = (uQ.data || []).map((u: any) => {
    const p = prefs.get(String(u.id)) || null;
    return {
      ...u,
      prefs: p || {
        turno_default: "08:00",
        notify_enabled: true,
        notify_checklist: true,
        notify_pendencias: true,
      },
    };
  });

  return NextResponse.json({ ok: true, rows });
}
