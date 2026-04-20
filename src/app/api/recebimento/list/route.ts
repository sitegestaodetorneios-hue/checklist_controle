import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { getRecebimentoProgress, getRecebimentoStatusLabel } from "@/lib/recebimentoProgress";
import { listRecebimentoForms } from "@/lib/recebimentoStorage";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Login expirado" }, { status: 401 });
    if (!user.unidade_id) return NextResponse.json({ error: "Usuario sem unidade" }, { status: 400 });

    const rows = await listRecebimentoForms(user.unidade_id);
    return NextResponse.json({
      ok: true,
      rows: rows.map((row) => {
        const progress = getRecebimentoProgress(row.rows);

        return {
          total_linhas: progress.totalLinhas,
          total_preenchidas: progress.totalPreenchidas,
          is_empty_draft: progress.isEmptyDraft,
          is_complete: progress.isComplete,
          finalized_at: row.finalized_at,
          finalized_reason: row.finalized_reason,
          last_reopened_at:
            row.reopen_events && row.reopen_events.length
              ? row.reopen_events[row.reopen_events.length - 1].reopened_at
              : null,
          last_reopened_by_username:
            row.reopen_events && row.reopen_events.length
              ? row.reopen_events[row.reopen_events.length - 1].reopened_by_username
              : "",
          last_reopened_by_nome:
            row.reopen_events && row.reopen_events.length
              ? row.reopen_events[row.reopen_events.length - 1].reopened_by_nome
              : "",
          id: row.id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          data_documento: row.data_documento,
          equipe_responsavel: row.equipe_responsavel,
          signature_name: row.signature_name,
          created_by_username: row.created_by_username,
          created_by_nome: row.created_by_nome,
          status_label: getRecebimentoStatusLabel(row),
          primeira_nf: row.rows.find((item) => item.nf)?.nf || "",
          primeira_placa: row.rows.find((item) => item.placa)?.placa || "",
        };
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao listar formularios";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
