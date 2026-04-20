import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import {
  getRecebimentoProgress,
  getRecebimentoStatusLabel,
  RECEBIMENTO_REOPEN_CONFIRMATION_TEXT,
} from "@/lib/recebimentoProgress";
import { getRecebimentoForm, saveRecebimentoForm } from "@/lib/recebimentoStorage";
import type { RecebimentoFormRecord } from "@/lib/recebimentoTypes";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Login expirado" }, { status: 401 });
    }

    if (!user.unidade_id) {
      return NextResponse.json({ error: "Usuario sem unidade" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const formId = cleanText(body?.id);
    const confirmationText = cleanText(body?.confirmationText).toUpperCase();

    if (!formId) {
      return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });
    }

    if (confirmationText !== RECEBIMENTO_REOPEN_CONFIRMATION_TEXT) {
      return NextResponse.json(
        { error: `Digite exatamente "${RECEBIMENTO_REOPEN_CONFIRMATION_TEXT}" para reabrir.` },
        { status: 400 }
      );
    }

    const existing = await getRecebimentoForm(user.unidade_id, formId);

    if (!existing) {
      return NextResponse.json({ error: "Formulario nao encontrado" }, { status: 404 });
    }

    if (!existing.finalized_at) {
      return NextResponse.json({
        ok: true,
        form: existing,
        progress: getRecebimentoProgress(existing.rows),
        status_label: getRecebimentoStatusLabel(existing),
      });
    }

    const reopenedAt = new Date().toISOString();
    const nextRecord: RecebimentoFormRecord = {
      ...existing,
      updated_at: reopenedAt,
      finalized_at: null,
      finalized_by: null,
      finalized_by_username: null,
      finalized_by_nome: null,
      finalized_reason: null,
      reopen_events: [
        ...(existing.reopen_events || []),
        {
          reopened_at: reopenedAt,
          reopened_by: user.id,
          reopened_by_username: user.username || "",
          reopened_by_nome: user.nome || "",
          confirmation_text: RECEBIMENTO_REOPEN_CONFIRMATION_TEXT,
        },
      ],
    };

    await saveRecebimentoForm(nextRecord);

    return NextResponse.json({
      ok: true,
      form: nextRecord,
      progress: getRecebimentoProgress(nextRecord.rows),
      status_label: getRecebimentoStatusLabel(nextRecord),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao reabrir formulario";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
