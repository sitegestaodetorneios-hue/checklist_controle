import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env.local");
const BUCKET_NAME = "recebimento-formularios";
const TABLE_NAME = "recebimento_forms";
const POOLER_HOST = "aws-1-sa-east-1.pooler.supabase.com";
const POOLER_PORT = 5432;
const POOLER_USER = "postgres.pnrqjvqbrmlvwqwzeldl";
const POOLER_DATABASE = "postgres";

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

async function main() {
  loadEnvFile(envPath);

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databasePassword = process.env.SUPABASE_DB_PASSWORD;

  if (!url) throw new Error("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL ausente.");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente.");
  if (!databasePassword) {
    throw new Error("SUPABASE_DB_PASSWORD ausente. Defina no ambiente para validar a conexao SQL.");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const storage = supabase.storage.from(BUCKET_NAME);
  const storageFiles = await listJsonPaths(storage);

  const tableCountQuery = await supabase
    .from(TABLE_NAME)
    .select("id", { count: "exact", head: true });
  if (tableCountQuery.error) {
    throw new Error(`Erro ao contar registros da tabela: ${tableCountQuery.error.message}`);
  }

  const sampleRowsQuery = await supabase
    .from(TABLE_NAME)
    .select("id, unidade_id, updated_at, finalized_at, finalized_reason")
    .order("updated_at", { ascending: false })
    .limit(5);
  if (sampleRowsQuery.error) {
    throw new Error(`Erro ao buscar amostra da tabela: ${sampleRowsQuery.error.message}`);
  }

  const statsQuery = await supabase
    .from(TABLE_NAME)
    .select("id, finalized_at, finalized_reason");
  if (statsQuery.error) {
    throw new Error(`Erro ao buscar estatisticas da tabela: ${statsQuery.error.message}`);
  }

  const openCount = (statsQuery.data || []).filter((row) => !row.finalized_at).length;
  const manualCount = (statsQuery.data || []).filter(
    (row) => row.finalized_reason === "manual"
  ).length;
  const autoCount = (statsQuery.data || []).filter(
    (row) => row.finalized_reason === "auto_inactive"
  ).length;

  const pg = new Client({
    host: POOLER_HOST,
    port: POOLER_PORT,
    database: POOLER_DATABASE,
    user: POOLER_USER,
    password: databasePassword,
    ssl: { rejectUnauthorized: false },
  });

  await pg.connect();

  const indexesQuery = await pg.query(`
    select indexname
    from pg_indexes
    where schemaname = 'public' and tablename = 'recebimento_forms'
    order by indexname
  `);

  const columnsQuery = await pg.query(`
    select column_name, data_type
    from information_schema.columns
    where table_schema = 'public' and table_name = 'recebimento_forms'
    order by ordinal_position
  `);

  await pg.end();

  console.log(
    JSON.stringify(
      {
        bucket: BUCKET_NAME,
        table: TABLE_NAME,
        storageFiles: storageFiles.length,
        tableCount: tableCountQuery.count ?? 0,
        openCount,
        manualFinalizedCount: manualCount,
        autoFinalizedCount: autoCount,
        indexes: indexesQuery.rows,
        columns: columnsQuery.rows,
        sampleRows: sampleRowsQuery.data || [],
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
