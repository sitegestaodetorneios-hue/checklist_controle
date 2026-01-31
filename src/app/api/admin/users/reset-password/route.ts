import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/currentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function genTempPassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(req: Request) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Login expirado" }, { status: 401 });
  if (!admin.unidade_id) return NextResponse.json({ error: "Usuário sem unidade" }, { status: 400 });

  if (admin.role !== "admin_unit" && admin.role !== "admin_global") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const user_id = String(body?.user_id || "").trim();
  if (!user_id) return NextResponse.json({ error: "user_id obrigatório" }, { status: 400 });

  // garante mesma unidade
  const uQ = await supabaseAdmin
    .from("ct_users")
    .select("id,unidade_id,username")
    .eq("id", user_id)
    .maybeSingle();

  if (uQ.error) return NextResponse.json({ error: uQ.error.message }, { status: 500 });
  if (!uQ.data) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if (String(uQ.data.unidade_id) !== String(admin.unidade_id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const temp = genTempPassword(10);
  const hash = await bcrypt.hash(temp, 10);

  const up = await supabaseAdmin.from("ct_users").update({ password_hash: hash }).eq("id", user_id);
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });

  // retorna a senha temporária para o admin repassar
  return NextResponse.json({ ok: true, username: uQ.data.username, temp_password: temp });
}
