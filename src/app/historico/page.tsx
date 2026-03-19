"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Field, Input, Pill, Select, Badge } from "../components/ui";

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

export default function HistoricoPage() {
  const [placa, setPlaca] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [onlyDiv, setOnlyDiv] = useState(true);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: "error" | "info" | "" }>({ text: "", type: "" });
  const [rows, setRows] = useState<Row[]>([]);
  const [byPlaca, setByPlaca] = useState<any[]>([]);

  // ✅ Corrigido o hack do setTimeout: Agora a função pode receber a placa diretamente
  async function load(overridePlaca?: string) {
    setLoading(true);
    setMsg({ text: "", type: "" });
    
    const placaAtiva = overridePlaca !== undefined ? overridePlaca : placa;

    try {
      const qs = new URLSearchParams();
      if (placaAtiva.trim()) qs.set("placa", placaAtiva.trim());
      if (status) qs.set("status", status);
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      if (onlyDiv) qs.set("only_div", "1");

      const r = await fetch(`/api/historico/list?${qs.toString()}`, { credentials: "include", cache: "no-store" });
      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha ao carregar histórico");

      setRows(d.rows || []);
      setByPlaca(d.byPlaca || []);
    } catch (e: any) {
      setMsg({ text: `❌ ${e?.message || "Erro"}`, type: "error" });
      setRows([]);
      setByPlaca([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalRegs = rows.length;

  const topResumo = useMemo(() => {
    const faltamPal = byPlaca.reduce((acc, x) => acc + (x.faltam_paletes || 0), 0);
    const faltamStr = byPlaca.reduce((acc, x) => acc + (x.faltam_stretch || 0), 0);
    return { faltamPal, faltamStr };
  }, [byPlaca]);

  return (
    <main className="grid" style={{ gap: 24, padding: "16px 0 40px" }}>
      {/* CABEÇALHO */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 300px" }}>
          <h1 className="h1">📚 Auditoria & Contas</h1>
          <p className="sub" style={{ marginTop: 4 }}>
            Acompanhe paletes/stretch pendentes e divergências por placa.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/pendencias">
            <Button variant="ghost" style={{ color: "var(--accent)" }}>Pendências →</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">← Home</Button>
          </Link>
        </div>
      </div>

      {/* ÁREA DE FILTROS E RESUMO GERAL */}
      <Card style={{ padding: 20 }}>
        {/* Painel Rápido de Prejuízo/Falta */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Pill style={{ background: "var(--surface2)", border: "none" }}>Registros: {totalRegs}</Pill>
          <Pill className={topResumo.faltamPal > 0 ? "pillWarn" : ""} style={{ border: topResumo.faltamPal === 0 ? "none" : "", background: topResumo.faltamPal === 0 ? "#dcfce7" : "", color: topResumo.faltamPal === 0 ? "#166534" : "" }}>
            {topResumo.faltamPal > 0 ? `⚠️ Faltam Paletes: ${topResumo.faltamPal}` : "✅ Paletes OK"}
          </Pill>
          <Pill className={topResumo.faltamStr > 0 ? "pillWarn" : ""} style={{ border: topResumo.faltamStr === 0 ? "none" : "", background: topResumo.faltamStr === 0 ? "#dcfce7" : "", color: topResumo.faltamStr === 0 ? "#166534" : "" }}>
            {topResumo.faltamStr > 0 ? `⚠️ Faltam Stretch: ${topResumo.faltamStr}` : "✅ Stretch OK"}
          </Pill>
        </div>

        <div className="divider" style={{ margin: "20px 0" }} />

        {/* Grid de Filtros */}
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <Field label="Buscar Placa">
            <Input value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="Ex: ABC1D23" />
          </Field>

          <Field label="Status do Retorno">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="EM_ROTA">Em Rota</option>
              <option value="PENDENTE_DEVOLUCAO">Pendente Devolução</option>
              <option value="FECHADO">Fechado</option>
            </Select>
          </Field>

          <Field label="De (Data)">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>

          <Field label="Até (Data)">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>

        {/* Botões de Ação do Filtro */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginTop: 24 }}>
          <Button variant="primary" onClick={() => load()} disabled={loading} style={{ minWidth: 160 }}>
            {loading ? "Carregando…" : "🔎 Aplicar Filtros"}
          </Button>

          {/* Toggle de Divergências */}
          <button
            onClick={() => setOnlyDiv(!onlyDiv)}
            style={{
              padding: "12px 16px", borderRadius: "12px", fontWeight: 600, cursor: "pointer",
              border: `1px solid ${onlyDiv ? "var(--warnBorder)" : "var(--border)"}`,
              background: onlyDiv ? "var(--warnBg)" : "var(--surface2)",
              color: onlyDiv ? "var(--warnText)" : "var(--muted)",
              display: "flex", alignItems: "center", gap: 8, transition: "0.2s"
            }}
          >
            {onlyDiv ? "⚠️ Só Divergências" : "Mostrar Todas as Placas"}
          </button>
        </div>

        {msg.text && (
          <div style={{ marginTop: 16, color: msg.type === "error" ? "var(--danger)" : "var(--muted)", fontWeight: 600 }}>
            {msg.text}
          </div>
        )}
      </Card>

      {/* RESUMO POR CARRO (ENCONTRO DE CONTAS) */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "20px 20px 10px 20px" }}>
          <div className="cardKicker">Visão Macro</div>
          <div className="cardTitle">Resumo por Placa</div>
        </div>
        <div className="divider" style={{ margin: 0 }} />

        {loading ? <div style={{ padding: 24, color: "var(--muted)", textAlign: "center", fontWeight: 600 }}>Carregando dados...</div> : null}
        {!loading && byPlaca.length === 0 ? <div style={{ padding: 24, color: "var(--muted)", textAlign: "center", fontWeight: 600 }}>Sem dados para o filtro atual.</div> : null}

        <div style={{ display: "flex", flexDirection: "column" }}>
          {byPlaca.slice(0, 50).map((x, index) => (
            <div key={x.placa} style={{ padding: 16, borderBottom: index === byPlaca.slice(0, 50).length - 1 ? "none" : "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "center", background: (x.faltam_paletes > 0 || x.faltam_stretch > 0) ? "var(--warnBg)" : "transparent" }}>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text)" }}>
                  🚚 {x.placa}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {x.faltam_paletes > 0 ? <Pill style={{ border: "1px solid var(--danger)", color: "var(--danger)" }}>📦 Paletes -{x.faltam_paletes}</Pill> : <Pill>📦 Paletes OK</Pill>}
                  {x.faltam_stretch > 0 ? <Pill style={{ border: "1px solid var(--danger)", color: "var(--danger)" }}>🧻 Stretch -{x.faltam_stretch}</Pill> : <Pill>🧻 Stretch OK</Pill>}
                  <Pill style={{ background: "transparent" }}>Reg: {x.registros}</Pill>
                  {x.pendencias > 0 && <Pill className="pillWarn">Pendentes: {x.pendencias}</Pill>}
                </div>
              </div>

              <Button
                variant="ghost"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                onClick={() => {
                  // ✅ Atualiza o estado da placa e manda buscar imediatamente passando a placa real
                  const p = x.placa === "(SEM_PLACA)" ? "" : x.placa;
                  setPlaca(p);
                  load(p);
                  // Opcional: Rola a tela suavemente até a seção de Detalhes
                  window.scrollBy({ top: 300, behavior: "smooth" });
                }}
              >
                Detalhar →
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* DETALHAMENTO (CARREGAMENTOS) */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "20px 20px 10px 20px" }}>
          <div className="cardKicker">Micro Auditoria</div>
          <div className="cardTitle">Histórico de Carregamentos</div>
        </div>
        <div className="divider" style={{ margin: 0 }} />

        {!loading && rows.length === 0 ? <div style={{ padding: 24, color: "var(--muted)", textAlign: "center", fontWeight: 600 }}>Nenhum carregamento encontrado.</div> : null}

        <div style={{ display: "flex", flexDirection: "column" }}>
          {rows.map((r, index) => {
            const c = r.calc || {};
            const precisa = c.precisa_devolver || [];
            
            return (
              <div key={r.id} style={{ padding: 20, borderBottom: index === rows.length - 1 ? "none" : "1px solid var(--border)" }}>
                
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
                      {new Date(r.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                    <div style={{ fontSize: "1.1rem", marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                      <b>{r.placa ? `🚚 ${r.placa}` : "🚚 (sem placa)"}</b>
                      <Badge>{r.status}</Badge>
                    </div>
                  </div>
                  
                  <Link href={`/carros/retorno?id=${encodeURIComponent(r.id)}`} style={{ textDecoration: "none" }}>
                    <Button variant="ghost" style={{ padding: "8px 16px", minHeight: "auto", background: "var(--surface)", border: "1px solid var(--border)" }}>
                   Abrir Retorno →
                  </Button>
                  </Link>
                </div>

                {/* Bloco de Contagem (Saída x Retorno) */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
                  
                  {/* Bloco Paletes */}
                  <div style={{ flex: "1 1 200px", padding: 12, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700, marginBottom: 8 }}>📦 BALANÇO DE PALETES</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Pill>Saiu: {c.pal_saida ?? 0}</Pill>
                      <Pill>Voltou: {c.pal_retorno ?? "—"}</Pill>
                      {c.faltam_paletes > 0 && <Pill style={{ background: "var(--dangerBg)", color: "var(--danger)", border: "1px solid var(--danger)" }}>Falta: {c.faltam_paletes}</Pill>}
                    </div>
                  </div>

                  {/* Bloco Stretch */}
                  <div style={{ flex: "1 1 200px", padding: 12, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700, marginBottom: 8 }}>🧻 BALANÇO DE FILME/STRETCH</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Pill>Saiu: {c.st_saida ?? 0}</Pill>
                      <Pill>Voltou: {c.st_retorno ?? "—"}</Pill>
                      {c.faltam_stretch > 0 && <Pill style={{ background: "var(--dangerBg)", color: "var(--danger)", border: "1px solid var(--danger)" }}>Falta: {c.faltam_stretch}</Pill>}
                    </div>
                  </div>

                </div>

                {/* Equipamentos Extras */}
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {r.leva_paleteira ? <Pill className="pillWarn">🛒 Levou Paleteira (x{r.qtd_paleteira || 1})</Pill> : <Pill style={{ background: "transparent" }}>🛒 Sem paleteira</Pill>}
                  {r.exige_tubete_retorno ? <Pill className="pillWarn">🧻 Levou Tubete</Pill> : <Pill style={{ background: "transparent" }}>🧻 Sem tubete</Pill>}
                </div>

                {/* Avisos de Pendência Específica */}
                {precisa.length > 0 && (
                  <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "var(--warnBg)", border: "1px solid var(--warnBorder)", color: "var(--warnText)", fontSize: "0.9rem" }}>
                    <b>⚠️ Pendente nesta viagem:</b> {precisa.join(", ")}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </Card>
    </main>
  );
}