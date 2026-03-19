"use client";

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

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "error" | "success" | "" }>({ text: "", type: "" });

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: "", type: "" });

    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, senha }),
      });

      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha no login");

      setMsg({ text: "✅ Login realizado! Redirecionando...", type: "success" });
      
      // window.location.href força o recarregamento total da página, 
      // o que é excelente para limpar o cache do PWA e atualizar o usuário.
      window.location.href = "/";
    } catch (err: any) {
      setMsg({ text: `❌ ${err?.message || "Usuário ou senha incorretos."}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      padding: 16,
      background: "var(--bg1)" // Fundo levemente contrastante para destacar o Card
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        
        {/* CABEÇALHO DO LOGIN */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ 
            width: 64, height: 64, margin: "0 auto 16px", 
            background: "var(--surface)", borderRadius: 16, 
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid var(--border)", boxShadow: "var(--shadow)",
            fontSize: 32
          }}>
            🔐
          </div>
          <h1 className="h1" style={{ fontSize: "1.75rem" }}>Acesso Operacional</h1>
          <p className="sub" style={{ marginTop: 8 }}>Checklist de Turno e Frota</p>
        </div>

        {/* FORMULÁRIO */}
        <Card style={{ padding: 24, boxShadow: "var(--shadow)" }}>
          <form onSubmit={entrar} className="grid" style={{ gap: 16 }}>
            
            <Field label="Usuário" htmlFor="username">
              <Input 
                id="username"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Ex: joao.silva" 
                required
                autoCapitalize="none" // Evita que o celular coloque a primeira letra maiúscula
                autoComplete="username"
              />
            </Field>

            <Field label="Senha" htmlFor="password">
              <Input 
                id="password"
                type="password" 
                value={senha} 
                onChange={(e) => setSenha(e.target.value)} 
                placeholder="••••••••" 
                required
                autoComplete="current-password"
              />
            </Field>

            {/* BANNER DE MENSAGEM */}
            {msg.text && (
              <div style={{
                padding: 12, borderRadius: 8, marginTop: 4,
                background: msg.type === "success" ? "var(--glass-bg)" : "var(--dangerBg)", 
                color: msg.type === "success" ? "var(--accent)" : "var(--danger)",
                border: `1px solid ${msg.type === "success" ? "var(--accent)" : "var(--danger)"}`,
                fontWeight: 600, textAlign: "center", fontSize: "0.9rem"
              }}>
                {msg.text}
              </div>
            )}

            <Button 
              type="submit" 
              variant="primary" 
              disabled={loading} 
              style={{ minHeight: 48, fontSize: "1.05rem", marginTop: 8 }}
            >
              {loading ? "Autenticando..." : "Entrar no Sistema →"}
            </Button>
            
          </form>
        </Card>
        
        <div style={{ textAlign: "center", marginTop: 24, fontSize: "0.85rem", color: "var(--muted2)" }}>
          Precisa de ajuda? Fale com o administrador do pátio.
        </div>

      </div>
    </main>
  );
}