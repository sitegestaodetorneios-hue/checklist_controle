import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function toBool(v: any) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "sim" || s === "yes";
}

function toIntOrNull(v: any, label = "valor") {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).trim());
  if (!Number.isFinite(n)) return { error: `${label} inválido` as const };
  const i = Math.trunc(n);
  if (i < 0) return { error: `${label} não pode ser negativo` as const };
  return i;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login expirado" }, { status: 401 });
  if (!user.unidade_id) return NextResponse.json({ error: "Usuário sem unidade" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const carregamento_id = String(body?.carregamento_id || "").trim();
  if (!carregamento_id) return NextResponse.json({ error: "carregamento_id obrigatório" }, { status: 400 });

  // ✅ busca qtd_stretch_saida pra comparar no retorno
  const cQ = await supabaseAdmin
    .from("carregamentos")
    .select("id,unidade_id,leva_paleteira,leva_stretch,qtd_stretch_saida,exige_tubete_retorno,status")
    .eq("id", carregamento_id)
    .maybeSingle();

  if (cQ.error) return NextResponse.json({ error: cQ.error.message }, { status: 500 });
  if (!cQ.data) return NextResponse.json({ error: "Carregamento não encontrado" }, { status: 404 });
  if (String(cQ.data.unidade_id) !== String(user.unidade_id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const paleteira_devolvida = toBool(body?.paleteira_devolvida);
  const tubete_devolvido = toBool(body?.tubete_devolvido);
  const obs = String(body?.obs || "").trim() || null;

  // Paletes retorno
  const palParsed = toIntOrNull(body?.qtd_paletes_retorno, "qtd_paletes_retorno");
  if (typeof palParsed === "object" && palParsed?.error) {
    return NextResponse.json({ error: palParsed.error }, { status: 400 });
  }
  const qtd_paletes_retorno: number | null = palParsed as any;

  // Stretch retorno
  const strParsed = toIntOrNull(body?.qtd_stretch_retorno, "qtd_stretch_retorno");
  if (typeof strParsed === "object" && strParsed?.error) {
    return NextResponse.json({ error: strParsed.error }, { status: 400 });
  }
  const qtd_stretch_retorno: number | null = strParsed as any;

  // pendência: paleteira/tubete
  const pendPal = cQ.data.leva_paleteira && !paleteira_devolvida;
  const pendTub = cQ.data.exige_tubete_retorno && !tubete_devolvido;

  // ✅ pendência stretch: se levou stretch, precisa voltar a quantidade
  const saiuStretch = !!cQ.data.leva_stretch;
  const qtdSaiuStretch = Number(cQ.data.qtd_stretch_saida ?? 0);
  const qtdVoltouStretch = Number(qtd_stretch_retorno ?? 0);

  const pendStretch = saiuStretch
    ? (qtdSaiuStretch > 0 ? (qtdVoltouStretch < qtdSaiuStretch) : (qtdVoltouStretch <= 0))
    : false;

  const ok_final = !(pendPal || pendTub || pendStretch);

  // upsert retorno (1:1)
  const retQ = await supabaseAdmin
    .from("carregamento_retorno")
    .upsert(
      {
        carregamento_id,
        returned_by: user.id,
        paleteira_devolvida: cQ.data.leva_paleteira ? paleteira_devolvida : null,
        tubete_devolvido: cQ.data.exige_tubete_retorno ? tubete_devolvido : null,
        qtd_paletes_retorno,
        qtd_stretch_retorno,
        obs,
        ok_final,
      },
      { onConflict: "carregamento_id" }
    );

  if (retQ.error) return NextResponse.json({ error: retQ.error.message }, { status: 500 });

  // atualiza status do carregamento + salva campos no carregamento
  const status = ok_final ? "FECHADO" : "PENDENTE_DEVOLUCAO";

  const upd = await supabaseAdmin
    .from("carregamentos")
    .update({
      status,
      qtd_paletes_retorno,
      qtd_stretch_retorno,
    })
    .eq("id", carregamento_id);

  if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, ok_final, status });
}
