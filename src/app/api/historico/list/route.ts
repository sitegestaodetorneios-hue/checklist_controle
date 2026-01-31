import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function asStr(v: any) {
  return String(v ?? "").trim();
}
function asLower(v: any) {
  return asStr(v).toLowerCase();
}
function toInt0(v: any) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
function toIntNull(v: any) {
  const s = asStr(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login expirado" }, { status: 401 });
  if (!user.unidade_id) return NextResponse.json({ error: "Usuário sem unidade" }, { status: 400 });

  const url = new URL(req.url);
  const placa = asLower(url.searchParams.get("placa"));
  const status = asStr(url.searchParams.get("status")); // "" = todos
  const only_div = url.searchParams.get("only_div") === "1";
  const dfrom = asStr(url.searchParams.get("from")); // yyyy-mm-dd
  const dto = asStr(url.searchParams.get("to"));     // yyyy-mm-dd

  let q = supabaseAdmin
    .from("carregamentos")
    .select(
      "id,created_at,placa,motorista,destino,status,qtd_paletes,qtd_paletes_retorno,leva_paleteira,qtd_paleteira,leva_stretch,qtd_stretch_saida,qtd_stretch_retorno,exige_tubete_retorno"
    )
    .eq("unidade_id", user.unidade_id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (status) q = q.eq("status", status);
  if (placa) q = q.ilike("placa", `%${placa}%`);
  if (dfrom) q = q.gte("created_at", `${dfrom}T00:00:00.000Z`);
  if (dto) q = q.lte("created_at", `${dto}T23:59:59.999Z`);

  const cQ = await q;
  if (cQ.error) return NextResponse.json({ error: cQ.error.message }, { status: 500 });

  const carregamentos = (cQ.data || []) as any[];

  // busca retornos (1:1) para completar devoluções e quantidades
  const ids = carregamentos.map((x) => x.id);
  let retornoMap = new Map<string, any>();
  if (ids.length) {
    const rQ = await supabaseAdmin
      .from("carregamento_retorno")
      .select("carregamento_id,paleteira_devolvida,tubete_devolvido,qtd_paletes_retorno,qtd_stretch_retorno,ok_final")
      .in("carregamento_id", ids);

    if (rQ.error) return NextResponse.json({ error: rQ.error.message }, { status: 500 });

    retornoMap = new Map((rQ.data || []).map((r: any) => [String(r.carregamento_id), r]));
  }

  const rows = carregamentos.map((c) => {
    const ret = retornoMap.get(String(c.id)) || null;

    const pal_saida = toInt0(c.qtd_paletes);
    const pal_ret = (c.qtd_paletes_retorno ?? ret?.qtd_paletes_retorno);
    const pal_retorno = pal_ret == null ? null : toInt0(pal_ret);

    const st_saida = c.qtd_stretch_saida == null ? 0 : toInt0(c.qtd_stretch_saida);
    const st_ret = (c.qtd_stretch_retorno ?? ret?.qtd_stretch_retorno);
    const st_retorno = st_ret == null ? null : toInt0(st_ret);

    const saldo_paletes = pal_retorno == null ? null : (pal_retorno - pal_saida);
    const faltam_paletes = saldo_paletes != null && saldo_paletes < 0 ? Math.abs(saldo_paletes) : 0;

    const saldo_stretch = st_retorno == null ? null : (st_retorno - st_saida);
    const faltam_stretch = saldo_stretch != null && saldo_stretch < 0 ? Math.abs(saldo_stretch) : 0;

    const precisa: string[] = [];
    // pendências “lógicas”
    const paleteiraDev = ret?.paleteira_devolvida;
    const tubeteDev = ret?.tubete_devolvido;

    if (c.leva_paleteira && paleteiraDev !== true) precisa.push("Paleteira");
    if (c.exige_tubete_retorno && tubeteDev !== true) precisa.push("Tubete");
    if (c.leva_stretch && (st_saida > 0) && (st_retorno == null || toInt0(st_retorno) < st_saida)) precisa.push("Stretch");
    if (pal_retorno != null && pal_retorno < pal_saida) precisa.push("Paletes");

    const divergencia = precisa.length > 0;

    return {
      ...c,
      retorno: ret ? {
        paleteira_devolvida: ret.paleteira_devolvida,
        tubete_devolvido: ret.tubete_devolvido,
        qtd_paletes_retorno: ret.qtd_paletes_retorno,
        qtd_stretch_retorno: ret.qtd_stretch_retorno,
        ok_final: ret.ok_final,
      } : null,
      calc: {
        pal_saida,
        pal_retorno: pal_retorno,
        saldo_paletes,
        faltam_paletes,
        st_saida,
        st_retorno: st_retorno,
        saldo_stretch,
        faltam_stretch,
        precisa_devolver: precisa,
        divergencia,
      },
    };
  });

  const filtered = only_div ? rows.filter((r) => r.calc.divergencia) : rows;

  // Encontro de contas por placa
  const agg = new Map<string, any>();
  for (const r of filtered) {
    const key = asStr(r.placa) || "(SEM_PLACA)";
    const cur = agg.get(key) || {
      placa: key,
      saida_paletes: 0,
      retorno_paletes: 0,
      faltam_paletes: 0,
      saida_stretch: 0,
      retorno_stretch: 0,
      faltam_stretch: 0,
      pendencias: 0,
      registros: 0,
    };

    cur.saida_paletes += r.calc.pal_saida || 0;
    cur.retorno_paletes += (r.calc.pal_retorno ?? 0);
    cur.faltam_paletes += r.calc.faltam_paletes || 0;

    cur.saida_stretch += r.calc.st_saida || 0;
    cur.retorno_stretch += (r.calc.st_retorno ?? 0);
    cur.faltam_stretch += r.calc.faltam_stretch || 0;

    cur.pendencias += (r.calc.precisa_devolver?.length || 0) > 0 ? 1 : 0;
    cur.registros += 1;

    agg.set(key, cur);
  }

  const byPlaca = Array.from(agg.values()).sort((a, b) => (b.faltam_paletes + b.faltam_stretch) - (a.faltam_paletes + a.faltam_stretch));

  return NextResponse.json({ ok: true, rows: filtered, byPlaca });
}
