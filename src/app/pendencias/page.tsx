"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  created_at: string;
  placa?: string | null;
  motorista?: string | null;
  destino?: string | null;

  qtd_paletes?: number | null;
  qtd_paletes_retorno?: number | null;

  leva_paleteira: boolean;
  qtd_paleteira?: number | null;
  leva_stretch: boolean;
  exige_tubete_retorno: boolean;

  status: string;
  precisa_devolver?: string[];
};

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

export default function PendenciasPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  // ✅ guarda paletes por carregamento (digitado na Pendência)
  const [paletesRetById, setPaletesRetById] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch("/api/pendencias/list", { credentials: "include", cache: "no-store" });
      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha ao carregar");

      const list: Row[] = d.rows || [];
      setRows(list);

      // ✅ preenche estado com o que já existe no banco (se tiver)
      const map: Record<string, string> = {};
      for (const it of list) {
        if (it.qtd_paletes_retorno != null) map[it.id] = String(it.qtd_paletes_retorno);
      }
      setPaletesRetById(map);
    } catch (e: any) {
      setMsg(e?.message || "Erro");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const hay = [r.id, r.placa, r.motorista, r.destino, r.status, ...(r.precisa_devolver || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>🚨 Pendências</h1>
          <div style={{ opacity: 0.8, marginTop: 4 }}>
            Retorno de paleteira / tubete / fechamento de carregamentos.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/carros/saida" style={{ color: "#8ab4ff" }}>+ Nova saída</Link>
          <Link href="/" style={{ color: "#8ab4ff" }}>⬅ Home</Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar placa / motorista / destino…"
          style={inp}
        />
        <button onClick={load} disabled={loading} style={btnSecondary}>
          {loading ? "…" : "🔄 Atualizar"}
        </button>
        <span style={{ opacity: 0.8 }}>Registros: {filtered.length}</span>
      </div>

      {msg ? <div style={{ marginTop: 10, opacity: 0.9 }}>{msg}</div> : null}
      {loading ? <div style={{ marginTop: 10, opacity: 0.8 }}>Carregando…</div> : null}

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {!loading && filtered.length === 0 ? (
          <div style={card}>Nenhuma pendência.</div>
        ) : (
          filtered.map((r) => {
            const paletesVal = paletesRetById[r.id] ?? "";
            const hrefRetorno =
              `/carros/retorno?id=${encodeURIComponent(r.id)}` +
              (paletesVal.trim() ? `&paletes=${encodeURIComponent(paletesVal.trim())}` : "");

            return (
              <div key={r.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </div>

                    <div style={{ fontSize: 18, marginTop: 2 }}>
                      {r.placa ? `🚚 ${r.placa}` : "🚚 Carregamento"}{" "}
                      <span style={badge}>{r.status}</span>
                    </div>

                    <div style={{ opacity: 0.85, marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {r.motorista ? <span style={pill}>👤 {r.motorista}</span> : null}
                      {r.destino ? <span style={pill}>📍 {r.destino}</span> : null}
                      {r.qtd_paletes != null ? <span style={pill}>📦 Saída: {r.qtd_paletes}</span> : null}
                      {r.qtd_paletes_retorno != null ? (
                        <span style={pillWarn}>📦 Retorno: {r.qtd_paletes_retorno}</span>
                      ) : null}
                    </div>

                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {r.leva_paleteira ? (
                        <span style={pillWarn}>
                          🛒 Paleteira {r.qtd_paleteira ? `x${r.qtd_paleteira}` : ""}
                        </span>
                      ) : null}
                      {r.exige_tubete_retorno ? <span style={pillWarn}>🧻 Tubete</span> : null}
                      {!r.leva_paleteira && !r.exige_tubete_retorno ? <span style={pill}>Sem devolução</span> : null}
                    </div>

                    {/* ✅ NOVO: input de paletes retorno na pendência */}
                    <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <label style={{ fontSize: 13, opacity: 0.85 }}>Paletes no retorno:</label>
                      <input
                        inputMode="numeric"
                        value={paletesVal}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^\d]/g, "").slice(0, 4);
                          setPaletesRetById((prev) => ({ ...prev, [r.id]: v }));
                        }}
                        placeholder="0"
                        style={inpSmall}
                      />
                      <span style={{ fontSize: 12, opacity: 0.75 }}>
                        (vai pré-preenchido no retorno)
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <Link href={hrefRetorno} style={btnLink}>
                      Registrar retorno
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 14,
  padding: 14,
};

const inp: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.25)",
  color: "inherit",
  minWidth: 280,
};

const inpSmall: React.CSSProperties = {
  width: 110,
  padding: 10,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.25)",
  color: "inherit",
};

const btnSecondary: React.CSSProperties = {
  cursor: "pointer",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "inherit",
};

const btnLink: React.CSSProperties = {
  textDecoration: "none",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(138,180,255,0.20)",
  color: "inherit",
  whiteSpace: "nowrap",
};

const pill: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  fontSize: 13,
};

const pillWarn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(255, 193, 7, 0.12)",
  border: "1px solid rgba(255, 193, 7, 0.25)",
  fontSize: 13,
};

const badge: React.CSSProperties = {
  marginLeft: 8,
  fontSize: 12,
  padding: "3px 8px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.10)",
};
