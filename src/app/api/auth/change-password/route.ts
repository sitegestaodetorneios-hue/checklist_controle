import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/currentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login expirado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body?.current_password || "").trim();
  const newPassword = String(body?.new_password || "").trim();

  if (!currentPassword) return NextResponse.json({ error: "Senha atual obrigatória" }, { status: 400 });
  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "Nova senha deve ter no mínimo 6 caracteres" }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: "A nova senha não pode ser igual à senha atual" }, { status: 400 });
  }

  // Busca hash atual
  const uQ = await supabaseAdmin
    .from("ct_users")
    .select("id,ativo,password_hash")
    .eq("id", user.id)
    .maybeSingle();

  if (uQ.error) return NextResponse.json({ error: uQ.error.message }, { status: 500 });
  if (!uQ.data) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if (uQ.data.ativo === false) return NextResponse.json({ error: "Usuário inativo" }, { status: 403 });

  const ok = await bcrypt.compare(currentPassword, String(uQ.data.password_hash || ""));
  if (!ok) return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });

  const hash = await bcrypt.hash(newPassword, 10);

  const up = await supabaseAdmin
    .from("ct_users")
    .update({ password_hash: hash })
    .eq("id", user.id);

  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
