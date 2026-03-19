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
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" | "" }>({ text: "", type: "" });

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); // Impede o reload da página pelo <form>
    setMsg({ text: "", type: "" });

    if (!current.trim()) return setMsg({ text: "❌ Informe a senha atual.", type: "error" });
    if (!next.trim() || next.trim().length < 6) return setMsg({ text: "❌ A nova senha deve ter no mínimo 6 caracteres.", type: "error" });
    if (next !== confirm) return setMsg({ text: "❌ As senhas não conferem.", type: "error" });
    if (next === current) return setMsg({ text: "❌ A nova senha não pode ser igual à senha atual.", type: "error" });

    setLoading(true);
    try {
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ current_password: current, new_password: next }),
      });

      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha ao alterar senha");

      setMsg({ text: "✅ Senha alterada com sucesso!", type: "success" });
      setCurrent("");
      setNext("");
      setConfirm("");
      
      // Limpa a mensagem de sucesso após 4 segundos para a tela ficar limpa
      setTimeout(() => setMsg({ text: "", type: "" }), 4000);
      
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
          <h1 className="h1">Perfil e Segurança</h1>
          <p className="sub" style={{ marginTop: 4 }}>Atualize sua senha de acesso ao sistema.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/">
            <Button variant="ghost">← Home</Button>
          </Link>
        </div>
      </div>

      {/* FORMULÁRIO DE SENHA */}
      <Card style={{ padding: 24 }}>
        <div className="cardKicker">Segurança</div>
        <div className="cardTitle">Alterar Senha</div>
        <div className="divider" style={{ margin: "16px 0" }} />

        {/* Usando <form> para capturar o "Enter" do teclado mobile */}
        <form onSubmit={salvar} className="grid" style={{ gap: 16 }}>
          
          <Field label="Senha Atual" htmlFor="current_pw">
            <Input 
              id="current_pw"
              type="password" 
              value={current} 
              onChange={(e) => setCurrent(e.target.value)} 
              placeholder="••••••••" 
              required
            />
          </Field>

          <Field label="Nova Senha" hint="No mínimo 6 caracteres" htmlFor="new_pw">
            <Input 
              id="new_pw"
              type="password" 
              value={next} 
              onChange={(e) => setNext(e.target.value)} 
              placeholder="••••••••" 
              required
              minLength={6}
            />
          </Field>

          <Field label="Confirmar Nova Senha" htmlFor="confirm_pw">
            <Input 
              id="confirm_pw"
              type="password" 
              value={confirm} 
              onChange={(e) => setConfirm(e.target.value)} 
              placeholder="••••••••" 
              required
              minLength={6}
            />
          </Field>

          {/* BANNER DE MENSAGEM */}
          {msg.text && (
            <div style={{
              padding: 12, borderRadius: 8, marginTop: 8,
              background: msg.type === "success" ? "var(--glass-bg)" : "var(--dangerBg)", 
              color: msg.type === "success" ? "var(--accent)" : "var(--danger)",
              border: `1px solid ${msg.type === "success" ? "var(--accent)" : "var(--danger)"}`,
              fontWeight: 600
            }}>
              {msg.text}
            </div>
          )}

          {/* AÇÕES */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 8 }}>
            <Button type="submit" variant="primary" disabled={loading} style={{ minWidth: 180 }}>
              {loading ? "Salvando…" : "💾 Salvar Nova Senha"}
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}