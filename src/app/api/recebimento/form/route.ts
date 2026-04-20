import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { getRecebimentoForm } from "@/lib/recebimentoStorage";
import { getRecebimentoProgress, getRecebimentoStatusLabel } from "@/lib/recebimentoProgress";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Login expirado" }, { status: 401 });
    if (!user.unidade_id) return NextResponse.json({ error: "Usuario sem unidade" }, { status: 400 });

    const url = new URL(req.url);
    const formId = String(url.searchParams.get("id") || "").trim();
    if (!formId) return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });

    const form = await getRecebimentoForm(user.unidade_id, formId);
    if (!form) return NextResponse.json({ error: "Formulario nao encontrado" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      form,
      progress: getRecebimentoProgress(form.rows),
      status_label: getRecebimentoStatusLabel(form),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao abrir formulario";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
