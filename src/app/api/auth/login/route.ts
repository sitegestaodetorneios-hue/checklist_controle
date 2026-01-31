import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const COOKIE_NAME = "ct_sid";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = String(body?.username || "").trim();
  const senha = String(body?.senha || "").trim();

  if (!username || !senha) {
    return NextResponse.json({ error: "Informe usuário e senha" }, { status: 400 });
  }

  const uQ = await supabaseAdmin
    .from("ct_users")
    .select("id,username,password_hash,ativo")
    .eq("username", username)
    .maybeSingle();

  if (uQ.error) return NextResponse.json({ error: uQ.error.message }, { status: 500 });
  if (!uQ.data) return NextResponse.json({ error: "Usuário ou senha inválidos" }, { status: 401 });
  if (!uQ.data.ativo) return NextResponse.json({ error: "Usuário inativo." }, { status: 403 });

  const ok = await bcrypt.compare(senha, String(uQ.data.password_hash || ""));
  if (!ok) return NextResponse.json({ error: "Usuário ou senha inválidos" }, { status: 401 });

  // cria sessão
  const sid = crypto.randomUUID();
  const ins = await supabaseAdmin.from("ct_sessions").insert({ id: sid, user_id: uQ.data.id });
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

  const res = NextResponse.json({ ok: true });

  // ✅ DEV: secure=false senão não grava no http://localhost
  res.cookies.set({
    name: COOKIE_NAME,
    value: sid,
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return res;
}
