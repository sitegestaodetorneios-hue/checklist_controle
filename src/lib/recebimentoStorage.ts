import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { RecebimentoFormRecord } from "@/lib/recebimentoTypes";

const BUCKET_NAME = "recebimento-formularios";
let bucketReady: Promise<void> | null = null;

function sanitizeSegment(value: string) {
  return String(value).replace(/[\\/?#%*:|"<>]/g, "-");
}

function getFormPath(unidadeId: string, formId: string) {
  const safeUnit = sanitizeSegment(unidadeId);
  const safeForm = sanitizeSegment(formId);
  return `${safeUnit}/${safeForm}.json`;
}

function getUnitFolder(unidadeId: string) {
  return sanitizeSegment(unidadeId);
}

async function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const list = await supabaseAdmin.storage.listBuckets();

      if (list.error) {
        throw new Error(`Erro ao listar buckets: ${list.error.message}`);
      }

      const exists = (list.data || []).some((bucket) => bucket.name === BUCKET_NAME);
      if (exists) return;

      const created = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: false,
        allowedMimeTypes: ["application/json"],
        fileSizeLimit: "2MB",
      });

      if (created.error) {
        const msg = String(created.error.message || "");
        const lower = msg.toLowerCase();

        if (
          !lower.includes("already exists") &&
          !lower.includes("duplicate") &&
          !lower.includes("exists")
        ) {
          throw new Error(`Erro ao criar bucket ${BUCKET_NAME}: ${msg}`);
        }
      }
    })();
  }

  try {
    await bucketReady;
  } catch (error) {
    bucketReady = null;
    throw error;
  }
}

async function readForm(path: string) {
  await ensureBucket();

  const downloaded = await supabaseAdmin.storage.from(BUCKET_NAME).download(path);

  if (downloaded.error) {
    const err = downloaded.error as {
      message?: string;
      status?: number;
      statusCode?: string | number;
      code?: string;
      error?: string;
      name?: string;
    };

    const message = String(err.message || "").toLowerCase();
    const code = String(err.code || err.error || err.name || "").toLowerCase();
    const status = Number(err.status ?? err.statusCode ?? 0);

    const isNotFound =
      status === 404 ||
      code.includes("nosuchkey") ||
      code.includes("not_found") ||
      code.includes("not found") ||
      message.includes("nosuchkey") ||
      message.includes("not_found") ||
      message.includes("not found") ||
      message.includes("object not found") ||
      message.includes("does not exist") ||
      message.includes('"url"');

    if (isNotFound) {
      return null;
    }

    throw new Error(
      `Erro ao baixar arquivo ${path}: ${err.message || "falha desconhecida no storage"}`
    );
  }

  const text = await downloaded.data.text();

  try {
    return JSON.parse(text) as RecebimentoFormRecord;
  } catch (error) {
    throw new Error(
      `JSON inválido no arquivo ${path}: ${
        error instanceof Error ? error.message : "falha ao interpretar conteúdo"
      }`
    );
  }
}

export async function getRecebimentoForm(unidadeId: string, formId: string) {
  const path = getFormPath(unidadeId, formId);
  return readForm(path);
}

export async function saveRecebimentoForm(record: RecebimentoFormRecord) {
  if (!record?.id) {
    throw new Error("Registro sem id");
  }

  if (!record?.unidade_id) {
    throw new Error("Registro sem unidade_id");
  }

  await ensureBucket();

  const path = getFormPath(record.unidade_id, record.id);
  const json = JSON.stringify(record);
  const fileBody = new Blob([json], { type: "application/json" });

  const uploaded = await supabaseAdmin.storage.from(BUCKET_NAME).upload(path, fileBody, {
    upsert: true,
    contentType: "application/json",
    cacheControl: "0",
  });

  if (uploaded.error) {
    throw new Error(`Erro ao salvar arquivo ${path}: ${uploaded.error.message}`);
  }

  return { path };
}

export async function listRecebimentoForms(unidadeId: string) {
  await ensureBucket();

  const folder = getUnitFolder(unidadeId);

  const listed = await supabaseAdmin.storage.from(BUCKET_NAME).list(folder, {
    limit: 200,
    offset: 0,
    sortBy: { column: "updated_at", order: "desc" },
  });

  if (listed.error) {
    throw new Error(`Erro ao listar formularios da unidade ${folder}: ${listed.error.message}`);
  }

  const files = (listed.data || []).filter((item) => item.name.endsWith(".json"));

  const rows = await Promise.all(
    files.map(async (file) => {
      const form = await readForm(`${folder}/${file.name}`);
      if (!form) return null;
      return form;
    })
  );

  return rows
    .filter((row): row is RecebimentoFormRecord => Boolean(row))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}