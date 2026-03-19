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
  const [msg, setMsg] = useState<{ text: string; type: "error" | "info" | "" }>({ text: "", type: "" });

  async function load() {
    setLoading(true);
    setMsg({ text: "", type: "" });
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      if (userId) qs.set("user_id", userId);
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
      setMsg({ text: `❌ ${e?.message || "Erro"}`, type: "error" });
      setRows([]);
      setSummary({ total: 0, fechado: 0, pendente: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Organizado visualmente para mobile
  const byStatusPills = useMemo(() => {
    return (
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Pill style={{ background: "var(--surface2)", border: "none" }}>Total: {summary.total}</Pill>
        <Pill style={{ background: "#dcfce7", color: "#166534", border: "none" }}>✅ FECHADO: {summary.fechado}</Pill>
        <Pill className="pillWarn" style={{ border: "none" }}>⚠️ PENDENTE: {summary.pendente}</Pill>
      </div>
    );
  }, [summary]);

  return (
    <main className="grid" style={{ gap: 24, padding: "16px 0 40px" }}>
      {/* CABEÇALHO */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 300px" }}>
          <h1 className="h1">Histórico de Turno</h1>
          <p className="sub" style={{ marginTop: 4 }}>Auditoria e controle: quem fez e o que ficou pendente.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/turno">
            <Button variant="ghost">← Voltar</Button>
          </Link>
        </div>
      </div>

      {/* FILTROS E RESUMO */}
      <Card style={{ padding: "20px" }}>
        {byStatusPills}
        <div className="divider" style={{ margin: "20px 0" }} />

        {/* ✅ Grid de Filtros Corrigido */}
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <Field label="Data Inicial">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>

          <Field label="Data Final">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>

          <Field label="Usuário/Operador">
            <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Todos os usuários</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </Select>
          </Field>
        </div>

        {/* ✅ Botões de Ação Reposicionados e Melhorados */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginTop: 24 }}>
          <Button variant="primary" onClick={load} disabled={loading} style={{ minWidth: 160 }}>
            {loading ? "Buscando..." : "🔎 Aplicar Filtros"}
          </Button>

          <button
            onClick={() => setOnlyPending(!onlyPending)}
            style={{
              padding: "12px 16px", borderRadius: "12px", fontWeight: 600, cursor: "pointer",
              border: `1px solid ${onlyPending ? "var(--warnBorder)" : "var(--border)"}`,
              background: onlyPending ? "var(--warnBg)" : "var(--surface2)",
              color: onlyPending ? "var(--warnText)" : "var(--muted)",
              display: "flex", alignItems: "center", gap: 8, transition: "0.2s"
            }}
          >
            {onlyPending ? "⚠️ Mostrando só Pendências" : "Mostrar apenas Pendências"}
          </button>
        </div>

        {msg.text && (
          <div style={{ marginTop: 16, color: msg.type === "error" ? "var(--danger)" : "var(--muted)", fontWeight: 600 }}>
            {msg.text}
          </div>
        )}
      </Card>

      {/* LISTA DE REGISTROS */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "20px 20px 10px 20px" }}>
          <div className="cardKicker">Registros Encontrados</div>
          <div className="cardTitle">Detalhes da Auditoria</div>
        </div>

        <div className="divider" style={{ margin: 0 }} />

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>Carregando dados...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>Nenhum registro encontrado para este filtro.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {rows.map((r, index) => {
              const isFechado = String(r.status || "").toUpperCase() === "FECHADO";
              // ✅ Conta para ver se o que saiu bate com o que estava OK
              const coletoresComAvaria = Number(r.coletores_total) > Number(r.coletores_ok);
              const paleteirasComAvaria = Number(r.paleteiras_total) > Number(r.paleteiras_ok);

              return (
                <div key={r.id} style={{ padding: 20, borderBottom: index === rows.length - 1 ? "none" : "1px solid var(--border)", background: isFechado ? "transparent" : "var(--warnBg)" }}>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
                        {new Date(r.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                        {r.turno_label && ` • Turno ${r.turno_label}`}
                      </div>
                      <div style={{ fontSize: "1.1rem", marginTop: 4 }}>
                        <b>{r.user?.nome || r.user?.username || "Usuário não identificado"}</b>
                      </div>
                    </div>
                    <div>
                      {isFechado ? (
                        <Pill style={{ background: "#dcfce7", color: "#166534", border: "none" }}>✅ FECHADO</Pill>
                      ) : (
                        <Pill className="pillWarn" style={{ border: "none" }}>⚠️ {r.status || "PENDENTE"}</Pill>
                      )}
                    </div>
                  </div>

                  {/* ✅ Leitura corrigida dos totais digitados */}
                  <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Pill style={{ border: coletoresComAvaria ? "1px solid var(--danger)" : "1px solid var(--border)" }}>
                      📟 Coletores: {r.coletores_ok ?? 0}/{r.coletores_total ?? 0} {coletoresComAvaria && "❌"}
                    </Pill>
                    <Pill style={{ border: paleteirasComAvaria ? "1px solid var(--danger)" : "1px solid var(--border)" }}>
                      🛒 Paleteiras: {r.paleteiras_ok ?? 0}/{r.paleteiras_total ?? 0} {paleteirasComAvaria && "❌"}
                    </Pill>
                  </div>

                  {/* Observações de avaria (aparecem com destaque se existirem) */}
                  {(r.coletores_obs || r.paleteiras_obs) && (
                    <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "var(--surface2)", fontSize: "0.9rem" }}>
                      <b style={{ color: "var(--text)" }}>Observações da Auditoria:</b>
                      <div style={{ marginTop: 8, color: "var(--muted2)", display: "flex", flexDirection: "column", gap: 4 }}>
                        {r.coletores_obs && <div><b>Coletores:</b> {r.coletores_obs}</div>}
                        {r.paleteiras_obs && <div><b>Paleteiras:</b> {r.paleteiras_obs}</div>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </main>
  );
}