"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function RetornoPage() {
  const [carregamentoId, setCarregamentoId] = useState<string>("");

  const [paleteiraDevolvida, setPaleteiraDevolvida] = useState<boolean>(true);
  const [tubeteDevolvido, setTubeteDevolvido] = useState<boolean>(true);

  // ✅ Paletes no retorno
  const [qtdPaletesRetorno, setQtdPaletesRetorno] = useState<string>("");

  // ✅ NOVO: Stretch no retorno
  const [qtdStretchRetorno, setQtdStretchRetorno] = useState<string>("");

  const [obs, setObs] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const sp = useSearchParams();
  const paletesParam = sp.get("paletes"); // vem da pendência

  useEffect(() => {
    if (paletesParam && /^\d+$/.test(paletesParam)) setQtdPaletesRetorno(paletesParam);
  }, [paletesParam]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("id") || "";
    setCarregamentoId(id);
  }, []);

  async function salvar() {
    setLoading(true);
    setMsg("");
    try {
      if (!carregamentoId) throw new Error("ID do carregamento ausente.");

      const qtdPal =
        qtdPaletesRetorno.trim() === "" ? null : Number(qtdPaletesRetorno.trim());
      if (qtdPal != null && (!Number.isFinite(qtdPal) || qtdPal < 0)) {
        throw new Error("Qtd de paletes inválida.");
      }

      const qtdStr =
        qtdStretchRetorno.trim() === "" ? null : Number(qtdStretchRetorno.trim());
      if (qtdStr != null && (!Number.isFinite(qtdStr) || qtdStr < 0)) {
        throw new Error("Qtd de stretch inválida.");
      }

      const r = await fetch("/api/carros/retorno", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        credentials: "include",
        body: JSON.stringify({
          carregamento_id: carregamentoId,
          qtd_paletes_retorno: qtdPal,
          qtd_stretch_retorno: qtdStr, // ✅ NOVO
          paleteira_devolvida: paleteiraDevolvida,
          tubete_devolvido: tubeteDevolvido,
          obs,
        }),
      });

      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha ao salvar retorno");

      setMsg(d.ok_final ? "✅ Retorno OK! Carregamento fechado." : "⚠️ Retorno registrado, ainda com pendências.");
    } catch (e: any) {
      setMsg(e?.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>↩️ Retorno</h1>
          <div style={{ opacity: 0.8, marginTop: 4 }}>
            Informe paletes, stretch e confirme devoluções para fechar o carregamento.
          </div>
        </div>
        <Link href="/pendencias" style={{ color: "#8ab4ff" }}>⬅ Pendências</Link>
      </div>

      <section style={card}>
        <div style={{ opacity: 0.85, fontSize: 13 }}>Carregamento</div>
        <div style={{ fontSize: 16, marginTop: 4, wordBreak: "break-word" }}>
          {carregamentoId || "—"}
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {/* Paletes retorno */}
          <div>
            <div style={{ opacity: 0.9, fontSize: 13, marginBottom: 6 }}>📦 Paletes no retorno</div>
            <input
              value={qtdPaletesRetorno}
              onChange={(e) => setQtdPaletesRetorno(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
              placeholder="0"
              inputMode="numeric"
              style={inp}
            />
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
              Quantidade total de paletes que voltou (carregados + vazios).
            </div>
          </div>

          {/* ✅ Stretch retorno */}
          <div>
            <div style={{ opacity: 0.9, fontSize: 13, marginBottom: 6 }}>🧻 Stretch no retorno</div>
            <input
              value={qtdStretchRetorno}
              onChange={(e) => setQtdStretchRetorno(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
              placeholder="0"
              inputMode="numeric"
              style={inp}
            />
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
              Informe quantos tubetes/stretch retornaram (se saiu com stretch).
            </div>
          </div>

          <label style={lbl}>
            <input
              type="checkbox"
              checked={paleteiraDevolvida}
              onChange={(e) => setPaleteiraDevolvida(e.target.checked)}
            />
            Paleteira devolvida
          </label>

          <label style={lbl}>
            <input
              type="checkbox"
              checked={tubeteDevolvido}
              onChange={(e) => setTubeteDevolvido(e.target.checked)}
            />
            Tubete devolvido (se usou stretch)
          </label>

          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Observações (opcional)"
            rows={3}
            style={inp}
          />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
          <button onClick={salvar} disabled={loading} style={btn}>
            {loading ? "Salvando…" : "💾 Salvar retorno"}
          </button>

          <Link href="/carros/saida" style={{ color: "#8ab4ff" }}>+ Nova saída</Link>

          {msg ? <span style={{ opacity: 0.9 }}>{msg}</span> : null}
        </div>
      </section>
    </main>
  );
}

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 14,
  padding: 14,
  marginTop: 14,
};

const lbl: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  opacity: 0.9,
};

const inp: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.25)",
  color: "inherit",
};

const btn: React.CSSProperties = {
  cursor: "pointer",
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(138,180,255,0.20)",
  color: "inherit",
};
