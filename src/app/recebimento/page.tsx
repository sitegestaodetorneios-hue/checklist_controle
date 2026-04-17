"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/ui";
import type { RecebimentoFormRecord, RecebimentoRow } from "@/lib/recebimentoTypes";
import styles from "./page.module.css";

type MeResponse = {
  ok?: boolean;
  user?: {
    id?: string;
    username?: string;
    nome?: string;
    role?: string;
  };
};

const TOTAL_ROWS = 24;

const COLUMN_WIDTHS = [
  4.8,
  6.2,
  6.5,
  6.8,
  7.0,
  11.8,
  7.8,
  5.8,
  4.9,
  4.6,
  5.0,
  5.0,
  5.0,
];

function createRow(index: number): RecebimentoRow {
  return {
    id: `row-${index}`,
    operacao: "",
    horarioChegada: "",
    nf: "",
    placa: "",
    conferente: "",
    cliente: "",
    quantidadeVolumes: "",
    peso: "",
    filial: "",
    doca: "",
    horaInicio: "",
    horaTermino: "",
  };
}

function createDefaultRows() {
  return Array.from({ length: TOTAL_ROWS }, (_, index) => createRow(index + 1));
}

function todayValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

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

function RecebimentoPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("id") || "";

  const [formId, setFormId] = useState(requestedId);
  const [rows, setRows] = useState<RecebimentoRow[]>(createDefaultRows);
  const [equipeResponsavel, setEquipeResponsavel] = useState("");
  const [dataDocumento, setDataDocumento] = useState("");
  const [loadingPrint, setLoadingPrint] = useState(false);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savingMessage, setSavingMessage] = useState("Novo formulario");
  const [loadingForm, setLoadingForm] = useState(true);
  const [printStamp, setPrintStamp] = useState<Date | null>(null);
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [savedForm, setSavedForm] = useState<RecebimentoFormRecord | null>(null);
  const autosaveReady = useRef(false);

  useEffect(() => {
    if (requestedId) {
      setFormId((current) => current || requestedId);
      return;
    }

    setFormId((current) => current || crypto.randomUUID());
    setDataDocumento((current) => current || todayValue());
  }, [requestedId]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        const data = (await safeJson(res)) as MeResponse;
        if (!alive || !res.ok) return;

        setMe(data.user || null);

        const nome = data.user?.nome || data.user?.username || "";
        setEquipeResponsavel((current) => current || nome);
      } catch {
        if (alive) setMe(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    if (!requestedId) {
      setDataDocumento((current) => current || todayValue());
      setLoadingForm(false);
      autosaveReady.current = true;
      return;
    }

    setLoadingForm(true);
    autosaveReady.current = false;

    (async () => {
      try {
        const res = await fetch(`/api/recebimento/form?id=${encodeURIComponent(requestedId)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await safeJson(res);
        if (!alive) return;
        if (!res.ok) throw new Error(data?.error || "Falha ao abrir formulario");

        const form = data.form as RecebimentoFormRecord;
        setFormId(form.id);
        setSavedForm(form);
        setEquipeResponsavel(form.equipe_responsavel || "");
        setDataDocumento(form.data_documento || todayValue());
        setRows(
          Array.from({ length: TOTAL_ROWS }, (_, index) => {
            const incoming = form.rows[index];
            return incoming ? { ...createRow(index + 1), ...incoming } : createRow(index + 1);
          })
        );
        setSavingState("saved");
        setSavingMessage(`Formulario salvo em ${formatDateTime(form.updated_at)}`);
      } catch (err) {
        if (!alive) return;
        setSavingState("error");
        setSavingMessage(err instanceof Error ? err.message : "Erro ao abrir formulario");
      } finally {
        if (alive) {
          setLoadingForm(false);
          autosaveReady.current = true;
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [requestedId, searchParams]);

  useEffect(() => {
    if (!autosaveReady.current || loadingForm) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setSavingState("saving");
        setSavingMessage("Salvando automaticamente...");

        const res = await fetch("/api/recebimento/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            id: formId,
            equipeResponsavel,
            dataDocumento,
            rows,
          }),
          signal: controller.signal,
        });

        const data = await safeJson(res);
        if (!res.ok) throw new Error(data?.error || "Falha ao salvar formulario");

        const form = data.form as RecebimentoFormRecord;
        setFormId(form.id);
        setSavedForm(form);
        setSavingState("saved");
        setSavingMessage(`Autosave em ${formatDateTime(form.updated_at)}`);

        if (!searchParams.get("id")) {
          router.replace(`/recebimento?id=${encodeURIComponent(form.id)}`);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setSavingState("error");
        setSavingMessage(err instanceof Error ? err.message : "Erro ao salvar");
      }
    }, 900);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [dataDocumento, equipeResponsavel, formId, loadingForm, router, rows, searchParams]);

  const assinaturaNome = useMemo(() => {
    return savedForm?.signature_name || me?.nome || me?.username || equipeResponsavel || "Usuario responsavel";
  }, [equipeResponsavel, me?.nome, me?.username, savedForm?.signature_name]);

  const assinaturaLogin = useMemo(() => {
    return savedForm?.created_by_username || me?.username || "nao identificado";
  }, [me?.username, savedForm?.created_by_username]);

  const assinaturaData = useMemo(() => {
    return savedForm?.signed_at || "";
  }, [savedForm?.signed_at]);

  function updateRow(id: string, field: keyof RecebimentoRow, value: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  async function handlePrint() {
    const stamp = new Date();
    setLoadingPrint(true);
    setPrintStamp(stamp);

    await new Promise((resolve) => window.setTimeout(resolve, 80));
    window.print();
    setLoadingPrint(false);
  }

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <div style={{ flex: "1 1 320px" }}>
          <h1 className="h1">FOR-OP-TRA-013</h1>
          <p className="sub" style={{ marginTop: 4 }}>
            Formulario identico ao modelo, com autosave, historico e reimpressao com a mesma assinatura eletronica.
          </p>
        </div>

        <div className={styles.toolbarActions}>
          <Link href="/recebimento/historico">
            <Button variant="ghost">Historico</Button>
          </Link>
          <Button variant="primary" onClick={handlePrint} disabled={loadingPrint || loadingForm}>
            {loadingPrint ? "Preparando..." : "Imprimir formulario"}
          </Button>
          <Link href="/">
            <Button variant="ghost">{"<-"} Home</Button>
          </Link>
        </div>
      </div>

      <div className={styles.metaInfo}>
        <span className="pill">ID: <b>{formId.slice(0, 8)}</b></span>
        <span className="pill">Status: <b>{savingState === "saving" ? "Salvando" : savingState === "error" ? "Erro" : "Salvo"}</b></span>
        <span className="pill">{savingMessage}</span>
      </div>

      <section className={styles.paper}>
        <table className={styles.sheetTable}>
          <colgroup>
            {COLUMN_WIDTHS.map((width, index) => (
              <col key={index} style={{ width: `${(width / COLUMN_WIDTHS.reduce((sum, item) => sum + item, 0)) * 100}%` }} />
            ))}
          </colgroup>

          <tbody>
            <tr className={styles.rowTitle}>
              <td colSpan={2} className={styles.logoCell}>
                <div className={styles.logoStack}>
                  <Image
                    src="/brand/logo_ativa-logistica_Q3f1Fa.png"
                    alt="Ativa Logistica"
                    width={82}
                    height={15}
                    className={`${styles.logoImage} ${styles.logoAtiva}`}
                    priority
                    unoptimized
                  />
                  <Image
                    src="/brand/TRANS-MODEL.webp"
                    alt="Trans Model"
                    width={56}
                    height={15}
                    className={`${styles.logoImage} ${styles.logoTrans}`}
                    priority
                    unoptimized
                  />
                </div>
              </td>
              <td colSpan={9} className={styles.titleCell}>
                Relatorio de Descarregamento/ Recebimento
              </td>
              <td colSpan={2} className={styles.codeCell}>
                FOR-OP-TRA-013
              </td>
            </tr>

            <tr className={styles.rowMeta}>
              <td colSpan={2} className={styles.labelMeta}>Equipe Responsavel :</td>
              <td colSpan={8} className={styles.valueMeta}>
                <input
                  className={styles.headerInput}
                  value={equipeResponsavel}
                  onChange={(event) => setEquipeResponsavel(event.target.value)}
                  placeholder="Recebimento, Transferencia, Distribuicao - 08 as 18 / 13 as 23 / 18 as 03 / 19 as 04 / 23 as 08"
                />
              </td>
              <td className={styles.labelDate}>Data:</td>
              <td colSpan={2} className={styles.valueMeta}>
                <input className={styles.headerInput} type="date" value={dataDocumento} onChange={(event) => setDataDocumento(event.target.value)} />
              </td>
            </tr>

            <tr className={styles.headerRow}>
              <th>OPERACAO</th>
              <th>HORARIO DE CHEGADA</th>
              <th>NF</th>
              <th>PLACA</th>
              <th>CONFERENTE</th>
              <th colSpan={2}>CLIENTE</th>
              <th>QUANTIDADE DE VOLUMES</th>
              <th>PESO</th>
              <th>FILIAL</th>
              <th>DOCA</th>
              <th>HORA INICIO</th>
              <th>HORA TERMINO</th>
            </tr>

            {rows.map((row) => (
              <tr key={row.id} className={styles.dataRow}>
                <td><input className={styles.cellInput} value={row.operacao} onChange={(event) => updateRow(row.id, "operacao", event.target.value)} /></td>
                <td><input className={styles.cellInput} type="time" value={row.horarioChegada} onChange={(event) => updateRow(row.id, "horarioChegada", event.target.value)} /></td>
                <td><input className={styles.cellInput} value={row.nf} onChange={(event) => updateRow(row.id, "nf", event.target.value)} /></td>
                <td><input className={styles.cellInput} value={row.placa} onChange={(event) => updateRow(row.id, "placa", event.target.value.toUpperCase())} /></td>
                <td><input className={styles.cellInput} value={row.conferente} onChange={(event) => updateRow(row.id, "conferente", event.target.value)} /></td>
                <td colSpan={2}><input className={styles.cellInput} value={row.cliente} onChange={(event) => updateRow(row.id, "cliente", event.target.value)} /></td>
                <td><input className={styles.cellInput} inputMode="numeric" value={row.quantidadeVolumes} onChange={(event) => updateRow(row.id, "quantidadeVolumes", event.target.value.replace(/[^\d]/g, ""))} /></td>
                <td><input className={styles.cellInput} value={row.peso} onChange={(event) => updateRow(row.id, "peso", event.target.value.replace(/[^\d,.-]/g, ""))} /></td>
                <td><input className={styles.cellInput} value={row.filial} onChange={(event) => updateRow(row.id, "filial", event.target.value)} /></td>
                <td><input className={styles.cellInput} value={row.doca} onChange={(event) => updateRow(row.id, "doca", event.target.value)} /></td>
                <td><input className={styles.cellInput} type="time" value={row.horaInicio} onChange={(event) => updateRow(row.id, "horaInicio", event.target.value)} /></td>
                <td><input className={styles.cellInput} type="time" value={row.horaTermino} onChange={(event) => updateRow(row.id, "horaTermino", event.target.value)} /></td>
              </tr>
            ))}

            <tr className={styles.footerHead}>
              <td colSpan={2}>Identificacao</td>
              <td colSpan={2}>Versao/Data/Revisor</td>
              <td>Doc. Referencia</td>
              <td>Armazenamento</td>
              <td colSpan={2}>Protecao/Acesso</td>
              <td>Recuperacao</td>
              <td>Tempo de{"\n"}Retencao</td>
              <td colSpan={3}>Descarte</td>
            </tr>

            <tr className={styles.footerBody}>
              <td colSpan={2}>FOR-OP-TRA-013</td>
              <td colSpan={2}>05 - 08/02/2023 -{"\n"}Giovanna SRG</td>
              <td>POP-OP-TRA-001</td>
              <td>Arquivo Eletronico</td>
              <td colSpan={2}>Pasta Especifica Area Recebimento</td>
              <td>Por Data</td>
              <td>06 meses</td>
              <td colSpan={3}>Lixo</td>
            </tr>
          </tbody>
        </table>

        <div className={styles.signatureStamp}>
          <div className={styles.signatureTitle}>Assinatura eletronica</div>
          <div className={styles.signatureName}>{assinaturaNome}</div>
          <div className={styles.signatureMeta}>
            Assinada em {assinaturaData ? formatDateTime(assinaturaData) : "-"}
          </div>
          <div className={styles.signatureMeta}>Login: {assinaturaLogin}</div>
          <div className={styles.signatureMeta}>
            {printStamp ? `Reimpressao em ${formatDateTime(printStamp)}` : `Formulario ${formatDate(dataDocumento) || "sem data"}`}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function RecebimentoPage() {
  return (
    <Suspense fallback={<main className={styles.page}><div className="card">Carregando formulario...</div></main>}>
      <RecebimentoPageInner />
    </Suspense>
  );
}
