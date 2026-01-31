"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, Field, Input } from "../components/ui";

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

export default function PerfilPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function salvar() {
    setMsg("");
    if (!current.trim()) return setMsg("Informe a senha atual.");
    if (!next.trim() || next.trim().length < 6) return setMsg("A nova senha deve ter no mínimo 6 caracteres.");
    if (next !== confirm) return setMsg("Confirmação não confere.");
    if (next === current) return setMsg("A nova senha não pode ser igual à senha atual.");

    setLoading(true);
    try {
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        credentials: "include",
        body: JSON.stringify({ current_password: current, new_password: next }),
      });

      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha ao alterar senha");

      setMsg("✅ Senha alterada com sucesso.");
      setCurrent("");
      setNext("");
      setConfirm("");
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
          <h1 className="h1">👤 Perfil</h1>
          <div className="sub">Atualize sua senha com segurança.</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/">Home</Link>
        </div>
      </div>

      <Card>
        <div className="cardKicker">Segurança</div>
        <div className="cardTitle">Alterar senha</div>
        <div className="divider" />

        <div className="grid" style={{ gap: 10 }}>
          <Field label="Senha atual">
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="••••••••" />
          </Field>

          <Field label="Nova senha" hint="Mínimo 6 caracteres">
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="••••••••" />
          </Field>

          <Field label="Confirmar nova senha">
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
          </Field>

          <div className="row" style={{ alignItems: "center", marginTop: 6 }}>
            <Button variant="primary" onClick={salvar} disabled={loading}>
              {loading ? "Salvando…" : "💾 Salvar nova senha"}
            </Button>
            {msg ? <span style={{ color: "var(--muted)", fontSize: 13 }}>{msg}</span> : null}
          </div>
        </div>
      </Card>
    </main>
  );
}
