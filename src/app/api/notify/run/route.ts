import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const TZ = "America/Sao_Paulo";
const WINDOW_MIN = 8; // janela curta p/ evitar spam (ajuste o cron para rodar a cada 5min)

function zonedParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = fmt.formatToParts(date);
  const m: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") m[p.type] = p.value;
  }

  const yyyy = m.year;
  const mm = m.month;
  const dd = m.day;
  const HH = m.hour;
  const MM = m.minute;
  const SS = m.second;
  const ymd = `${yyyy}-${mm}-${dd}`;
  return { yyyy, mm, dd, HH, MM, SS, ymd };
}

function parseHHMM(hhmm: string) {
  const m = String(hhmm || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mi) || h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return { h, mi };
}

function mins(h: number, mi: number) {
  return h * 60 + mi;
}

function isAuthorized(req: Request) {
  const hdr = req.headers.get("x-cron-secret") || "";
  const url = new URL(req.url);
  const qp = url.searchParams.get("secret") || "";
  const secret = hdr || qp;
  return !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET;
}

async function handle(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:suporte@seu-dominio.com";

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return NextResponse.json({ error: "VAPID keys ausentes" }, { status: 500 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  // Agora em SP
  const now = new Date();
  const sp = zonedParts(now);
  const nowMin = mins(Number(sp.HH), Number(sp.MM));

  // Intervalo do "dia" em SP, convertido para ISO UTC.
  // Obs: SP hoje é -03:00 (sem DST). Para teus turnos (08/13/23) isso é perfeito.
  const startDay = new Date(`${sp.ymd}T00:00:00-03:00`);
  const endDay = new Date(startDay.getTime() + 24 * 60 * 60 * 1000);

  // Unidades com usuários ativos / prefs
  const prefsQ = await supabaseAdmin
    .from("user_prefs")
    .select("unidade_id,user_id,turno_default,notify_enabled,notify_checklist,notify_pendencias")
    .not("unidade_id", "is", null);

  if (prefsQ.error) return NextResponse.json({ error: prefsQ.error.message }, { status: 500 });

  const prefsRows = (prefsQ.data || []) as any[];
  const byUnidade = new Map<string, any[]>();
  for (const p of prefsRows) {
    const uid = String(p.unidade_id || "");
    if (!uid) continue;
    if (!byUnidade.has(uid)) byUnidade.set(uid, []);
    byUnidade.get(uid)!.push(p);
  }

  let sent = 0;
  let unitsProcessed = 0;

  for (const [unidade_id, unitPrefs] of byUnidade.entries()) {
    unitsProcessed++;

    // ===== 1) ALERTA CHECKLIST DE INÍCIO DE TURNO =====
    // Regra: 30 min após início do turno (turno_default), manda alerta se não fez.
    // Janela curta pra não spammar (o cron deve rodar próximo ao horário).

    // Carrega usuários (nome/username/role) da unidade
    const usersQ = await supabaseAdmin
      .from("ct_users")
      .select("id,username,nome,role,unidade_id")
      .eq("unidade_id", unidade_id);

    const users = (usersQ.data || []) as any[];
    const userById = new Map<string, any>();
    for (const u of users) userById.set(String(u.id), u);

    // Filtra operadores (não-admin) que estão "no horário" agora
    const dueUsers: { id: string; nome: string; turno: string }[] = [];

    for (const p of unitPrefs) {
      const uid = String(p.user_id);
      const u = userById.get(uid);
      if (!u) continue;

      const role = String(u.role || "");
      const isAdmin = role === "admin_unit" || role === "admin_global";
      if (isAdmin) continue;

      const turno = String(p.turno_default || "").trim();
      const parsed = parseHHMM(turno);
      if (!parsed) continue;

      const startMin = mins(parsed.h, parsed.mi);
      const dueMin = startMin + 30;

      if (nowMin >= dueMin && nowMin < dueMin + WINDOW_MIN) {
        dueUsers.push({
          id: uid,
          nome: String(u.nome || u.username || "Operador"),
          turno,
        });
      }
    }

    let missing: { id: string; nome: string; turno: string }[] = [];
    if (dueUsers.length) {
      // Busca checklists do dia para esses usuários
      const ids = dueUsers.map((x) => x.id);
      const chkQ = await supabaseAdmin
        .from("turno_checklists")
        .select("created_by")
        .eq("unidade_id", unidade_id)
        .in("created_by", ids)
        .gte("created_at", startDay.toISOString())
        .lt("created_at", endDay.toISOString());

      const done = new Set<string>((chkQ.data || []).map((r: any) => String(r.created_by)));
      missing = dueUsers.filter((x) => !done.has(String(x.id)));
    }

    // Quem recebe o alerta? (config no admin/users: notify_enabled + notify_checklist)
    const receiversChecklist = unitPrefs
      .filter((p) => !!p.notify_enabled && !!p.notify_checklist)
      .map((p) => String(p.user_id));

    if (missing.length && receiversChecklist.length) {
      // Subscriptions dos receptores
      const subQ = await supabaseAdmin
        .from("push_subscriptions")
        .select("endpoint,p256dh,auth,user_id")
        .eq("unidade_id", unidade_id)
        .eq("is_active", true)
        .in("user_id", receiversChecklist)
        .limit(400);

      const subs = (subQ.data || []) as any[];

      const top = missing.slice(0, 5).map((m) => `${m.nome} (${m.turno})`).join(", ");
      const more = missing.length > 5 ? ` +${missing.length - 5}...` : "";

      const payload = JSON.stringify({
        title: "Checklist de início de turno pendente",
        body: `Ainda não fizeram o checklist (30 min após início): ${top}${more}`,
        url: "/turno",
      });

      for (const s of subs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            payload
          );
          sent++;
        } catch {
          // opcional: marcar is_active=false em caso de falha persistente
        }
      }
    }

    // ===== 2) PENDÊNCIAS DE RETORNO (continua igual, mas respeita prefs.notify_pendencias) =====
    const receiversPend = unitPrefs
      .filter((p) => !!p.notify_enabled && !!p.notify_pendencias)
      .map((p) => String(p.user_id));

    if (receiversPend.length) {
      const pendQ = await supabaseAdmin
        .from("carregamentos")
        .select("id,status,placa,motorista,created_at")
        .eq("unidade_id", unidade_id)
        .in("status", ["EM_ROTA", "PENDENTE_DEVOLUCAO"])
        .limit(50);

      const pendencias = pendQ.error ? [] : (pendQ.data || []);

      if (pendencias.length) {
        const subQ = await supabaseAdmin
          .from("push_subscriptions")
          .select("endpoint,p256dh,auth,user_id")
          .eq("unidade_id", unidade_id)
          .eq("is_active", true)
          .in("user_id", receiversPend)
          .limit(400);

        const subs = (subQ.data || []) as any[];

        const payload = JSON.stringify({
          title: "Pendências de retorno",
          body: `Você tem ${pendencias.length} carregamento(s) com retorno pendente. Toque para ver.`,
          url: "/pendencias",
        });

        for (const s of subs) {
          try {
            await webpush.sendNotification(
              {
                endpoint: s.endpoint,
                keys: { p256dh: s.p256dh, auth: s.auth },
              },
              payload
            );
            sent++;
          } catch {
            // ignore
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent, unitsProcessed, spNow: `${sp.ymd} ${sp.HH}:${sp.MM}` });
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
