"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Field, Input, Pill, Select } from "../components/ui";

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
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [byPlaca, setByPlaca] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const qs = new URLSearchParams();
      if (placa.trim()) qs.set("placa", placa.trim());
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
      setMsg(e?.message || "Erro");
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
    <main className="grid" style={{ paddingTop: 12 }}>
      <div className="row">
        <div>
          <h1 className="h1">📚 Histórico • Encontro de contas</h1>
          <div className="sub">
            Filtre por placa, veja divergências e acompanhe paletes/stretch pendentes por carro.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/">Home</Link>
          <Link href="/pendencias">Pendências</Link>
        </div>
      </div>

      <Card style={{ padding: 14 }}>
        <div className="row" style={{ alignItems: "center" }}>
          <Pill>Registros: {totalRegs}</Pill>
          <Pill className="pillWarn">Faltam paletes: {topResumo.faltamPal}</Pill>
          <Pill className="pillWarn">Faltam stretch: {topResumo.faltamStr}</Pill>
        </div>

        <div className="divider" />

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <Field label="Placa">
            <Input value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="Ex: ABC1D23" />
          </Field>

          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="EM_ROTA">EM_ROTA</option>
              <option value="PENDENTE_DEVOLUCAO">PENDENTE_DEVOLUCAO</option>
              <option value="FECHADO">FECHADO</option>
            </Select>
          </Field>

          <Field label="De (data)">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>

          <Field label="Até (data)">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center", opacity: 0.9 }}>
            <input type="checkbox" checked={onlyDiv} onChange={(e) => setOnlyDiv(e.target.checked)} />
            Mostrar somente divergências
          </label>

          <Button variant="primary" onClick={load} disabled={loading}>
            {loading ? "Carregando…" : "🔎 Filtrar"}
          </Button>

          {msg ? <span style={{ color: "var(--muted)", fontSize: 13 }}>{msg}</span> : null}
        </div>
      </Card>

      {/* Resumo por placa (encontro de contas) */}
      <Card style={{ padding: 14 }}>
        <div className="cardKicker">Encontro de contas</div>
        <div className="cardTitle">Resumo por carro (placa)</div>
        <div className="divider" />

        {loading ? <div style={{ opacity: 0.8 }}>Carregando…</div> : null}
        {!loading && byPlaca.length === 0 ? <div style={{ opacity: 0.8 }}>Sem dados para o filtro atual.</div> : null}

        <div className="grid" style={{ gap: 10 }}>
          {byPlaca.slice(0, 50).map((x) => (
            <div key={x.placa} className="card" style={{ padding: 12 }}>
              <div className="row" style={{ alignItems: "center" }}>
                <div style={{ fontSize: 16 }}>
                  <b>🚚 {x.placa}</b>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {x.faltam_paletes > 0 ? <Pill className="pillWarn">📦 Paletes -{x.faltam_paletes}</Pill> : <Pill>📦 OK</Pill>}
                  {x.faltam_stretch > 0 ? <Pill className="pillWarn">🧻 Stretch -{x.faltam_stretch}</Pill> : <Pill>🧻 OK</Pill>}
                  <Pill>Registros: {x.registros}</Pill>
                  <Pill>Pendências: {x.pendencias}</Pill>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setPlaca(x.placa === "(SEM_PLACA)" ? "" : x.placa);
                    setTimeout(load, 50);
                  }}
                >
                  Ver detalhes →
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Detalhe */}
      <Card style={{ padding: 14 }}>
        <div className="cardKicker">Detalhe</div>
        <div className="cardTitle">Carregamentos</div>
        <div className="divider" />

        {!loading && rows.length === 0 ? <div style={{ opacity: 0.8 }}>Nenhum registro.</div> : null}

        <div className="grid" style={{ gap: 10 }}>
          {rows.map((r) => {
            const c = r.calc || {};
            const precisa = c.precisa_devolver || [];
            return (
              <div key={r.id} className="card" style={{ padding: 12 }}>
                <div className="row" style={{ alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>{new Date(r.created_at).toLocaleString("pt-BR")}</div>
                    <div style={{ fontSize: 16, marginTop: 4 }}>
                      <b>{r.placa ? `🚚 ${r.placa}` : "🚚 (sem placa)"}</b>{" "}
                      <span style={{ opacity: 0.85 }}>• {r.status}</span>
                    </div>
                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Pill>📦 Saída: {c.pal_saida ?? 0}</Pill>
                      <Pill>📦 Retorno: {c.pal_retorno ?? "—"}</Pill>
                      {c.faltam_paletes > 0 ? <Pill className="pillWarn">📦 Falta: {c.faltam_paletes}</Pill> : null}

                      <Pill>🧻 Saída: {c.st_saida ?? 0}</Pill>
                      <Pill>🧻 Retorno: {c.st_retorno ?? "—"}</Pill>
                      {c.faltam_stretch > 0 ? <Pill className="pillWarn">🧻 Falta: {c.faltam_stretch}</Pill> : null}

                      {r.leva_paleteira ? <Pill className="pillWarn">🛒 Paleteira x{r.qtd_paleteira || 1}</Pill> : <Pill>🛒 Sem paleteira</Pill>}
                      {r.exige_tubete_retorno ? <Pill className="pillWarn">🧻 Exige tubete</Pill> : <Pill>🧻 Sem tubete</Pill>}
                    </div>

                    {precisa.length ? (
                      <div style={{ marginTop: 8, opacity: 0.9 }}>
                        <b>Pendências:</b> {precisa.join(", ")}
                      </div>
                    ) : (
                      <div style={{ marginTop: 8, opacity: 0.75 }}>Sem pendências.</div>
                    )}
                  </div>

                  <Link href={`/carros/retorno?id=${encodeURIComponent(r.id)}`} style={{ textDecoration: "none" }}>
                    <Button variant="primary">Abrir retorno</Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </main>
  );
}
