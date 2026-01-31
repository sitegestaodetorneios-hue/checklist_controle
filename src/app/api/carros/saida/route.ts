import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function toInt(v: any) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function toBool(v: any) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "sim" || s === "yes";
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login expirado" }, { status: 401 });
  if (!user.unidade_id) return NextResponse.json({ error: "Usuário sem unidade" }, { status: 400 });

  const body = await req.json().catch(() => ({}));

  const placa = String(body?.placa || "").trim() || null;
  const motorista = String(body?.motorista || "").trim() || null;
  const destino = String(body?.destino || "").trim() || null;

  const qtd_paletes = toInt(body?.qtd_paletes);

  const leva_paleteira = toBool(body?.leva_paleteira);
  const qtd_paleteira = leva_paleteira ? toInt(body?.qtd_paleteira) : null;

  const leva_stretch = toBool(body?.leva_stretch);
  const exige_tubete_retorno = leva_stretch ? toBool(body?.exige_tubete_retorno) : false;

  // ✅ NOVO: qtd stretch (obrigatório se leva_stretch)
  const qtd_stretch_saida = leva_stretch ? toInt(body?.qtd_stretch_saida) : null;
  if (leva_stretch) {
    if (!qtd_stretch_saida || qtd_stretch_saida <= 0) {
      return NextResponse.json({ error: "Informe a quantidade de stretch na saída" }, { status: 400 });
    }
  }

  const payload: any = {
    unidade_id: user.unidade_id,
    created_by: user.id,
    placa,
    motorista,
    destino,
    qtd_paletes,
    leva_paleteira,
    qtd_paleteira,
    leva_stretch,
    qtd_stretch_saida, // ✅ grava
    exige_tubete_retorno,
    status: "EM_ROTA",
  };

  const ins = await supabaseAdmin.from("carregamentos").insert(payload).select("id,created_at").single();
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: ins.data.id, created_at: ins.data.created_at });
}
