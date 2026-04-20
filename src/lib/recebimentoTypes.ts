export type RecebimentoRow = {
  id: string;
  operacao: string;
  horarioChegada: string;
  nf: string;
  placa: string;
  conferente: string;
  cliente: string;
  quantidadeVolumes: string;
  peso: string;
  filial: string;
  doca: string;
  horaInicio: string;
  horaTermino: string;
};

export type RecebimentoReopenEvent = {
  reopened_at: string;
  reopened_by: string;
  reopened_by_username: string;
  reopened_by_nome: string;
  confirmation_text: string;
};

export type RecebimentoFormRecord = {
  id: string;
  unidade_id: string;
  created_by: string;
  created_by_username: string;
  created_by_nome: string;
  signature_name: string;
  signed_at: string;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
  finalized_by: string | null;
  finalized_by_username: string | null;
  finalized_by_nome: string | null;
  finalized_reason: "manual" | "auto_inactive" | null;
  equipe_responsavel: string;
  data_documento: string;
  rows: RecebimentoRow[];
  reopen_events: RecebimentoReopenEvent[];
  model_code: string;
  model_version: string;
};

export const RECEBIMENTO_MODEL_CODE = "FOR-OP-TRA-013";
export const RECEBIMENTO_MODEL_VERSION = "05";
