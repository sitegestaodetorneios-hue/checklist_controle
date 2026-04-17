import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { getRecebimentoForm, saveRecebimentoForm } from "@/lib/recebimentoStorage";
import {
  RECEBIMENTO_MODEL_CODE,
  RECEBIMENTO_MODEL_VERSION,
  type RecebimentoFormRecord,
  type RecebimentoRow,
} from "@/lib/recebimentoTypes";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeRows(rows: unknown): RecebimentoRow[] {
  if (!Array.isArray(rows)) return [];

  return rows.map((row, index) => {
    const item = row && typeof row === "object" ? (row as Record<string, unknown>) : {};

    return {
      id: cleanText(item.id) || `row-${index + 1}`,
      operacao: cleanText(item.operacao),
      horarioChegada: cleanText(item.horarioChegada),
      nf: cleanText(item.nf),
      placa: cleanText(item.placa).toUpperCase(),
      conferente: cleanText(item.conferente),
      cliente: cleanText(item.cliente),
      quantidadeVolumes: cleanText(item.quantidadeVolumes),
      peso: cleanText(item.peso),
      filial: cleanText(item.filial),
      doca: cleanText(item.doca),
      horaInicio: cleanText(item.horaInicio),
      horaTermino: cleanText(item.horaTermino),
    };
  });
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
    const formId = cleanText(body?.id) || crypto.randomUUID();
    const now = new Date().toISOString();

    let existing: RecebimentoFormRecord | null = null;

    try {
      existing = await getRecebimentoForm(user.unidade_id, formId);
    } catch (error) {
      console.warn("[recebimento/save] formulario novo ou falha ao ler existente:", error);
      existing = null;
    }

    const record: RecebimentoFormRecord = {
      id: formId,
      unidade_id: user.unidade_id,
      created_by: existing?.created_by || user.id,
      created_by_username: existing?.created_by_username || user.username || "",
      created_by_nome: existing?.created_by_nome || user.nome || "",
      signature_name:
        existing?.signature_name || user.nome || user.username || "Usuario responsavel",
      signed_at: existing?.signed_at || now,
      created_at: existing?.created_at || now,
      updated_at: now,
      equipe_responsavel:
        cleanText(body?.equipeResponsavel) ||
        existing?.equipe_responsavel ||
        user.nome ||
        user.username ||
        "",
      data_documento:
        cleanText(body?.dataDocumento) ||
        existing?.data_documento ||
        "",
      rows: normalizeRows(body?.rows),
      model_code: RECEBIMENTO_MODEL_CODE,
      model_version: RECEBIMENTO_MODEL_VERSION,
    };

    await saveRecebimentoForm(record);

    return NextResponse.json({ ok: true, form: record });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha interna ao salvar formulario";

    console.error("[recebimento/save] erro:", error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}