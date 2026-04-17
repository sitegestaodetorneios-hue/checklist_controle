"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, Pill } from "../../components/ui";

type HistoryRow = {
  id: string;
  created_at: string;
  updated_at: string;
  data_documento: string;
  equipe_responsavel: string;
  signature_name: string;
  created_by_username: string;
  created_by_nome: string;
  total_linhas: number;
  total_preenchidas: number;
  primeira_nf: string;
  primeira_placa: string;
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
    return { error: "Falha de conexao" };
  }
}

function formatDateTime(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function RecebimentoHistoricoPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/recebimento/list", { credentials: "include", cache: "no-store" });
        const data = await safeJson(res);
        if (!alive) return;
        if (!res.ok) throw new Error(data?.error || "Falha ao carregar historico");
        setRows(data.rows || []);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar historico");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="grid" style={{ gap: 24, padding: "16px 0 40px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 320px" }}>
          <h1 className="h1">Historico de Formularios</h1>
          <p className="sub" style={{ marginTop: 4 }}>
            Abra, continue preenchendo e reimprima formularios salvos automaticamente.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/recebimento">
            <Button variant="primary">Novo formulario</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">{"<-"} Home</Button>
          </Link>
        </div>
      </div>

      {loading ? <Card>Carregando historico...</Card> : null}
      {error ? <Card style={{ color: "var(--danger)" }}>{error}</Card> : null}

      {!loading && !error && rows.length === 0 ? (
        <Card>Nenhum formulario salvo ainda.</Card>
      ) : null}

      <div className="gridCards">
        {rows.map((row) => (
          <Card key={row.id} style={{ display: "grid", gap: 12 }}>
            <div className="row">
              <div>
                <div className="cardKicker">FOR-OP-TRA-013</div>
                <div className="cardTitle">{row.data_documento || "Sem data"}</div>
              </div>
              <Pill>{row.total_preenchidas}/{row.total_linhas} linhas</Pill>
            </div>

            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              Equipe: <b style={{ color: "var(--text)" }}>{row.equipe_responsavel || "-"}</b>
            </div>
            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              Assinatura: <b style={{ color: "var(--text)" }}>{row.signature_name || "-"}</b>
            </div>
            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              Primeira NF / Placa: <b style={{ color: "var(--text)" }}>{row.primeira_nf || "-"} / {row.primeira_placa || "-"}</b>
            </div>
            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              Criado: <b style={{ color: "var(--text)" }}>{formatDateTime(row.created_at)}</b>
            </div>
            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              Ultimo autosave: <b style={{ color: "var(--text)" }}>{formatDateTime(row.updated_at)}</b>
            </div>

            <Link href={`/recebimento?id=${encodeURIComponent(row.id)}`}>
              <Button variant="ghost" style={{ width: "100%" }}>Abrir e reimprimir</Button>
            </Link>
          </Card>
        ))}
      </div>
    </main>
  );
}
