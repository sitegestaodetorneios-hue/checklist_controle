import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function asStr(v: any) {
  return String(v ?? "").trim();
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login expirado" }, { status: 401 });
  if (!user.unidade_id) return NextResponse.json({ error: "Usuário sem unidade" }, { status: 400 });

  const url = new URL(req.url);

  const from = asStr(url.searchParams.get("from")); // YYYY-MM-DD
  const to = asStr(url.searchParams.get("to"));     // YYYY-MM-DD
  const created_by = asStr(url.searchParams.get("user_id")); // filtro de usuário (mantive o nome user_id pra UI)
  const only_pending = url.searchParams.get("only_pending") === "1";
  const status = asStr(url.searchParams.get("status")); // opcional: FECHADO / PENDENTE / etc

  let q = supabaseAdmin
    .from("turno_checklists")
    .select(
      "id,created_at,unidade_id,created_by,turno_label,coletores_total,coletores_ok,coletores_obs,paleteiras_total,paleteiras_ok,paleteiras_obs,status"
    )
    .eq("unidade_id", user.unidade_id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (from) q = q.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) q = q.lte("created_at", `${to}T23:59:59.999Z`);
  if (created_by) q = q.eq("created_by", created_by);
  if (status) q = q.eq("status", status);

  const cQ = await q;
  if (cQ.error) return NextResponse.json({ error: cQ.error.message }, { status: 500 });

  const baseRows = (cQ.data || []) as any[];

  // busca usuários (para exibir nome)
  const usersQ = await supabaseAdmin
    .from("ct_users")
    .select("id,username,nome")
    .eq("unidade_id", user.unidade_id);

  if (usersQ.error) return NextResponse.json({ error: usersQ.error.message }, { status: 500 });

  const uMap = new Map<string, any>();
  for (const u of (usersQ.data || []) as any[]) uMap.set(String(u.id), u);

  // status “pendente” (na sua tabela) provavelmente é status != FECHADO
  // mas pra não inventar, vamos usar:
  const rows = baseRows.map((r) => {
    const u = uMap.get(String(r.created_by)) || null;
    return {
      ...r,
      user: u ? { id: u.id, username: u.username, nome: u.nome } : null,
    };
  });

  const filtered = only_pending ? rows.filter((x) => String(x.status).toUpperCase() !== "FECHADO") : rows;

  const summary = {
    total: filtered.length,
    fechado: filtered.filter((x) => String(x.status).toUpperCase() === "FECHADO").length,
    pendente: filtered.filter((x) => String(x.status).toUpperCase() !== "FECHADO").length,
  };

  const usersForFilter = (usersQ.data || []).map((u: any) => ({
    id: u.id,
    label: u.nome ? `${u.username} • ${u.nome}` : u.username,
  }));

  return NextResponse.json({ ok: true, rows: filtered, summary, users: usersForFilter });
}
