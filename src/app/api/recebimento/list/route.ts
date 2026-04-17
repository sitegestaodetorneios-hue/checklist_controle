import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { listRecebimentoForms } from "@/lib/recebimentoStorage";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Login expirado" }, { status: 401 });
    if (!user.unidade_id) return NextResponse.json({ error: "Usuario sem unidade" }, { status: 400 });

    const rows = await listRecebimentoForms(user.unidade_id);
    return NextResponse.json({
      ok: true,
      rows: rows.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        data_documento: row.data_documento,
        equipe_responsavel: row.equipe_responsavel,
        signature_name: row.signature_name,
        created_by_username: row.created_by_username,
        created_by_nome: row.created_by_nome,
        total_linhas: row.rows.length,
        total_preenchidas: row.rows.filter(
          (item) =>
            item.operacao ||
            item.horarioChegada ||
            item.nf ||
            item.placa ||
            item.conferente ||
            item.cliente ||
            item.quantidadeVolumes ||
            item.peso ||
            item.filial ||
            item.doca ||
            item.horaInicio ||
            item.horaTermino
        ).length,
        primeira_nf: row.rows.find((item) => item.nf)?.nf || "",
        primeira_placa: row.rows.find((item) => item.placa)?.placa || "",
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao listar formularios";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
