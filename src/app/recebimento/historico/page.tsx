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
  is_empty_draft: boolean;
  is_complete: boolean;
  finalized_at: string | null;
  finalized_reason: "manual" | "auto_inactive" | null;
  last_reopened_at: string | null;
  last_reopened_by_username: string;
  last_reopened_by_nome: string;
  status_label: string;
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

function getStatusTone(row: HistoryRow) {
  if (row.finalized_at) {
    return {
      background: "rgba(22, 163, 74, 0.12)",
      border: "1px solid rgba(22, 163, 74, 0.28)",
      color: "#166534",
    };
  }

  if (row.total_preenchidas === 0) {
    return {
      background: "var(--warnBg)",
      border: "1px solid var(--warnBorder)",
      color: "var(--warnText)",
    };
  }

  if (row.is_complete) {
    return {
      background: "rgba(14, 165, 233, 0.12)",
      border: "1px solid rgba(14, 165, 233, 0.24)",
      color: "#0c4a6e",
    };
  }

  return {
    background: "rgba(2, 132, 199, 0.12)",
    border: "1px solid rgba(2, 132, 199, 0.24)",
    color: "#0c4a6e",
  };
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
          <Card
            key={row.id}
            style={{
              display: "grid",
              gap: 14,
              padding: 18,
              borderRadius: 22,
              boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
            }}
          >
            <div className="row" style={{ alignItems: "flex-start" }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div className="cardKicker">FOR-OP-TRA-013</div>
                <div className="cardTitle">{row.data_documento || "Sem data"}</div>
              </div>
              <Pill
                style={{
                  fontWeight: 800,
                  padding: "8px 12px",
                  minWidth: 88,
                  justifyContent: "center",
                }}
              >
                {row.total_preenchidas}/{row.total_linhas}
                <span style={{ opacity: 0.7, fontWeight: 600 }}>linhas</span>
              </Pill>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                width: "fit-content",
                borderRadius: 999,
                padding: "7px 12px",
                fontSize: 13,
                fontWeight: 800,
                ...getStatusTone(row),
              }}
            >
              {row.status_label}
            </div>

            <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.35 }}>
              Equipe: <b style={{ color: "var(--text)" }}>{row.equipe_responsavel || "-"}</b>
            </div>
            <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.35 }}>
              Assinatura: <b style={{ color: "var(--text)" }}>{row.signature_name || "-"}</b>
            </div>
            <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.35 }}>
              Primeira NF / Placa: <b style={{ color: "var(--text)" }}>{row.primeira_nf || "-"} / {row.primeira_placa || "-"}</b>
            </div>
            <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.35 }}>
              Criado: <b style={{ color: "var(--text)" }}>{formatDateTime(row.created_at)}</b>
            </div>
            <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.35 }}>
              Ultimo autosave: <b style={{ color: "var(--text)" }}>{formatDateTime(row.updated_at)}</b>
            </div>
            {row.last_reopened_at ? (
              <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.35 }}>
                Reaberto por: <b style={{ color: "var(--text)" }}>{row.last_reopened_by_nome || row.last_reopened_by_username || "-"}</b>
                {" em "}
                <b style={{ color: "var(--text)" }}>{formatDateTime(row.last_reopened_at)}</b>
              </div>
            ) : null}

            <Link href={`/recebimento?id=${encodeURIComponent(row.id)}`}>
              <Button
                variant="ghost"
                style={{
                  width: "100%",
                  borderRadius: 18,
                  paddingTop: 14,
                  paddingBottom: 14,
                  fontSize: 15,
                }}
              >
                {row.finalized_at
                  ? "Reimprimir formulario concluido"
                  : row.total_preenchidas === 0
                    ? "Abrir e continuar"
                    : row.is_complete
                      ? "Abrir e concluir"
                      : "Abrir e continuar"}
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </main>
  );
}
