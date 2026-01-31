import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login expirado" }, { status: 401 });
  if (!user.unidade_id) return NextResponse.json({ error: "Usuário sem unidade" }, { status: 400 });

  const q = await supabaseAdmin
    .from("carregamentos")
    .select(
      "id,created_at,placa,motorista,destino,qtd_paletes,qtd_paletes_retorno,leva_paleteira,qtd_paleteira,leva_stretch,exige_tubete_retorno,status"
    )
    .eq("unidade_id", user.unidade_id)
    // ✅ mostra tudo que ainda não foi fechado
    .neq("status", "FECHADO")
    .order("created_at", { ascending: false })
    .limit(200);

  if (q.error) return NextResponse.json({ error: q.error.message }, { status: 500 });

  const rows = (q.data || []).map((r: any) => {
    const precisa: string[] = [];
    if (r.leva_paleteira) precisa.push("Paleteira");
    if (r.exige_tubete_retorno) precisa.push("Tubete");
    return { ...r, precisa_devolver: precisa };
  });

  return NextResponse.json({ ok: true, rows });
}
