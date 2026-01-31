import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/currentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function normUsername(v: string) {
  return String(v || "").trim().toLowerCase();
}

export async function POST(req: Request) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Login expirado" }, { status: 401 });
  if (!admin.unidade_id) return NextResponse.json({ error: "Usuário sem unidade" }, { status: 400 });

  if (admin.role !== "admin_unit" && admin.role !== "admin_global") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const username = normUsername(body?.username);
  const nome = String(body?.nome || "").trim() || null;
  const senha = String(body?.senha || "").trim();
  const role = String(body?.role || "operador").trim() || "operador";

  const turno_default = String(body?.turno_default || "08:00").trim();
  const allowedTurnos = new Set(["08:00", "13:00", "23:00"]);
  if (!allowedTurnos.has(turno_default)) {
    return NextResponse.json({ error: "turno inválido" }, { status: 400 });
  }

  if (!username || username.length < 3) return NextResponse.json({ error: "username inválido" }, { status: 400 });
  if (!senha || senha.length < 4) return NextResponse.json({ error: "senha muito curta" }, { status: 400 });

  // bloqueia criação de admin por admin_unit (opcional; se quiser permitir, remova)
  if (admin.role === "admin_unit" && role === "admin_global") {
    return NextResponse.json({ error: "Somente admin_global pode criar admin_global" }, { status: 403 });
  }

  // evita duplicado na unidade
  const existsQ = await supabaseAdmin
    .from("ct_users")
    .select("id")
    .eq("unidade_id", admin.unidade_id)
    .eq("username", username)
    .maybeSingle();

  if (existsQ.error) return NextResponse.json({ error: existsQ.error.message }, { status: 500 });
  if (existsQ.data?.id) return NextResponse.json({ error: "Usuário já existe" }, { status: 409 });

  const password_hash = await bcrypt.hash(senha, 10);

  const ins = await supabaseAdmin
    .from("ct_users")
    .insert({
      username,
      nome,
      role,
      unidade_id: admin.unidade_id,
      ativo: true,
      password_hash,
    })
    .select("id,username,nome,role,ativo")
    .single();

  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

  // cria prefs padrão
  const prefsUp = await supabaseAdmin.from("user_prefs").upsert(
    {
      user_id: ins.data.id,
      unidade_id: admin.unidade_id,
      turno_default,
      notify_enabled: true,
      notify_checklist: true,
      notify_pendencias: true,
    },
    { onConflict: "user_id" }
  );

  if (prefsUp.error) return NextResponse.json({ error: prefsUp.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, user: ins.data });
}
