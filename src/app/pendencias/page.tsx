"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, Input, Pill, Button, Badge } from "../components/ui";

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
  const [msg, setMsg] = useState<{ text: string; type: "error" | "info" | "" }>({ text: "", type: "" });
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  // Guarda paletes por carregamento (digitado na Pendência)
  const [paletesRetById, setPaletesRetById] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setMsg({ text: "", type: "" });
    try {
      const r = await fetch("/api/pendencias/list", { credentials: "include", cache: "no-store" });
      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha ao carregar pendências");

      const list: Row[] = d.rows || [];
      setRows(list);

      // Preenche estado com o que já existe no banco (se tiver)
      const map: Record<string, string> = {};
      for (const it of list) {
        if (it.qtd_paletes_retorno != null) map[it.id] = String(it.qtd_paletes_retorno);
      }
      setPaletesRetById(map);
    } catch (e: any) {
      setMsg({ text: `❌ ${e?.message || "Erro"}`, type: "error" });
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
    <main className="grid" style={{ gap: 24, padding: "16px 0 40px" }}>
      {/* CABEÇALHO */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 300px" }}>
          <h1 className="h1">🚨 Pendências Abertas</h1>
          <p className="sub" style={{ marginTop: 4 }}>
            Retorno de paleteira, tubete e fechamento de carregamentos.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/carros/saida">
            <Button variant="ghost" style={{ color: "var(--accent)" }}>+ Nova Saída</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">← Home</Button>
          </Link>
        </div>
      </div>

      {/* BARRA DE BUSCA */}
      <Card style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 280px" }}>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="🔍 Buscar placa, motorista, destino..."
              style={{ width: "100%" }}
            />
          </div>
          <Button onClick={load} disabled={loading} variant="ghost">
            {loading ? "Buscando..." : "🔄 Atualizar"}
          </Button>
          <Pill style={{ background: "var(--surface2)", border: "none" }}>
            Registros: {filtered.length}
          </Pill>
        </div>

        {msg.text && (
          <div style={{ marginTop: 12, color: msg.type === "error" ? "var(--danger)" : "var(--muted)", fontWeight: 600 }}>
            {msg.text}
          </div>
        )}
      </Card>

      {/* LISTA DE PENDÊNCIAS */}
      <div className="grid" style={{ gap: 16 }}>
        {!loading && filtered.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontWeight: 600 }}>
            🎉 Nenhuma pendência encontrada. Tudo em dia!
          </Card>
        ) : (
          filtered.map((r) => {
            const paletesVal = paletesRetById[r.id] ?? "";
            const hrefRetorno = `/carros/retorno?id=${encodeURIComponent(r.id)}${paletesVal.trim() ? `&paletes=${encodeURIComponent(paletesVal.trim())}` : ""}`;

            return (
              <Card key={r.id} style={{ padding: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  
                  {/* Linha 1: Título e Status */}
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
                        {new Date(r.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                        {r.placa ? `🚚 ${r.placa}` : "🚚 Carregamento Sem Placa"}
                        <Badge>{r.status}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Linha 2: Pílulas de Informação */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {r.motorista && <Pill>👤 {r.motorista}</Pill>}
                    {r.destino && <Pill>📍 {r.destino}</Pill>}
                    {r.qtd_paletes != null && <Pill>📦 Saída: {r.qtd_paletes}</Pill>}
                    {r.qtd_paletes_retorno != null && <Pill className="pillWarn">📦 Retorno Atual: {r.qtd_paletes_retorno}</Pill>}
                  </div>

                  {/* Linha 3: Equipamentos a Devolver */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "12px", background: "var(--surface2)", borderRadius: "var(--radius)" }}>
                    <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, width: "100%" }}>O QUE PRECISA VOLTAR:</span>
                    {r.leva_paleteira && (
                      <Pill className="pillWarn">🛒 Paleteira {r.qtd_paleteira ? `(x${r.qtd_paleteira})` : ""}</Pill>
                    )}
                    {r.exige_tubete_retorno && <Pill className="pillWarn">🧻 Tubete / Filme</Pill>}
                    {!r.leva_paleteira && !r.exige_tubete_retorno && <Pill>✅ Nenhum equipamento</Pill>}
                  </div>

                  {/* Linha 4: Ação de Retorno (Inputs + Botão) */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
                        Qtd. Paletes no Retorno:
                      </label>
                      <Input
                        inputMode="numeric"
                        value={paletesVal}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^\d]/g, "").slice(0, 4);
                          setPaletesRetById((prev) => ({ ...prev, [r.id]: v }));
                        }}
                        placeholder="Ex: 12"
                        style={{ width: 140 }}
                      />
                    </div>

                    <Link href={hrefRetorno} style={{ textDecoration: "none" }}>
                      <Button variant="primary" style={{ minWidth: 200 }}>
                        Registrar Retorno →
                      </Button>
                    </Link>
                  </div>

                </div>
              </Card>
            );
          })
        )}
      </div>
    </main>
  );
}