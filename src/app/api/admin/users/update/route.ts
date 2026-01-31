import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login expirado" }, { status: 401 });
  if (!user.unidade_id) return NextResponse.json({ error: "Usuário sem unidade" }, { status: 400 });

  if (user.role !== "admin_unit" && user.role !== "admin_global") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const user_id = String(body?.user_id || "").trim();
  if (!user_id) return NextResponse.json({ error: "user_id obrigatório" }, { status: 400 });

  const turno_default = String(body?.turno_default || "08:00").trim();
  const allowed = new Set(["08:00", "13:00", "23:00"]);
  if (!allowed.has(turno_default)) return NextResponse.json({ error: "turno inválido" }, { status: 400 });

  const payload = {
    user_id,
    unidade_id: user.unidade_id,
    turno_default,
    notify_enabled: !!body?.notify_enabled,
    notify_checklist: !!body?.notify_checklist,
    notify_pendencias: !!body?.notify_pendencias,
  };

  const up = await supabaseAdmin.from("user_prefs").upsert(payload, { onConflict: "user_id" });
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
