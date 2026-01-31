"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Card, Field, Input, Pill, Textarea } from "../../components/ui";

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

function onlyDigits(v: string) {
  return v.replace(/[^\d]/g, "");
}

export default function SaidaCarroPage() {
  const [placa, setPlaca] = useState("");
  const [motorista, setMotorista] = useState("");
  const [destino, setDestino] = useState("");

  // Paletes: separados (carregados e vazios) — total é calculado
  const [paletesCarregados, setPaletesCarregados] = useState("");
  const [paletesVazios, setPaletesVazios] = useState("");

  const [levaPaleteira, setLevaPaleteira] = useState(false);
  const [qtdPaleteira, setQtdPaleteira] = useState("1");

  const [levaStretch, setLevaStretch] = useState(false);
  const [qtdStretchSaida, setQtdStretchSaida] = useState(""); // ✅ NOVO
  const [exigeTubete, setExigeTubete] = useState(true);

  const [obs, setObs] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const totalPaletes = useMemo(() => {
    const a = Number(paletesCarregados || 0);
    const b = Number(paletesVazios || 0);
    const t = (Number.isFinite(a) ? a : 0) + (Number.isFinite(b) ? b : 0);
    return t ? String(t) : "";
  }, [paletesCarregados, paletesVazios]);

  const stretchPill = useMemo(() => {
    if (!levaStretch) return "Sem stretch";
    const qtd = Number(qtdStretchSaida || 0);
    const qtxt = Number.isFinite(qtd) && qtd > 0 ? `x${qtd}` : "x?";
    return `Stretch ${qtxt} (tubete: ${exigeTubete ? "exigir" : "não"})`;
  }, [levaStretch, qtdStretchSaida, exigeTubete]);

  async function salvar() {
    setLoading(true);
    setMsg("");

    try {
      // ✅ regra: se levaStretch = true, qtd é obrigatório > 0
      if (levaStretch) {
        const n = Number(qtdStretchSaida || 0);
        if (!Number.isFinite(n) || Math.trunc(n) <= 0) {
          throw new Error("Informe a quantidade de stretch na saída.");
        }
      }

      const r = await fetch("/api/carros/saida", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        credentials: "include",
        body: JSON.stringify({
          placa,
          motorista,
          destino,

          qtd_paletes: totalPaletes,

          leva_paleteira: levaPaleteira,
          qtd_paleteira: levaPaleteira ? qtdPaleteira : null,

          leva_stretch: levaStretch,
          qtd_stretch_saida: levaStretch ? qtdStretchSaida : null, // ✅ NOVO
          exige_tubete_retorno: levaStretch ? exigeTubete : false,

          extras: {
            paletes_carregados: paletesCarregados,
            paletes_vazios: paletesVazios,
            qtd_stretch_saida: levaStretch ? qtdStretchSaida : null, // ✅ também em extras
            obs,
          },
        }),
      });

      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha ao salvar");

      setMsg("✅ Saída registrada!");
      setPlaca("");
      setMotorista("");
      setDestino("");
      setPaletesCarregados("");
      setPaletesVazios("");
      setLevaPaleteira(false);
      setQtdPaleteira("1");
      setLevaStretch(false);
      setQtdStretchSaida("");
      setExigeTubete(true);
      setObs("");
    } catch (e: any) {
      setMsg(e?.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid" style={{ paddingTop: 12 }}>
      <div className="row">
        <div>
          <h1 className="h1">🚚 Saída do carro</h1>
          <div className="sub">Registre o que está saindo — e o que precisa voltar — em um fluxo simples.</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/pendencias">Pendências →</Link>
          <Link href="/">Home</Link>
        </div>
      </div>

      <Card>
        <div className="row">
          <Pill>📦 Paletes total: {totalPaletes || "—"}</Pill>
          {levaPaleteira ? (
            <Pill className="pillWarn">🛒 Paleteira x{qtdPaleteira || 1}</Pill>
          ) : (
            <Pill>🛒 Sem paleteira</Pill>
          )}
          {levaStretch ? (
            <Pill className="pillWarn">{stretchPill}</Pill>
          ) : (
            <Pill>Sem stretch</Pill>
          )}
        </div>
      </Card>

      <div className="gridCards">
        <Card>
          <div className="cardKicker">Identificação</div>
          <div className="cardTitle">Dados básicos</div>
          <div className="divider" />
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <Field label="Placa">
              <Input value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="Ex: ABC1D23" />
            </Field>
            <Field label="Motorista">
              <Input value={motorista} onChange={(e) => setMotorista(e.target.value)} placeholder="Nome" />
            </Field>
            <Field label="Destino">
              <Input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Cidade / CD / Cliente" />
            </Field>
          </div>
        </Card>

        <Card>
          <div className="cardKicker">Carga</div>
          <div className="cardTitle">Paletes</div>
          <div className="divider" />
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Carregados">
              <Input
                value={paletesCarregados}
                onChange={(e) => setPaletesCarregados(onlyDigits(e.target.value))}
                inputMode="numeric"
                placeholder="0"
              />
            </Field>
            <Field label="Vazios">
              <Input
                value={paletesVazios}
                onChange={(e) => setPaletesVazios(onlyDigits(e.target.value))}
                inputMode="numeric"
                placeholder="0"
              />
            </Field>
          </div>

          <div style={{ marginTop: 10 }}>
            <Field label="Observações" hint="Ex: palete PBR danificado, troca na volta, etc.">
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} placeholder="Opcional" />
            </Field>
          </div>
        </Card>
      </div>

      <Card>
        <div className="cardKicker">Equipamentos na viagem</div>
        <div className="cardTitle">Devolução obrigatória (no retorno)</div>
        <div className="divider" />

        <div className="checkboxRow">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={levaPaleteira}
              onChange={(e) => {
                setLevaPaleteira(e.target.checked);
                if (!e.target.checked) setQtdPaleteira("1");
              }}
            />
            Leva paleteira
          </label>

          {levaPaleteira ? (
            <div style={{ minWidth: 180 }}>
              <Field label="Qtd paleteiras">
                <Input
                  value={qtdPaleteira}
                  onChange={(e) => setQtdPaleteira(onlyDigits(e.target.value))}
                  inputMode="numeric"
                  placeholder="1"
                />
              </Field>
            </div>
          ) : null}

          <label className="checkbox">
            <input
              type="checkbox"
              checked={levaStretch}
              onChange={(e) => {
                const ck = e.target.checked;
                setLevaStretch(ck);
                if (!ck) {
                  setQtdStretchSaida("");
                  setExigeTubete(true);
                }
              }}
            />
            Leva stretch
          </label>

          {levaStretch ? (
            <>
              <div style={{ minWidth: 180 }}>
                <Field label="Qtd stretch (saída)" hint="Obrigatório se marcou stretch">
                  <Input
                    value={qtdStretchSaida}
                    onChange={(e) => setQtdStretchSaida(onlyDigits(e.target.value).slice(0, 4))}
                    inputMode="numeric"
                    placeholder="1"
                  />
                </Field>
              </div>

              <label className="checkbox">
                <input type="checkbox" checked={exigeTubete} onChange={(e) => setExigeTubete(e.target.checked)} />
                Exigir devolução do tubete vazio
              </label>
            </>
          ) : null}
        </div>

        <div className="row" style={{ marginTop: 12, alignItems: "center" }}>
          <Button variant="primary" onClick={salvar} disabled={loading}>
            {loading ? "Salvando…" : "💾 Registrar saída"}
          </Button>
          {msg ? <span style={{ color: "var(--muted)", fontSize: 13 }}>{msg}</span> : null}
        </div>
      </Card>
    </main>
  );
}
