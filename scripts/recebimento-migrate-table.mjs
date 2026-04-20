import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env.local");
const BUCKET_NAME = "recebimento-formularios";
const TABLE_NAME = "recebimento_forms";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function normalizeRecord(record) {
  if (!record || typeof record !== "object") return null;

  return {
    id: String(record.id || "").trim(),
    unidade_id: String(record.unidade_id || "").trim(),
    created_by: String(record.created_by || "").trim(),
    created_by_username: String(record.created_by_username || "").trim(),
    created_by_nome: String(record.created_by_nome || "").trim(),
    signature_name: String(record.signature_name || "").trim(),
    signed_at: String(record.signed_at || "").trim(),
    created_at: String(record.created_at || "").trim(),
    updated_at: String(record.updated_at || "").trim(),
    finalized_at: record.finalized_at || null,
    finalized_by: record.finalized_by || null,
    finalized_by_username: record.finalized_by_username || null,
    finalized_by_nome: record.finalized_by_nome || null,
    finalized_reason: record.finalized_reason || (record.finalized_at ? "manual" : null),
    equipe_responsavel: String(record.equipe_responsavel || "").trim(),
    data_documento: String(record.data_documento || "").trim(),
    rows: Array.isArray(record.rows) ? record.rows : [],
    reopen_events: Array.isArray(record.reopen_events) ? record.reopen_events : [],
    model_code: String(record.model_code || "").trim(),
    model_version: String(record.model_version || "").trim(),
  };
}

async function listJsonPaths(storage, folder = "") {
  const { data, error } = await storage.list(folder, {
    limit: 1000,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    throw new Error(`Erro ao listar pasta "${folder || "/"}": ${error.message}`);
  }

  const paths = [];

  for (const item of data || []) {
    const currentPath = folder ? `${folder}/${item.name}` : item.name;

    if (item.name.endsWith(".json")) {
      paths.push(currentPath);
      continue;
    }

    const nested = await listJsonPaths(storage, currentPath);
    paths.push(...nested);
  }

  return paths;
}

async function downloadRecord(storage, filePath) {
  const downloaded = await storage.download(filePath);
  if (downloaded.error) {
    throw new Error(`Erro ao baixar ${filePath}: ${downloaded.error.message}`);
  }

  const text = await downloaded.data.text();
  const parsed = JSON.parse(text);
  const normalized = normalizeRecord(parsed);

  if (!normalized?.id || !normalized?.unidade_id) {
    throw new Error(`Registro invalido em ${filePath}`);
  }

  return normalized;
}

async function main() {
  loadEnvFile(envPath);

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL ausente.");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente.");

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const storage = supabase.storage.from(BUCKET_NAME);

  const beforeCountQuery = await supabase
    .from(TABLE_NAME)
    .select("id", { count: "exact", head: true });

  if (beforeCountQuery.error) {
    throw new Error(`Erro ao contar registros antes da migracao: ${beforeCountQuery.error.message}`);
  }

  const filePaths = await listJsonPaths(storage);

  let migrated = 0;
  let failed = 0;
  const failures = [];

  for (const filePath of filePaths) {
    try {
      const record = await downloadRecord(storage, filePath);
      const upsert = await supabase.from(TABLE_NAME).upsert(record, { onConflict: "id" });

      if (upsert.error) {
        throw new Error(upsert.error.message);
      }

      migrated += 1;
    } catch (error) {
      failed += 1;
      failures.push({
        filePath,
        message: error instanceof Error ? error.message : "Falha desconhecida",
      });
    }
  }

  const afterCountQuery = await supabase
    .from(TABLE_NAME)
    .select("id", { count: "exact", head: true });

  if (afterCountQuery.error) {
    throw new Error(`Erro ao contar registros apos migracao: ${afterCountQuery.error.message}`);
  }

  console.log(
    JSON.stringify(
      {
        bucket: BUCKET_NAME,
        table: TABLE_NAME,
        storageFiles: filePaths.length,
        migrated,
        failed,
        tableCountBefore: beforeCountQuery.count ?? 0,
        tableCountAfter: afterCountQuery.count ?? 0,
        failures,
      },
      null,
      2
    )
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
