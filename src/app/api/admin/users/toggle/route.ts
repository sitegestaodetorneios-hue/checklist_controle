import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Login expirado" }, { status: 401 });
  if (!admin.unidade_id) return NextResponse.json({ error: "Usuário sem unidade" }, { status: 400 });

  if (admin.role !== "admin_unit" && admin.role !== "admin_global") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const user_id = String(body?.user_id || "").trim();
  const ativo = !!body?.ativo;

  if (!user_id) return NextResponse.json({ error: "user_id obrigatório" }, { status: 400 });
  if (user_id === admin.id) return NextResponse.json({ error: "Você não pode se desativar" }, { status: 400 });

  // garante mesma unidade
  const uQ = await supabaseAdmin
    .from("ct_users")
    .select("id,unidade_id")
    .eq("id", user_id)
    .maybeSingle();

  if (uQ.error) return NextResponse.json({ error: uQ.error.message }, { status: 500 });
  if (!uQ.data) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if (String(uQ.data.unidade_id) !== String(admin.unidade_id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const up = await supabaseAdmin.from("ct_users").update({ ativo }).eq("id", user_id);
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
