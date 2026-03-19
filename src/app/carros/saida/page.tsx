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

  const [paletesCarregados, setPaletesCarregados] = useState("");
  const [paletesVazios, setPaletesVazios] = useState("");

  const [levaPaleteira, setLevaPaleteira] = useState(false);
  const [qtdPaleteira, setQtdPaleteira] = useState("1");

  const [levaStretch, setLevaStretch] = useState(false);
  const [qtdStretchSaida, setQtdStretchSaida] = useState("");
  const [exigeTubete, setExigeTubete] = useState(true);

  const [obs, setObs] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "error" | "success" | "" }>({ text: "", type: "" });

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

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); // Usando form event para capturar submissão
    setLoading(true);
    setMsg({ text: "", type: "" });

    try {
      if (levaStretch) {
        const n = Number(qtdStretchSaida || 0);
        if (!Number.isFinite(n) || Math.trunc(n) <= 0) {
          throw new Error("Informe a quantidade de stretch na saída.");
        }
      }

      const r = await fetch("/api/carros/saida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          placa,
          motorista,
          destino,

          qtd_paletes: totalPaletes,

          leva_paleteira: levaPaleteira,
          qtd_paleteira: levaPaleteira ? qtdPaleteira : null,

          leva_stretch: levaStretch,
          qtd_stretch_saida: levaStretch ? qtdStretchSaida : null,
          exige_tubete_retorno: levaStretch ? exigeTubete : false,

          extras: {
            paletes_carregados: paletesCarregados,
            paletes_vazios: paletesVazios,
            qtd_stretch_saida: levaStretch ? qtdStretchSaida : null,
            obs,
          },
        }),
      });

      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha ao salvar");

      setMsg({ text: "✅ Saída registrada com sucesso!", type: "success" });
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
      
      setTimeout(() => setMsg({ text: "", type: "" }), 3000);
    } catch (err: any) {
      setMsg({ text: `❌ ${err?.message || "Erro"}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid" style={{ gap: 24, padding: "16px 0 40px" }}>
      {/* CABEÇALHO */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 300px" }}>
          <h1 className="h1">🚚 Saída de Veículo</h1>
          <p className="sub" style={{ marginTop: 4 }}>
            Registre o que sai e o que precisa voltar em um fluxo simples.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/pendencias">
            <Button variant="ghost" style={{ color: "var(--accent)" }}>Pendências →</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">← Home</Button>
          </Link>
        </div>
      </div>

      {/* PAINEL DE RESUMO RÁPIDO */}
      <Card style={{ padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <Pill style={{ background: "var(--surface2)", border: "none" }}>📦 Total Paletes: <b>{totalPaletes || "0"}</b></Pill>
          {levaPaleteira ? (
            <Pill className="pillWarn" style={{ border: "none" }}>🛒 Paleteira x{qtdPaleteira || 1}</Pill>
          ) : (
            <Pill style={{ border: "none" }}>🛒 Sem paleteira</Pill>
          )}
          {levaStretch ? (
            <Pill className="pillWarn" style={{ border: "none" }}>🧻 {stretchPill}</Pill>
          ) : (
            <Pill style={{ border: "none" }}>🧻 Sem stretch</Pill>
          )}
        </div>
      </Card>

      <form onSubmit={salvar} className="grid" style={{ gap: 20 }}>
        <div className="gridCards">
          {/* IDENTIFICAÇÃO DO CARRO */}
          <Card>
            <div className="cardKicker">Identificação</div>
            <div className="cardTitle">Dados Básicos</div>
            <div className="divider" style={{ marginBottom: 16 }} />
            
            <div className="grid" style={{ gap: 16 }}>
              <Field label="Placa do Veículo">
                <Input value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="Ex: ABC1D23" required />
              </Field>
              <Field label="Motorista">
                <Input value={motorista} onChange={(e) => setMotorista(e.target.value)} placeholder="Nome do responsável" required />
              </Field>
              <Field label="Destino da Carga">
                <Input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Cidade / CD / Cliente" required />
              </Field>
            </div>
          </Card>

          {/* PALETES */}
          <Card>
            <div className="cardKicker">Carga</div>
            <div className="cardTitle">Controle de Paletes</div>
            <div className="divider" style={{ marginBottom: 16 }} />
            
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Carregados" hint="Com mercadoria">
                <Input
                  value={paletesCarregados}
                  onChange={(e) => setPaletesCarregados(onlyDigits(e.target.value))}
                  inputMode="numeric"
                  placeholder="0"
                />
              </Field>
              <Field label="Vazios" hint="Apenas o palete">
                <Input
                  value={paletesVazios}
                  onChange={(e) => setPaletesVazios(onlyDigits(e.target.value))}
                  inputMode="numeric"
                  placeholder="0"
                />
              </Field>
            </div>

            <div style={{ marginTop: 24 }}>
              <Field label="Observações de Carga" hint="Ex: Paletes PBR danificados, troca exigida na volta, etc.">
                <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} placeholder="Opcional" />
              </Field>
            </div>
          </Card>
        </div>

        {/* EQUIPAMENTOS COM DEVOLUÇÃO OBRIGATÓRIA */}
        <Card>
          <div className="cardKicker">Controle e Auditoria</div>
          <div className="cardTitle">Equipamentos da Viagem (Pendências)</div>
          <div className="divider" style={{ marginBottom: 20 }} />

          <div className="grid" style={{ gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            
            {/* BLOCO PALETEIRA */}
            <div style={{ padding: 16, background: "var(--surface2)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: levaPaleteira ? 16 : 0 }}>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>Leva Paleteira?</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = !levaPaleteira;
                    setLevaPaleteira(next);
                    if (!next) setQtdPaleteira("1");
                  }}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "8px", fontWeight: 700, cursor: "pointer", border: "none",
                    background: levaPaleteira ? "var(--accent)" : "var(--glass-bg)",
                    color: levaPaleteira ? "#fff" : "var(--muted)", transition: "0.2s"
                  }}
                >
                  {levaPaleteira ? "✅ Sim" : "❌ Não"}
                </button>
              </div>

              {levaPaleteira && (
                <Field label="Quantidade de Paleteiras" hint="Quantas ele precisa devolver?">
                  <Input
                    value={qtdPaleteira}
                    onChange={(e) => setQtdPaleteira(onlyDigits(e.target.value))}
                    inputMode="numeric"
                    placeholder="1"
                    required
                  />
                </Field>
              )}
            </div>

            {/* BLOCO STRETCH */}
            <div style={{ padding: 16, background: "var(--surface2)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: levaStretch ? 16 : 0 }}>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>Leva Stretch?</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = !levaStretch;
                    setLevaStretch(next);
                    if (!next) {
                      setQtdStretchSaida("");
                      setExigeTubete(true);
                    }
                  }}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "8px", fontWeight: 700, cursor: "pointer", border: "none",
                    background: levaStretch ? "var(--accent)" : "var(--glass-bg)",
                    color: levaStretch ? "#fff" : "var(--muted)", transition: "0.2s"
                  }}
                >
                  {levaStretch ? "✅ Sim" : "❌ Não"}
                </button>
              </div>

              {levaStretch && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Field label="Quantidade de Bobinas (Saída)" hint="Obrigatório registrar">
                    <Input
                      value={qtdStretchSaida}
                      onChange={(e) => setQtdStretchSaida(onlyDigits(e.target.value).slice(0, 4))}
                      inputMode="numeric"
                      placeholder="Ex: 2"
                      required
                    />
                  </Field>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text)" }}>Exigir Tubete Vazio na volta?</span>
                    <button
                      type="button"
                      onClick={() => setExigeTubete(!exigeTubete)}
                      style={{
                        padding: "8px 16px", borderRadius: "8px", fontWeight: 700, cursor: "pointer", border: "none",
                        background: exigeTubete ? "var(--warnBg)" : "var(--glass-bg)",
                        color: exigeTubete ? "var(--warnText)" : "var(--muted)", transition: "0.2s"
                      }}
                    >
                      {exigeTubete ? "⚠️ Exigir" : "Não Exigir"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* FEEDBACK E SUBMIT */}
        {msg.text && (
          <div style={{
            padding: 16, borderRadius: 8, 
            background: msg.type === "success" ? "var(--glass-bg)" : "var(--dangerBg)", 
            color: msg.type === "success" ? "var(--accent)" : "var(--danger)",
            border: `1px solid ${msg.type === "success" ? "var(--accent)" : "var(--danger)"}`,
            fontWeight: 600, textAlign: "center"
          }}>
            {msg.text}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="submit" variant="primary" disabled={loading} style={{ minWidth: 240, minHeight: 56, fontSize: "1.1rem" }}>
            {loading ? "Salvando..." : "💾 Registrar Saída"}
          </Button>
        </div>
      </form>
    </main>
  );
}