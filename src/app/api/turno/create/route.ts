import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function toInt(v: any) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login expirado" }, { status: 401 });
  if (!user.unidade_id) return NextResponse.json({ error: "Usuário sem unidade" }, { status: 400 });

  const body = await req.json().catch(() => ({}));

  const turno_label = String(body?.turno_label || "").trim();
  if (!turno_label) return NextResponse.json({ error: "turno_label obrigatório" }, { status: 400 });

  const payload = {
    unidade_id: user.unidade_id,
    created_by: user.id,
    turno_label,

    coletores_total: toInt(body?.coletores_total),
    coletores_ok: toInt(body?.coletores_ok),
    coletores_obs: String(body?.coletores_obs || "").trim() || null,

    paleteiras_total: toInt(body?.paleteiras_total),
    paleteiras_ok: toInt(body?.paleteiras_ok),
    paleteiras_obs: String(body?.paleteiras_obs || "").trim() || null,

    status: "FECHADO",
  };

  const ins = await supabaseAdmin.from("turno_checklists").insert(payload).select("id,created_at").single();
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

  // === Itens extras (configuráveis no admin) ===
  const extras = body?.extras && typeof body.extras === "object" ? body.extras : null;
  if (extras) {
    const ids = Object.keys(extras).filter((x) => typeof x === "string" && x.length > 0);
    if (ids.length) {
      // valida itens pertencem à unidade e ao escopo
      const itemsQ = await supabaseAdmin
        .from("checklist_items")
        .select("id")
        .eq("unidade_id", user.unidade_id)
        .eq("scope", "turno_inicio")
        .in("id", ids);

      const allowed = new Set((itemsQ.data || []).map((r: any) => String(r.id)));
      const rows = ids
        .filter((id) => allowed.has(String(id)))
        .map((id) => ({
          unidade_id: user.unidade_id,
          scope: "turno_inicio",
          run_ref: ins.data.id,
          item_id: id,
          value: extras[id],
        }));

      if (rows.length) {
        await supabaseAdmin.from("checklist_answers").upsert(rows, { onConflict: "item_id,run_ref" });
      }
    }
  }

  return NextResponse.json({ ok: true, id: ins.data.id, created_at: ins.data.created_at });
}
