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
  equipe_responsavel: string;
  data_documento: string;
  rows: RecebimentoRow[];
  model_code: string;
  model_version: string;
};

export const RECEBIMENTO_MODEL_CODE = "FOR-OP-TRA-013";
export const RECEBIMENTO_MODEL_VERSION = "05";
