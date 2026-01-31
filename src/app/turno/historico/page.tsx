"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Field, Input, Pill, Select } from "@/app/components/ui";

async function safeJson(res: Response) {
  try {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { error: text || `Erro ${res.status}` };
    }
  } catch {
    return { error: "Falha de conexão" };
  }
}

type Row = any;

export default function TurnoHistoricoPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [users, setUsers] = useState<{ id: string; label: string }[]>([]);
  // ✅ summary agora é FECHADO vs PENDENTE (de acordo com sua tabela)
  const [summary, setSummary] = useState<{ total: number; fechado: number; pendente: number }>({
    total: 0,
    fechado: 0,
    pendente: 0,
  });

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [userId, setUserId] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      if (userId) qs.set("user_id", userId); // ✅ API filtra por created_by
      if (onlyPending) qs.set("only_pending", "1");

      const r = await fetch(`/api/turno/history?${qs.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha ao carregar histórico");

      setRows(d.rows || []);
      setUsers(d.users || []);
      setSummary(d.summary || { total: 0, fechado: 0, pendente: 0 });
    } catch (e: any) {
      setMsg(e?.message || "Erro");
      setRows([]);
      setUsers([]);
      setSummary({ total: 0, fechado: 0, pendente: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byStatusPills = useMemo(() => {
    return (
      <div className="row" style={{ alignItems: "center" }}>
        <Pill>Registros: {summary.total}</Pill>
        <Pill>✅ FECHADO: {summary.fechado}</Pill>
        <Pill className="pillWarn">⚠️ Pendentes: {summary.pendente}</Pill>
      </div>
    );
  }, [summary]);

  return (
    <main className="grid" style={{ paddingTop: 12 }}>
      <div className="row">
        <div>
          <h1 className="h1">📚 Histórico do Checklist de Turno</h1>
          <div className="sub">Auditoria e controle: quem fez, quando fez, e o que ficou pendente.</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/turno">Voltar turno</Link>
          <Link href="/">Home</Link>
        </div>
      </div>

      <Card style={{ padding: 14 }}>
        {byStatusPills}
        <div className="divider" />

        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}
        >
          <Field label="De (data)">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>

          <Field label="Até (data)">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>

          <Field label="Usuário">
            <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Todos</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Somente pendentes">
            <label style={{ display: "flex", gap: 8, alignItems: "center", height: 40 }}>
              <input
                type="checkbox"
                checked={onlyPending}
                onChange={(e) => setOnlyPending(e.target.checked)}
              />
              <span style={{ opacity: 0.85 }}>Mostrar só com problemas</span>
            </label>
          </Field>
        </div>

        <div className="row" style={{ marginTop: 12, alignItems: "center" }}>
          <Button variant="primary" onClick={load} disabled={loading}>
            {loading ? "Carregando…" : "🔎 Filtrar"}
          </Button>
          {msg ? <span style={{ color: "var(--muted)", fontSize: 13 }}>{msg}</span> : null}
        </div>
      </Card>

      <Card style={{ padding: 14 }}>
        <div className="cardKicker">Registros</div>
        <div className="cardTitle">Detalhes do turno</div>
        <div className="divider" />

        {loading ? <div style={{ opacity: 0.8 }}>Carregando…</div> : null}
        {!loading && rows.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nenhum registro no filtro.</div>
        ) : null}

        <div className="grid" style={{ gap: 10 }}>
          {rows.map((r) => {
            const isFechado = String(r.status || "").toUpperCase() === "FECHADO";
            return (
              <div key={r.id} className="card" style={{ padding: 12 }}>
                <div className="row" style={{ alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </div>

                    <div style={{ fontSize: 16, marginTop: 4 }}>
                      <b>{r.user?.nome || r.user?.username || "Usuário"}</b>{" "}
                      <span style={{ opacity: 0.85 }}>
                        {r.turno_label ? `• Turno ${r.turno_label}` : ""}
                      </span>{" "}
                      {isFechado ? <Pill>✅ FECHADO</Pill> : <Pill className="pillWarn">⚠️ {r.status || "PENDENTE"}</Pill>}
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Pill>
                        📟 Coletores: {r.coletores_total ?? "—"} ({r.coletores_ok === false ? "NOK" : "OK"})
                      </Pill>
                      <Pill>
                        🛒 Paleteiras: {r.paleteiras_total ?? "—"} ({r.paleteiras_ok === false ? "NOK" : "OK"})
                      </Pill>
                    </div>

                    {r.coletores_obs || r.paleteiras_obs ? (
                      <div style={{ marginTop: 8, opacity: 0.85 }}>
                        {r.coletores_obs ? <div>📟 Obs coletores: {r.coletores_obs}</div> : null}
                        {r.paleteiras_obs ? <div>🛒 Obs paleteiras: {r.paleteiras_obs}</div> : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </main>
  );
}
