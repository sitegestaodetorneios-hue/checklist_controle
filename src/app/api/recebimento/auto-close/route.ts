import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  cleanupExpiredRecebimentoDrafts,
  finalizeInactiveRecebimentoForms,
} from "@/lib/recebimentoStorage";

function isAuthorized(req: Request) {
  const hdr = req.headers.get("x-cron-secret") || "";
  const url = new URL(req.url);
  const qp = url.searchParams.get("secret") || "";
  const secret = hdr || qp;
  return !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET;
}

async function handle(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const usersQ = await supabaseAdmin
    .from("ct_users")
    .select("unidade_id")
    .not("unidade_id", "is", null);

  if (usersQ.error) {
    return NextResponse.json({ error: usersQ.error.message }, { status: 500 });
  }

  const unidadeIds = Array.from(
    new Set(
      (usersQ.data || [])
        .map((row) => String((row as { unidade_id?: string | null }).unidade_id || "").trim())
        .filter(Boolean)
    )
  );

  let removedDrafts = 0;
  let autoClosed = 0;

  for (const unidadeId of unidadeIds) {
    const cleanup = await cleanupExpiredRecebimentoDrafts(unidadeId);
    const closed = await finalizeInactiveRecebimentoForms(unidadeId);
    removedDrafts += cleanup.removed;
    autoClosed += closed.finalized;
  }

  return NextResponse.json({
    ok: true,
    unidades_processadas: unidadeIds.length,
    rascunhos_excluidos: removedDrafts,
    formularios_encerrados_automaticamente: autoClosed,
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
