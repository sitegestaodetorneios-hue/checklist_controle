"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Field, Input, Pill, Select, Textarea } from "../components/ui";

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

const TURNOS = ["08:00", "13:00", "23:00"] as const;

type Item = {
  id: string;
  scope: "turno_inicio";
  label: string;
  kind: "count_ok_obs" | "yesno" | "number" | "text";
  required: boolean;
  meta?: any;
};

type ExtraValue =
  | { kind: "count_ok_obs"; total?: string; ok?: string; obs?: string }
  | { kind: "yesno"; value?: boolean; obs?: string }
  | { kind: "number"; value?: string; obs?: string }
  | { kind: "text"; value?: string };

function onlyDigits(v: string) {
  return v.replace(/[^\d]/g, "");
}

export default function TurnoPage() {
  const [turno, setTurno] = useState<(typeof TURNOS)[number]>("08:00");

  const [coletoresTotal, setColetoresTotal] = useState<string>("");
  const [coletoresOk, setColetoresOk] = useState<string>("");
  const [obsColetores, setObsColetores] = useState<string>("");

  const [paleteirasTotal, setPaleteirasTotal] = useState<string>("");
  const [paleteirasOk, setPaleteirasOk] = useState<string>("");
  const [obsPaleteiras, setObsPaleteiras] = useState<string>("");

  const [items, setItems] = useState<Item[]>([]);
  const [extras, setExtras] = useState<Record<string, ExtraValue>>({});

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" | "" }>({ text: "", type: "" });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        const d = await safeJson(r);
        if (r.ok && d?.prefs?.turno_default && TURNOS.includes(d.prefs.turno_default)) {
          setTurno(d.prefs.turno_default);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/items/list?scope=turno_inicio", { credentials: "include", cache: "no-store" });
        const d = await safeJson(r);
        if (r.ok) {
          const list = (d.items || []) as Item[];
          setItems(list);
          setExtras((prev) => {
            const next = { ...prev };
            for (const it of list) {
              if (!next[it.id]) {
                if (it.kind === "count_ok_obs") next[it.id] = { kind: "count_ok_obs" };
                if (it.kind === "yesno") next[it.id] = { kind: "yesno", value: false };
                if (it.kind === "number") next[it.id] = { kind: "number" };
                if (it.kind === "text") next[it.id] = { kind: "text" };
              }
            }
            return next;
          });
        }
      } catch {}
    })();
  }, []);

  const resumo = useMemo(() => {
    const ct = Number(coletoresTotal || 0);
    const co = Number(coletoresOk || 0);
    const pt = Number(paleteirasTotal || 0);
    const po = Number(paleteirasOk || 0);
    return {
      coletores: ct ? `${co || 0}/${ct}` : "—",
      paleteiras: pt ? `${po || 0}/${pt}` : "—",
    };
  }, [coletoresTotal, coletoresOk, paleteirasTotal, paleteirasOk]);

  const warn = useMemo(() => {
    const ct = Number(coletoresTotal || 0);
    const co = Number(coletoresOk || 0);
    const pt = Number(paleteirasTotal || 0);
    const po = Number(paleteirasOk || 0);
    const alerts: string[] = [];
    if (ct && co && co > ct) alerts.push("Coletores OK maior que o total.");
    if (pt && po && po > pt) alerts.push("Paleteiras OK maior que o total.");
    return alerts;
  }, [coletoresTotal, coletoresOk, paleteirasTotal, paleteirasOk]);

  async function salvar() {
    setLoading(true);
    setMsg({ text: "", type: "" });

    try {
      const r = await fetch("/api/turno/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          turno_label: turno,
          coletores_total: coletoresTotal,
          coletores_ok: coletoresOk,
          coletores_obs: obsColetores,
          paleteiras_total: paleteirasTotal,
          paleteiras_ok: paleteirasOk,
          paleteiras_obs: obsPaleteiras,
          extras,
        }),
      });

      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha ao salvar");

      setMsg({ text: "✅ Checklist salvo com sucesso!", type: "success" });
      setObsColetores("");
      setObsPaleteiras("");
      
      // Remove a mensagem de sucesso após 3 segundos
      setTimeout(() => setMsg({ text: "", type: "" }), 3000);
      
    } catch (e: any) {
      setMsg({ text: `❌ ${e?.message || "Erro"}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setColetoresTotal("");
    setColetoresOk("");
    setObsColetores("");
    setPaleteirasTotal("");
    setPaleteirasOk("");
    setObsPaleteiras("");
    setMsg({ text: "", type: "" });
    setExtras((prev) => {
      const next: Record<string, ExtraValue> = { ...prev };
      for (const k of Object.keys(next)) {
        const v = next[k];
        if (v.kind === "count_ok_obs") next[k] = { kind: "count_ok_obs", total: "", ok: "", obs: "" };
        if (v.kind === "yesno") next[k] = { kind: "yesno", value: false, obs: "" };
        if (v.kind === "number") next[k] = { kind: "number", value: "", obs: "" };
        if (v.kind === "text") next[k] = { kind: "text", value: "" };
      }
      return next;
    });
  }

  return (
    <main className="grid" style={{ gap: 24, padding: "16px 0 40px" }}>
      {/* CABEÇALHO */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 300px" }}>
          <h1 className="h1">Checklist de Início de Turno</h1>
          <p className="sub" style={{ marginTop: 4 }}>Preencha em 60 segundos. Tudo fica auditável.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/">
            <Button variant="ghost">← Home</Button>
          </Link>
        </div>
      </div>

      {/* PAINEL DE TURNO */}
      <Card>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ minWidth: 220, flex: 1 }}>
            <Field label="Turno de Operação" hint="Pode ser alterado conforme a escala.">
              <Select value={turno} onChange={(e) => setTurno(e.target.value as any)}>
                {TURNOS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill>📱 Coletores: {resumo.coletores}</Pill>
            <Pill>🛒 Paleteiras: {resumo.paleteiras}</Pill>
          </div>
        </div>
      </Card>

      {/* EQUIPAMENTOS FIXOS */}
      <div className="gridCards">
        <Card>
          <div className="cardKicker">Equipamentos</div>
          <div className="cardTitle">📱 Coletores</div>
          <div className="divider" />
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Total">
              <Input value={coletoresTotal} onChange={(e) => setColetoresTotal(onlyDigits(e.target.value))} inputMode="numeric" placeholder="Ex: 12" />
            </Field>
            <Field label="OK (Funcionais)">
              <Input value={coletoresOk} onChange={(e) => setColetoresOk(onlyDigits(e.target.value))} inputMode="numeric" placeholder="Ex: 11" />
            </Field>
          </div>
          <div style={{ marginTop: 16 }}>
            <Field label="Observações de Avaria" hint="Ex: coletor 12 com tela quebrada">
              <Textarea value={obsColetores} onChange={(e) => setObsColetores(e.target.value)} rows={2} placeholder="Opcional" />
            </Field>
          </div>
        </Card>

        <Card>
          <div className="cardKicker">Equipamentos</div>
          <div className="cardTitle">🛒 Paleteiras</div>
          <div className="divider" />
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Total">
              <Input value={paleteirasTotal} onChange={(e) => setPaleteirasTotal(onlyDigits(e.target.value))} inputMode="numeric" placeholder="Ex: 6" />
            </Field>
            <Field label="OK (Funcionais)">
              <Input value={paleteirasOk} onChange={(e) => setPaleteirasOk(onlyDigits(e.target.value))} inputMode="numeric" placeholder="Ex: 6" />
            </Field>
          </div>
          <div style={{ marginTop: 16 }}>
            <Field label="Observações de Avaria" hint="Ex: paleteira 3 com vazamento de óleo">
              <Textarea value={obsPaleteiras} onChange={(e) => setObsPaleteiras(e.target.value)} rows={2} placeholder="Opcional" />
            </Field>
          </div>
        </Card>
      </div>

      {/* EQUIPAMENTOS EXTRAS (CONFIGURÁVEIS) */}
      {items.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div className="cardKicker">Personalizado</div>
              <div className="cardTitle">Itens Extras da Unidade</div>
            </div>
          </div>
          <div className="divider" />
          
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 16 }}>
            {items.map((it) => (
              <ExtraItem
                key={it.id}
                item={it}
                value={extras[it.id]}
                onChange={(v) => setExtras((prev) => ({ ...prev, [it.id]: v }))}
              />
            ))}
          </div>
        </Card>
      )}

      {/* ALERTAS DE VALIDAÇÃO */}
      {warn.length > 0 && (
        <div className="warnBox" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <b>⚠️ Verifique os valores:</b>
          {warn.map((w, i) => <span key={i}>• {w}</span>)}
        </div>
      )}

      {/* MENSAGEM DE SUCESSO/ERRO */}
      {msg.text && (
        <div style={{
          padding: 12, borderRadius: 8, 
          background: msg.type === "success" ? "var(--glass-bg)" : "var(--dangerBg)", 
          color: msg.type === "success" ? "var(--accent)" : "var(--danger)",
          border: `1px solid ${msg.type === "success" ? "var(--accent)" : "var(--danger)"}`,
          fontWeight: 600
        }}>
          {msg.text}
        </div>
      )}

      {/* BARRA DE AÇÕES (FOOTER) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 12 }}>
        <Button variant="primary" onClick={salvar} disabled={loading || warn.length > 0} style={{ flex: "1 1 200px" }}>
          {loading ? "Salvando..." : "💾 Salvar Checklist"}
        </Button>
        <Button variant="ghost" onClick={clearAll} disabled={loading} style={{ flex: "0 1 auto" }}>
          Limpar Tudo
        </Button>
      </div>
    </main>
  );
}

// ==========================================
// COMPONENTE: ITEM EXTRA DINÂMICO
// ==========================================
function ExtraItem({ item, value, onChange }: { item: Item; value?: ExtraValue; onChange: (v: ExtraValue) => void }) {
  if (!value) return null;

  return (
    <div style={{ background: "var(--surface2)", padding: 16, borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)" }}>{item.label}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 2 }}>{item.required ? "* Obrigatório" : "Opcional"}</div>
        </div>
      </div>

      <div className="divider" style={{ margin: "12px 0" }} />

      {value.kind === "count_ok_obs" && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Total">
            <Input value={value.total || ""} onChange={(e) => onChange({ ...value, total: onlyDigits(e.target.value) })} inputMode="numeric" placeholder="0" />
          </Field>
          <Field label="OK (Funcional)">
            <Input value={value.ok || ""} onChange={(e) => onChange({ ...value, ok: onlyDigits(e.target.value) })} inputMode="numeric" placeholder="0" />
          </Field>
          <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
            <Field label="Observações">
              <Textarea value={value.obs || ""} onChange={(e) => onChange({ ...value, obs: e.target.value })} rows={2} placeholder="Se necessário..." />
            </Field>
          </div>
        </div>
      )}

      {value.kind === "yesno" && (
        <div className="grid" style={{ gap: 16 }}>
          {/* ✅ Substituí o Checkbox feio por um Toggle grande para quem usa luvas */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: 600, color: "var(--text)" }}>Status:</span>
            <button 
              onClick={() => onChange({ ...value, value: !value.value })}
              style={{
                flex: 1, padding: "10px", borderRadius: "8px", fontWeight: 700, cursor: "pointer", border: "none",
                background: value.value ? "var(--accent)" : "var(--glass-bg)",
                color: value.value ? "#fff" : "var(--muted)"
              }}
            >
              {value.value ? "✅ Sim / OK" : "❌ Não / Problema"}
            </button>
          </div>
          <Field label="Observações">
            <Textarea value={value.obs || ""} onChange={(e) => onChange({ ...value, obs: e.target.value })} rows={2} placeholder="Justifique se houver problema..." />
          </Field>
        </div>
      )}

      {value.kind === "number" && (
        <div className="grid" style={{ gap: 12 }}>
          <Field label="Quantidade Registrada">
            <Input value={value.value || ""} onChange={(e) => onChange({ ...value, value: onlyDigits(e.target.value) })} inputMode="numeric" placeholder="0" />
          </Field>
          <Field label="Observações">
            <Textarea value={value.obs || ""} onChange={(e) => onChange({ ...value, obs: e.target.value })} rows={2} placeholder="Se necessário..." />
          </Field>
        </div>
      )}

      {value.kind === "text" && (
        <div className="grid">
          <Field label="Sua Resposta">
            <Textarea value={value.value || ""} onChange={(e) => onChange({ ...value, value: e.target.value })} rows={3} placeholder="Digite os detalhes aqui..." />
          </Field>
        </div>
      )}
    </div>
  );
}