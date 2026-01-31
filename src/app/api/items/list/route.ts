import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login expirado" }, { status: 401 });
  if (!user.unidade_id) return NextResponse.json({ error: "Usuário sem unidade" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const scope = String(searchParams.get("scope") || "").trim();
  const allowed = new Set(["turno_inicio", "carro_saida", "carro_retorno"]);
  if (!allowed.has(scope)) return NextResponse.json({ error: "scope inválido" }, { status: 400 });

  const q = await supabaseAdmin
    .from("checklist_items")
    .select("id,scope,label,kind,required,sort,meta")
    .eq("unidade_id", user.unidade_id)
    .eq("scope", scope)
    .eq("active", true)
    .order("sort", { ascending: true })
    .order("label", { ascending: true });

  if (q.error) return NextResponse.json({ error: q.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, items: q.data || [] });
}
