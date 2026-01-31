"use client";

import { useState } from "react";

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

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, senha }),
      });

      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha no login");

      window.location.href = "/";
    } catch (e: any) {
      setMsg(e?.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Entrar</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>Checklist Turno • acesso por usuário</p>

      <form onSubmit={entrar} style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Usuário" style={inp} />
        <input value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha" type="password" style={inp} />

        <button disabled={loading} style={btn}>
          {loading ? "Entrando…" : "Entrar"}
        </button>

        {msg ? <div style={{ opacity: 0.9 }}>{msg}</div> : null}
      </form>
    </main>
  );
}

const inp: React.CSSProperties = {
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
