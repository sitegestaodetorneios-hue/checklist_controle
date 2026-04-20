import type { RecebimentoFormRecord, RecebimentoRow } from "@/lib/recebimentoTypes";

export const RECEBIMENTO_TOTAL_ROWS = 24;
export const RECEBIMENTO_EMPTY_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
export const RECEBIMENTO_AUTO_FINALIZE_TTL_MS = 20 * 60 * 60 * 1000;
export const RECEBIMENTO_REOPEN_CONFIRMATION_TEXT = "REABRIR FORMULARIO";

const ROW_FIELDS: Array<keyof RecebimentoRow> = [
  "operacao",
  "horarioChegada",
  "nf",
  "placa",
  "conferente",
  "cliente",
  "quantidadeVolumes",
  "peso",
  "filial",
  "doca",
  "horaInicio",
  "horaTermino",
];

export function isRecebimentoRowFilled(row: RecebimentoRow) {
  return ROW_FIELDS.some((field) => String(row?.[field] || "").trim() !== "");
}

export function getRecebimentoProgress(rows: RecebimentoRow[]) {
  const totalLinhas = rows.length;
  const totalPreenchidas = rows.filter(isRecebimentoRowFilled).length;

  return {
    totalLinhas,
    totalPreenchidas,
    isEmptyDraft: totalPreenchidas === 0,
    isComplete: totalLinhas > 0 && totalPreenchidas === totalLinhas,
  };
}

export function getRecebimentoStatusLabel(
  record: Pick<RecebimentoFormRecord, "rows" | "finalized_at" | "finalized_reason">
) {
  const progress = getRecebimentoProgress(record.rows);

  if (record.finalized_at) {
    if (record.finalized_reason === "auto_inactive") {
      return "Formulario encerrado automaticamente";
    }

    return "Formulario concluido";
  }

  if (progress.totalPreenchidas === 0) {
    return "Formulario iniciado e nao preenchido";
  }

  if (progress.isComplete) {
    return "Formulario preenchido";
  }

  return "Formulario em andamento";
}

export function isRecebimentoEmptyDraftExpired(
  record: Pick<RecebimentoFormRecord, "rows" | "updated_at">,
  now = Date.now()
) {
  const { isEmptyDraft } = getRecebimentoProgress(record.rows);
  if (!isEmptyDraft) return false;

  const updatedAt = new Date(record.updated_at).getTime();
  if (!Number.isFinite(updatedAt)) return false;

  return now - updatedAt >= RECEBIMENTO_EMPTY_DRAFT_TTL_MS;
}

export function shouldAutoFinalizeRecebimento(
  record: Pick<RecebimentoFormRecord, "updated_at" | "finalized_at">,
  now = Date.now()
) {
  if (record.finalized_at) return false;

  const updatedAt = new Date(record.updated_at).getTime();
  if (!Number.isFinite(updatedAt)) return false;

  return now - updatedAt >= RECEBIMENTO_AUTO_FINALIZE_TTL_MS;
}
