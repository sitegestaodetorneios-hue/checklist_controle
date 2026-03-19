"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Field, Input, Pill, Select } from "@/app/components/ui";

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

type U = {
  id: string;
  username: string;
  nome?: string | null;
  role: string;
  ativo: boolean;
  prefs: {
    turno_default: "08:00" | "13:00" | "23:00";
    notify_enabled: boolean;
    notify_checklist: boolean;
    notify_pendencias: boolean;
  };
};

export default function AdminUsersPage() {
  const [rows, setRows] = useState<U[]>([]);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" | "info" | "" }>({ text: "", type: "" });
  const [loading, setLoading] = useState(true);

  // create form
  const [newUsername, setNewUsername] = useState("");
  const [newNome, setNewNome] = useState("");
  const [newSenha, setNewSenha] = useState("");
  const [newTurno, setNewTurno] = useState<"08:00" | "13:00" | "23:00">("08:00");
  const [creating, setCreating] = useState(false);

  // reset password feedback
  const [tempPass, setTempPass] = useState<{ username: string; temp: string } | null>(null);

  function showMessage(text: string, type: "success" | "error" | "info") {
    setMsg({ text, type });
    if (type === "success") {
      setTimeout(() => setMsg({ text: "", type: "" }), 5000);
    }
  }

  async function load() {
    setLoading(true);
    setMsg({ text: "", type: "" });
    setTempPass(null);
    try {
      const r = await fetch("/api/admin/users/list", { credentials: "include", cache: "no-store" });
      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha ao carregar");
      setRows(d.rows || []);
    } catch (e: any) {
      showMessage(e?.message || "Erro ao carregar", "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function savePrefs(u: U) {
    setTempPass(null);
    try {
      const r = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: u.id,
          turno_default: u.prefs.turno_default,
          notify_enabled: u.prefs.notify_enabled,
          notify_checklist: u.prefs.notify_checklist,
          notify_pendencias: u.prefs.notify_pendencias,
        }),
      });
      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha ao salvar");
      showMessage(`✅ Preferências salvas: ${u.username}`, "success");
    } catch (e: any) {
      showMessage(e?.message || "Erro", "error");
    }
  }

  async function toggleAtivo(u: U, ativo: boolean) {
    setTempPass(null);
    try {
      const r = await fetch("/api/admin/users/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user_id: u.id, ativo }),
      });
      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha ao atualizar");

      setRows((prev) => prev.map((x) => (x.id === u.id ? { ...x, ativo } : x)));
      showMessage(`✅ Usuário ${ativo ? "Ativado" : "Desativado"}: ${u.username}`, "success");
    } catch (e: any) {
      showMessage(e?.message || "Erro", "error");
    }
  }

  async function resetPassword(u: U) {
    setTempPass(null);
    try {
      const r = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user_id: u.id }),
      });
      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha ao resetar senha");

      setTempPass({ username: d.username, temp: d.temp_password });
      showMessage(`✅ Senha resetada para: ${u.username}`, "success");
    } catch (e: any) {
      showMessage(e?.message || "Erro", "error");
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setTempPass(null);
    try {
      const r = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: newUsername,
          nome: newNome,
          senha: newSenha,
          turno_default: newTurno,
          role: "operador",
        }),
      });
      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha ao criar usuário");

      showMessage(`✅ Usuário criado: ${d.user.username}`, "success");
      setNewUsername("");
      setNewNome("");
      setNewSenha("");
      setNewTurno("08:00");
      await load();
    } catch (e: any) {
      showMessage(e?.message || "Erro", "error");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCount = useMemo(() => rows.filter((r) => r.ativo).length, [rows]);

  return (
    <main className="grid" style={{ gap: 24, padding: "16px 0 40px" }}>
      
      {/* CABEÇALHO */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 300px" }}>
          <h1 className="h1">⚙️ Administração de Usuários</h1>
          <p className="sub" style={{ marginTop: 4 }}>
            Crie usuários, defina turnos e configure alertas. Ativos: <b>{activeCount}</b> / {rows.length}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={() => load()} disabled={loading}>
            {loading ? "Atualizando…" : "🔄 Atualizar"}
          </Button>
          <Link href="/">
            <Button variant="ghost">← Home</Button>
          </Link>
        </div>
      </div>

      {/* FEEDBACK GLOBAL E SENHA TEMPORÁRIA */}
      {msg.text && (
        <Card style={{ 
          padding: 16, 
          background: msg.type === "success" ? "var(--glass-bg)" : "var(--dangerBg)", 
          borderColor: msg.type === "success" ? "var(--accent)" : "var(--danger)" 
        }}>
          <div style={{ color: msg.type === "success" ? "var(--accent)" : "var(--danger)", fontWeight: 700 }}>
            {msg.text}
          </div>
          
          {tempPass && (
            <div style={{ marginTop: 16, padding: 12, background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--warnBorder)" }}>
              <Pill className="pillWarn" style={{ marginBottom: 8 }}>⚠️ Senha Temporária Gerada</Pill>
              <div style={{ fontSize: "1.1rem", color: "var(--text)" }}>
                Usuário: <b>{tempPass.username}</b> <br/>
                Senha: <b style={{ userSelect: "all", color: "var(--accent)", fontSize: "1.2rem", padding: "4px 8px", background: "var(--surface2)", borderRadius: 6 }}>{tempPass.temp}</b>
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 8 }}>
                Copie a senha acima e envie ao operador. (Ele poderá alterar no próprio Perfil depois).
              </div>
            </div>
          )}
        </Card>
      )}

      {/* NOVO USUÁRIO */}
      <Card style={{ padding: 20 }}>
        <div className="cardKicker">Cadastro</div>
        <div className="cardTitle">Adicionar Novo Operador</div>
        <div className="divider" style={{ margin: "16px 0" }} />

        <form onSubmit={createUser} className="grid" style={{ gap: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <Field label="Usuário (Login)" hint="Ex: joao.silva" htmlFor="newUser">
              <Input id="newUser" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="usuario.login" autoCapitalize="none" required />
            </Field>
            
            <Field label="Nome Completo" hint="Para exibição" htmlFor="newName">
              <Input id="newName" value={newNome} onChange={(e) => setNewNome(e.target.value)} placeholder="João da Silva" required />
            </Field>
            
            <Field label="Senha Inicial" hint="Definida pelo Admin" htmlFor="newPass">
              <Input id="newPass" value={newSenha} onChange={(e) => setNewSenha(e.target.value)} placeholder="••••" type="password" required />
            </Field>
            
            <Field label="Turno Padrão" hint="Usado para o Checklist">
              <Select value={newTurno} onChange={(e) => setNewTurno(e.target.value as any)}>
                <option value="08:00">08:00 (Manhã)</option>
                <option value="13:00">13:00 (Tarde)</option>
                <option value="23:00">23:00 (Noite)</option>
              </Select>
            </Field>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <Button type="submit" variant="primary" disabled={creating} style={{ minWidth: 200 }}>
              {creating ? "Criando…" : "➕ Criar Usuário"}
            </Button>
          </div>
        </form>
      </Card>

      {/* LISTA DE USUÁRIOS */}
      <div className="grid" style={{ gap: 16 }}>
        {rows.map((u) => (
          <Card key={u.id} style={{ padding: 20, opacity: u.ativo ? 1 : 0.75, border: !u.ativo ? "1px dashed var(--border)" : undefined }}>
            
            {/* Linha 1: Identificação */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontSize: "1.2rem", color: "var(--text)" }}>
                    <b>{u.username}</b> {u.nome && <span style={{ opacity: 0.7, fontWeight: 400 }}>• {u.nome}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Pill>{u.role === "admin_unit" ? "⚙️ Admin" : "👤 Operador"}</Pill>
                  {!u.ativo ? <Pill className="pillWarn">⛔ INATIVO</Pill> : <Pill style={{ background: "#dcfce7", color: "#166534", border: "none" }}>✅ ATIVO</Pill>}
                </div>
              </div>

              {/* Ações Rápidas */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button variant="ghost" onClick={() => resetPassword(u)}>🔑 Resetar Senha</Button>
                {u.ativo ? (
                  <Button variant="danger" onClick={() => toggleAtivo(u, false)}>⛔ Desativar</Button>
                ) : (
                  <Button variant="primary" onClick={() => toggleAtivo(u, true)}>✅ Ativar</Button>
                )}
              </div>
            </div>

            <div className="divider" style={{ margin: "16px 0" }} />

            {/* Linha 2: Configurações do Usuário */}
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
              
              <Field label="Turno Base do Operador">
                <Select
                  value={u.prefs.turno_default}
                  onChange={(e) => {
                    const v = e.target.value as any;
                    setRows((prev) => prev.map((x) => (x.id === u.id ? { ...x, prefs: { ...x.prefs, turno_default: v } } : x)));
                  }}
                >
                  <option value="08:00">08:00</option>
                  <option value="13:00">13:00</option>
                  <option value="23:00">23:00</option>
                </Select>
              </Field>

              {/* Toggles de Notificação */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Notificações Push</div>
                
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => setRows((prev) => prev.map((x) => (x.id === u.id ? { ...x, prefs: { ...x.prefs, notify_enabled: !x.prefs.notify_enabled } } : x)))}
                    style={{ padding: "6px 12px", borderRadius: "8px", fontWeight: 600, border: "none", cursor: "pointer", fontSize: "0.85rem", transition: "0.2s", background: u.prefs.notify_enabled ? "var(--accent)" : "var(--glass-bg)", color: u.prefs.notify_enabled ? "#fff" : "var(--muted)" }}
                  >
                    Geral {u.prefs.notify_enabled ? "ON" : "OFF"}
                  </button>
                  
                  <button
                    onClick={() => setRows((prev) => prev.map((x) => (x.id === u.id ? { ...x, prefs: { ...x.prefs, notify_checklist: !x.prefs.notify_checklist } } : x)))}
                    style={{ padding: "6px 12px", borderRadius: "8px", fontWeight: 600, border: "none", cursor: "pointer", fontSize: "0.85rem", transition: "0.2s", background: u.prefs.notify_checklist ? "var(--accent)" : "var(--glass-bg)", color: u.prefs.notify_checklist ? "#fff" : "var(--muted)" }}
                    disabled={!u.prefs.notify_enabled}
                  >
                    Checklist {u.prefs.notify_checklist ? "ON" : "OFF"}
                  </button>

                  <button
                    onClick={() => setRows((prev) => prev.map((x) => (x.id === u.id ? { ...x, prefs: { ...x.prefs, notify_pendencias: !x.prefs.notify_pendencias } } : x)))}
                    style={{ padding: "6px 12px", borderRadius: "8px", fontWeight: 600, border: "none", cursor: "pointer", fontSize: "0.85rem", transition: "0.2s", background: u.prefs.notify_pendencias ? "var(--accent)" : "var(--glass-bg)", color: u.prefs.notify_pendencias ? "#fff" : "var(--muted)" }}
                    disabled={!u.prefs.notify_enabled}
                  >
                    Pendências {u.prefs.notify_pendencias ? "ON" : "OFF"}
                  </button>
                </div>
              </div>

              {/* Ação de Salvar Prefs */}
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
                <Button variant="ghost" onClick={() => savePrefs(u)} style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                💾 Salvar Configurações
                </Button>
              </div>

            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}