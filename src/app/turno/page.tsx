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

  // Itens fixos (mantidos por compatibilidade)
  const [coletoresTotal, setColetoresTotal] = useState<string>("");
  const [coletoresOk, setColetoresOk] = useState<string>("");
  const [obsColetores, setObsColetores] = useState<string>("");

  const [paleteirasTotal, setPaleteirasTotal] = useState<string>("");
  const [paleteirasOk, setPaleteirasOk] = useState<string>("");
  const [obsPaleteiras, setObsPaleteiras] = useState<string>("");

  // Itens extras configuráveis no admin
  const [items, setItems] = useState<Item[]>([]);
  const [extras, setExtras] = useState<Record<string, ExtraValue>>({});

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  // Puxa preferências do usuário (turno default)
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

  // Carrega itens extras do checklist
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/items/list?scope=turno_inicio", { credentials: "include", cache: "no-store" });
        const d = await safeJson(r);
        if (r.ok) {
          const list = (d.items || []) as Item[];
          setItems(list);
          // inicializa valores
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
    setMsg("");

    try {
      const r = await fetch("/api/turno/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        credentials: "include",
        cache: "no-store",
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

      setMsg("✅ Checklist salvo com sucesso!");
      setObsColetores("");
      setObsPaleteiras("");
    } catch (e: any) {
      setMsg(e?.message || "Erro");
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
    setMsg("");
    setExtras((prev) => {
      const next: Record<string, ExtraValue> = { ...prev };
      for (const k of Object.keys(next)) {
        const v = next[k];
        if (v.kind === "count_ok_obs") next[k] = { kind: "count_ok_obs" };
        if (v.kind === "yesno") next[k] = { kind: "yesno", value: false };
        if (v.kind === "number") next[k] = { kind: "number" };
        if (v.kind === "text") next[k] = { kind: "text" };
      }
      return next;
    });
  }

  return (
    <main className="grid" style={{ paddingTop: 12 }}>
      <div className="row">
        <div>
          <h1 className="h1">✅ Checklist de início de turno</h1>
          <div className="sub">Preencha em 60 segundos. Tudo fica auditável e vira alerta se faltar.</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/">Home</Link>
          <Link href="/pendencias">Pendências →</Link>
        </div>
      </div>

      <Card>
        <div className="row">
          <div style={{ minWidth: 220 }}>
            <Field label="Turno" hint="O default vem do admin (pode trocar aqui).">
              <Select value={turno} onChange={(e) => setTurno(e.target.value as any)}>
                {TURNOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Pill>📱 Coletores: {resumo.coletores}</Pill>
            <Pill>🛒 Paleteiras: {resumo.paleteiras}</Pill>
          </div>
        </div>
      </Card>

      <div className="gridCards">
        <Card>
          <div className="cardKicker">Equipamentos</div>
          <div className="cardTitle">📱 Coletores</div>
          <div className="divider" />
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Total">
              <Input value={coletoresTotal} onChange={(e) => setColetoresTotal(onlyDigits(e.target.value))} inputMode="numeric" placeholder="Ex: 12" />
            </Field>
            <Field label="OK">
              <Input value={coletoresOk} onChange={(e) => setColetoresOk(onlyDigits(e.target.value))} inputMode="numeric" placeholder="Ex: 11" />
            </Field>
          </div>
          <div style={{ marginTop: 10 }}>
            <Field label="Observações" hint="Só se tiver algum problema (rápido).">
              <Textarea value={obsColetores} onChange={(e) => setObsColetores(e.target.value)} rows={3} placeholder="Ex: coletor 12 com tela quebrada" />
            </Field>
          </div>
        </Card>

        <Card>
          <div className="cardKicker">Equipamentos</div>
          <div className="cardTitle">🛒 Paleteiras</div>
          <div className="divider" />
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Total">
              <Input value={paleteirasTotal} onChange={(e) => setPaleteirasTotal(onlyDigits(e.target.value))} inputMode="numeric" placeholder="Ex: 6" />
            </Field>
            <Field label="OK">
              <Input value={paleteirasOk} onChange={(e) => setPaleteirasOk(onlyDigits(e.target.value))} inputMode="numeric" placeholder="Ex: 6" />
            </Field>
          </div>
          <div style={{ marginTop: 10 }}>
            <Field label="Observações" hint="Ex: paleteira 3 com vazamento.">
              <Textarea value={obsPaleteiras} onChange={(e) => setObsPaleteiras(e.target.value)} rows={3} placeholder="Observações" />
            </Field>
          </div>
        </Card>
      </div>

      {items.length ? (
        <Card>
          <div className="row">
            <div>
              <div className="cardKicker">Configurável</div>
              <div className="cardTitle">Itens extras do turno</div>
              <div className="cardDesc">O admin consegue criar/ativar/desativar itens sem precisar mexer no código.</div>
            </div>
            <Pill>⚙️ Admin → Itens</Pill>
          </div>

          <div className="divider" />

          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
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
      ) : null}

      {warn.length ? <div className="warnBox"><b>Atenção:</b> {warn.join(" ")}</div> : null}

      <div className="row" style={{ alignItems: "center" }}>
        <Button variant="primary" onClick={salvar} disabled={loading}>
          {loading ? "Salvando…" : "💾 Salvar checklist"}
        </Button>
        <Button variant="ghost" onClick={clearAll} disabled={loading}>
          Limpar
        </Button>
        {msg ? <span style={{ color: "var(--muted)", fontSize: 13 }}>{msg}</span> : null}
      </div>
    </main>
  );
}

function ExtraItem({ item, value, onChange }: { item: Item; value?: ExtraValue; onChange: (v: ExtraValue) => void }) {
  if (!value) return null;

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div className="cardKicker">Extra</div>
          <div style={{ fontWeight: 800, marginTop: 4 }}>{item.label}</div>
        </div>
        {item.required ? <Pill className="pillWarn">Obrigatório</Pill> : <Pill>Opcional</Pill>}
      </div>

      <div className="divider" />

      {value.kind === "count_ok_obs" ? (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Total">
            <Input
              value={value.total || ""}
              onChange={(e) => onChange({ ...value, total: onlyDigits(e.target.value) })}
              inputMode="numeric"
              placeholder="Total"
            />
          </Field>
          <Field label="OK">
            <Input
              value={value.ok || ""}
              onChange={(e) => onChange({ ...value, ok: onlyDigits(e.target.value) })}
              inputMode="numeric"
              placeholder="OK"
            />
          </Field>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Observações">
              <Textarea value={value.obs || ""} onChange={(e) => onChange({ ...value, obs: e.target.value })} rows={2} placeholder="Se precisar" />
            </Field>
          </div>
        </div>
      ) : null}

      {value.kind === "yesno" ? (
        <div className="grid">
          <label className="checkbox">
            <input type="checkbox" checked={!!value.value} onChange={(e) => onChange({ ...value, value: e.target.checked })} />
            OK
          </label>
          <Field label="Observações">
            <Textarea value={value.obs || ""} onChange={(e) => onChange({ ...value, obs: e.target.value })} rows={2} placeholder="Se precisar" />
          </Field>
        </div>
      ) : null}

      {value.kind === "number" ? (
        <div className="grid">
          <Field label="Quantidade">
            <Input value={value.value || ""} onChange={(e) => onChange({ ...value, value: onlyDigits(e.target.value) })} inputMode="numeric" placeholder="0" />
          </Field>
          <Field label="Observações">
            <Textarea value={value.obs || ""} onChange={(e) => onChange({ ...value, obs: e.target.value })} rows={2} placeholder="Se precisar" />
          </Field>
        </div>
      ) : null}

      {value.kind === "text" ? (
        <div className="grid">
          <Field label="Resposta">
            <Textarea value={value.value || ""} onChange={(e) => onChange({ ...value, value: e.target.value })} rows={3} placeholder="Digite..." />
          </Field>
        </div>
      ) : null}
    </div>
  );
}
