import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isRecebimentoRowsEmpty,
  RECEBIMENTO_AUTO_FINALIZE_TTL_MS,
  shouldAutoFinalizeRecebimento,
} from "@/lib/recebimentoProgress";
import type { RecebimentoFormRecord } from "@/lib/recebimentoTypes";

const TABLE_NAME = "recebimento_forms";

function isMissingTableError(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string };
  const code = String(err?.code || "").toLowerCase();
  const message = String(err?.message || "").toLowerCase();
  const details = String(err?.details || "").toLowerCase();

  return (
    code === "42p01" ||
    code === "pgrst205" ||
    message.includes("relation") ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    details.includes("does not exist")
  );
}

function formatTableError(action: string, error: unknown) {
  const err = error as { message?: string };

  if (isMissingTableError(error)) {
    return `Tabela ${TABLE_NAME} ausente. Execute a migracao do recebimento antes de ${action}.`;
  }

  return `Erro ao ${action} na tabela: ${err?.message || "falha desconhecida"}`;
}

function normalizeRecord(record: RecebimentoFormRecord): RecebimentoFormRecord {
  return {
    ...record,
    finalized_at: record.finalized_at || null,
    finalized_by: record.finalized_by || null,
    finalized_by_username: record.finalized_by_username || null,
    finalized_by_nome: record.finalized_by_nome || null,
    finalized_reason: record.finalized_reason || (record.finalized_at ? "manual" : null),
    reopen_events: Array.isArray(record.reopen_events) ? record.reopen_events : [],
    rows: Array.isArray(record.rows) ? record.rows : [],
  };
}

async function getTableForm(unidadeId: string, formId: string) {
  const query = await supabaseAdmin
    .from(TABLE_NAME)
    .select("*")
    .eq("unidade_id", unidadeId)
    .eq("id", formId)
    .maybeSingle();

  if (query.error) {
    throw new Error(formatTableError("ler formulario", query.error));
  }

  return query.data ? normalizeRecord(query.data as RecebimentoFormRecord) : null;
}

async function saveTableForm(record: RecebimentoFormRecord) {
  const upsert = await supabaseAdmin.from(TABLE_NAME).upsert(record, { onConflict: "id" });

  if (upsert.error) {
    throw new Error(formatTableError("salvar formulario", upsert.error));
  }
}

async function listTableForms(unidadeId: string) {
  const query = await supabaseAdmin
    .from(TABLE_NAME)
    .select("*")
    .eq("unidade_id", unidadeId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (query.error) {
    throw new Error(formatTableError("listar formularios", query.error));
  }

  return (query.data || []).map((row) => normalizeRecord(row as RecebimentoFormRecord));
}

async function deleteTableForm(unidadeId: string, formId: string) {
  const deleted = await supabaseAdmin
    .from(TABLE_NAME)
    .delete()
    .eq("unidade_id", unidadeId)
    .eq("id", formId);

  if (deleted.error) {
    throw new Error(formatTableError("excluir formulario", deleted.error));
  }
}

async function autoFinalizeIfNeeded(record: RecebimentoFormRecord) {
  if (!shouldAutoFinalizeRecebimento(record)) return record;
  return autoFinalizeRecebimentoForm(record);
}

export async function getRecebimentoForm(unidadeId: string, formId: string) {
  const form = await getTableForm(unidadeId, formId);

  if (form && isRecebimentoRowsEmpty(form.rows)) {
    await deleteRecebimentoForm(unidadeId, formId);
    return null;
  }

  if (form) {
    return autoFinalizeIfNeeded(form);
  }

  return null;
}

export async function saveRecebimentoForm(record: RecebimentoFormRecord) {
  const normalized = normalizeRecord(record);
  await saveTableForm(normalized);
  return { id: normalized.id };
}

export async function autoFinalizeRecebimentoForm(record: RecebimentoFormRecord) {
  if (record.finalized_at) {
    return record;
  }

  const finalizedAt = new Date(
    new Date(record.updated_at).getTime() + RECEBIMENTO_AUTO_FINALIZE_TTL_MS
  ).toISOString();

  const nextRecord: RecebimentoFormRecord = normalizeRecord({
    ...record,
    finalized_at: finalizedAt,
    finalized_by: "system:auto-finalize",
    finalized_by_username: "sistema",
    finalized_by_nome: "Finalizacao automatica",
    finalized_reason: "auto_inactive",
    signed_at: record.signed_at || finalizedAt,
  });

  await saveRecebimentoForm(nextRecord);
  return nextRecord;
}

export async function deleteRecebimentoForm(unidadeId: string, formId: string) {
  await deleteTableForm(unidadeId, formId);
}

export async function cleanupExpiredRecebimentoDrafts(unidadeId: string) {
  const rows = await listTableForms(unidadeId);
  let removed = 0;

  for (const row of rows) {
    if (!isRecebimentoRowsEmpty(row.rows)) continue;
    await deleteRecebimentoForm(unidadeId, row.id);
    removed += 1;
  }

  return { removed };
}

export async function finalizeInactiveRecebimentoForms(unidadeId: string) {
  const rows = await listTableForms(unidadeId);
  let finalized = 0;

  for (const row of rows) {
    if (!shouldAutoFinalizeRecebimento(row)) continue;
    await autoFinalizeRecebimentoForm(row);
    finalized += 1;
  }

  return { finalized };
}

export async function listRecebimentoForms(unidadeId: string) {
  await cleanupExpiredRecebimentoDrafts(unidadeId);
  await finalizeInactiveRecebimentoForms(unidadeId);

  const rows = await listTableForms(unidadeId);
  return rows.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}
