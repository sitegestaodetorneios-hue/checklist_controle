"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Field, Input, Textarea, Pill } from "../../components/ui";

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

export default function RetornoClient() {
  const [carregamentoId, setCarregamentoId] = useState<string>("");

  const [paleteiraDevolvida, setPaleteiraDevolvida] = useState<boolean>(true);
  const [tubeteDevolvido, setTubeteDevolvido] = useState<boolean>(true);

  const [qtdPaletesRetorno, setQtdPaletesRetorno] = useState<string>("");
  const [qtdStretchRetorno, setQtdStretchRetorno] = useState<string>("");

  const [obs, setObs] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "error" | "success" | "warning" | "" }>({ text: "", type: "" });

  const sp = useSearchParams();
  const idParam = sp.get("id") || "";
  const paletesParam = sp.get("paletes");

  useEffect(() => {
    setCarregamentoId(idParam);
  }, [idParam]);

  useEffect(() => {
    if (paletesParam && /^\d+$/.test(paletesParam)) setQtdPaletesRetorno(paletesParam);
  }, [paletesParam]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: "", type: "" });
    
    try {
      if (!carregamentoId) throw new Error("ID do carregamento ausente na URL.");

      const qtdPal = qtdPaletesRetorno.trim() === "" ? null : Number(qtdPaletesRetorno.trim());
      if (qtdPal != null && (!Number.isFinite(qtdPal) || qtdPal < 0)) {
        throw new Error("Quantidade de paletes inválida.");
      }

      const qtdStr = qtdStretchRetorno.trim() === "" ? null : Number(qtdStretchRetorno.trim());
      if (qtdStr != null && (!Number.isFinite(qtdStr) || qtdStr < 0)) {
        throw new Error("Quantidade de stretch inválida.");
      }

      const r = await fetch("/api/carros/retorno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          carregamento_id: carregamentoId,
          qtd_paletes_retorno: qtdPal,
          qtd_stretch_retorno: qtdStr,
          paleteira_devolvida: paleteiraDevolvida,
          tubete_devolvido: tubeteDevolvido,
          obs,
        }),
      });

      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha ao salvar retorno");

      if (d.ok_final) {
        setMsg({ text: "✅ Retorno concluído! Carregamento FECHADO sem pendências.", type: "success" });
      } else {
        setMsg({ text: "⚠️ Retorno salvo, mas AINDA HÁ PENDÊNCIAS nesse carregamento.", type: "warning" });
      }
      
    } catch (err: any) {
      setMsg({ text: `❌ ${err?.message || "Erro"}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      
      {/* IDENTIFICAÇÃO DO CARREGAMENTO */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        <div className="cardKicker">Vinculado a Pendência</div>
        <div style={{ fontSize: "1.2rem", fontWeight: 700, wordBreak: "break-all", color: "var(--accent)" }}>
          {carregamentoId ? `ID: ${carregamentoId}` : "ID não fornecido"}
        </div>
      </div>

      <div className="divider" style={{ margin: "16px 0" }} />

      <form onSubmit={salvar} className="grid" style={{ gap: 24 }}>
        
        {/* BLOCO QUANTIDADES */}
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <Field label="📦 Paletes Retornados" hint="Total (carregados + vazios)">
            <Input
              value={qtdPaletesRetorno}
              onChange={(e) => setQtdPaletesRetorno(onlyDigits(e.target.value).slice(0, 4))}
              placeholder="0"
              inputMode="numeric"
              required
            />
          </Field>

          <Field label="🧻 Stretch / Tubetes" hint="Quantos retornaram?">
            <Input
              value={qtdStretchRetorno}
              onChange={(e) => setQtdStretchRetorno(onlyDigits(e.target.value).slice(0, 4))}
              placeholder="0"
              inputMode="numeric"
              required
            />
          </Field>
        </div>

        {/* BLOCO EQUIPAMENTOS (TOGGLES DE DEVOLUÇÃO) */}
        <div className="grid" style={{ gap: 16 }}>
          <div style={{ padding: 16, background: "var(--surface2)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontWeight: 700, flex: 1, color: "var(--text)" }}>Paleteira(s) Devolvida(s)?</span>
              <button
                type="button"
                onClick={() => setPaleteiraDevolvida(!paleteiraDevolvida)}
                style={{
                  padding: "10px 16px", borderRadius: "8px", fontWeight: 700, cursor: "pointer", border: "none",
                  background: paleteiraDevolvida ? "#dcfce7" : "var(--dangerBg)",
                  color: paleteiraDevolvida ? "#166534" : "var(--danger)", transition: "0.2s"
                }}
              >
                {paleteiraDevolvida ? "✅ Sim (OK)" : "❌ Não Voltou"}
              </button>
            </div>
          </div>

          <div style={{ padding: 16, background: "var(--surface2)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "var(--text)" }}>Tubete Devolvido?</div>
                <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>(Apenas se saiu com Stretch)</div>
              </div>
              <button
                type="button"
                onClick={() => setTubeteDevolvido(!tubeteDevolvido)}
                style={{
                  padding: "10px 16px", borderRadius: "8px", fontWeight: 700, cursor: "pointer", border: "none",
                  background: tubeteDevolvido ? "#dcfce7" : "var(--dangerBg)",
                  color: tubeteDevolvido ? "#166534" : "var(--danger)", transition: "0.2s"
                }}
              >
                {tubeteDevolvido ? "✅ Sim (OK)" : "❌ Faltou"}
              </button>
            </div>
          </div>
        </div>

        {/* BLOCO OBSERVAÇÕES */}
        <Field label="Observações de Retorno" hint="Avarias, motivos de falta, etc.">
          <Textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Opcional..."
            rows={3}
          />
        </Field>

        {/* FEEDBACK MENSAGENS */}
        {msg.text && (
          <div style={{
            padding: 16, borderRadius: 8, 
            background: msg.type === "success" ? "var(--glass-bg)" : msg.type === "warning" ? "var(--warnBg)" : "var(--dangerBg)", 
            color: msg.type === "success" ? "var(--accent)" : msg.type === "warning" ? "var(--warnText)" : "var(--danger)",
            border: `1px solid ${msg.type === "success" ? "var(--accent)" : msg.type === "warning" ? "var(--warnBorder)" : "var(--danger)"}`,
            fontWeight: 600, textAlign: "center", lineHeight: 1.4
          }}>
            {msg.text}
          </div>
        )}

        {/* AÇÕES FINAIS */}
        <div className="divider" style={{ margin: "8px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <Link href="/carros/saida" style={{ textDecoration: "none" }}>
            <Button type="button" variant="ghost" style={{ color: "var(--accent)" }}>
              + Nova Saída
            </Button>
          </Link>

          <Button type="submit" variant="primary" disabled={loading || !carregamentoId} style={{ minWidth: 200, minHeight: 52, fontSize: "1.05rem" }}>
            {loading ? "Processando..." : "💾 Salvar Retorno"}
          </Button>
        </div>

      </form>
    </Card>
  );
}