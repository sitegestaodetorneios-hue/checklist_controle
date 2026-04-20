create table if not exists public.recebimento_forms (
  id text primary key,
  unidade_id text not null,
  created_by text not null,
  created_by_username text not null default '',
  created_by_nome text not null default '',
  signature_name text not null default '',
  signed_at timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  finalized_at timestamptz null,
  finalized_by text null,
  finalized_by_username text null,
  finalized_by_nome text null,
  finalized_reason text null check (finalized_reason in ('manual', 'auto_inactive')),
  equipe_responsavel text not null default '',
  data_documento text not null default '',
  rows jsonb not null default '[]'::jsonb,
  reopen_events jsonb not null default '[]'::jsonb,
  model_code text not null,
  model_version text not null
);

create index if not exists recebimento_forms_unidade_updated_idx
  on public.recebimento_forms (unidade_id, updated_at desc);

create index if not exists recebimento_forms_unidade_finalized_idx
  on public.recebimento_forms (unidade_id, finalized_at);
