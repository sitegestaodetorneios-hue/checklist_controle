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
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // create form
  const [newUsername, setNewUsername] = useState("");
  const [newNome, setNewNome] = useState("");
  const [newSenha, setNewSenha] = useState("");
  const [newTurno, setNewTurno] = useState<"08:00" | "13:00" | "23:00">("08:00");
  const [creating, setCreating] = useState(false);

  // reset password feedback
  const [tempPass, setTempPass] = useState<{ username: string; temp: string } | null>(null);

  async function load() {
    setLoading(true);
    setMsg("");
    setTempPass(null);
    try {
      const r = await fetch("/api/admin/users/list", { credentials: "include", cache: "no-store" });
      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error || "Falha ao carregar");
      setRows(d.rows || []);
    } catch (e: any) {
      setMsg(e?.message || "Erro");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function savePrefs(u: U) {
    setMsg("");
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
      setMsg(`✅ Salvo: ${u.username}`);
    } catch (e: any) {
      setMsg(e?.message || "Erro");
    }
  }

  async function toggleAtivo(u: U, ativo: boolean) {
    setMsg("");
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
      setMsg(`✅ ${ativo ? "Ativado" : "Desativado"}: ${u.username}`);
    } catch (e: any) {
      setMsg(e?.message || "Erro");
    }
  }

  async function resetPassword(u: U) {
    setMsg("");
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
      setMsg(`✅ Senha resetada: ${u.username}`);
    } catch (e: any) {
      setMsg(e?.message || "Erro");
    }
  }

  async function createUser() {
    setCreating(true);
    setMsg("");
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

      setMsg(`✅ Usuário criado: ${d.user.username}`);
      setNewUsername("");
      setNewNome("");
      setNewSenha("");
      setNewTurno("08:00");
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Erro");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activeCount = useMemo(() => rows.filter((r) => r.ativo).length, [rows]);

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 6 }}>Admin • Usuários</h1>
          <div style={{ opacity: 0.85 }}>
            Crie usuários, defina turno e configure quem recebe notificação. Ativos: <b>{activeCount}</b> / {rows.length}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={load} disabled={loading}>
            {loading ? "…" : "🔄 Atualizar"}
          </Button>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Button variant="ghost">Home</Button>
          </Link>
        </div>
      </div>

      {msg ? (
        <Card style={{ marginTop: 12, padding: 12 }}>
          <div style={{ opacity: 0.95 }}>{msg}</div>
          {tempPass ? (
            <div style={{ marginTop: 8 }}>
              <Pill className="pillWarn">Senha temporária</Pill>
              <div style={{ marginTop: 6, fontSize: 14 }}>
                <b>{tempPass.username}</b>: <span style={{ userSelect: "all" }}>{tempPass.temp}</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                Copie e repasse ao usuário. (Depois ele pode trocar se você implementar “alterar senha”.)
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* Criar usuário */}
      <Card style={{ marginTop: 12, padding: 14 }}>
        <div className="cardKicker">Cadastro</div>
        <div className="cardTitle">Adicionar usuário</div>
        <div className="divider" />

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <Field label="Usuário (login)" hint="Ex: joao.silva">
            <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="usuario" />
          </Field>
          <Field label="Nome" hint="Ex: João Silva">
            <Input value={newNome} onChange={(e) => setNewNome(e.target.value)} placeholder="Nome completo" />
          </Field>
          <Field label="Senha inicial" hint="Admin define a primeira senha">
            <Input value={newSenha} onChange={(e) => setNewSenha(e.target.value)} placeholder="****" type="password" />
          </Field>
          <Field label="Turno do usuário" hint="Usado no alerta 30 min após início">
            <Select value={newTurno} onChange={(e) => setNewTurno(e.target.value as any)}>
              <option value="08:00">08:00</option>
              <option value="13:00">13:00</option>
              <option value="23:00">23:00</option>
            </Select>
          </Field>
        </div>

        <div style={{ marginTop: 12 }}>
          <Button variant="primary" onClick={createUser} disabled={creating || !newUsername.trim() || !newSenha.trim()}>
            {creating ? "Criando…" : "➕ Criar usuário"}
          </Button>
        </div>
      </Card>

      {/* Lista */}
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {rows.map((u) => (
          <Card key={u.id} style={{ padding: 14, opacity: u.ativo ? 1 : 0.65 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 16 }}>
                    <b>{u.username}</b>{u.nome ? <span style={{ opacity: 0.85 }}> • {u.nome}</span> : null}
                  </div>
                  <Pill>{u.role}</Pill>
                  {!u.ativo ? <Pill className="pillWarn">INATIVO</Pill> : null}
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <Field label="Turno">
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

                  <label style={chk}>
                    <input
                      type="checkbox"
                      checked={u.prefs.notify_enabled}
                      onChange={(e) => setRows((prev) => prev.map((x) => (x.id === u.id ? { ...x, prefs: { ...x.prefs, notify_enabled: e.target.checked } } : x)))}
                    />
                    Notificações
                  </label>

                  <label style={chk}>
                    <input
                      type="checkbox"
                      checked={u.prefs.notify_checklist}
                      onChange={(e) => setRows((prev) => prev.map((x) => (x.id === u.id ? { ...x, prefs: { ...x.prefs, notify_checklist: e.target.checked } } : x)))}
                    />
                    Checklist
                  </label>

                  <label style={chk}>
                    <input
                      type="checkbox"
                      checked={u.prefs.notify_pendencias}
                      onChange={(e) => setRows((prev) => prev.map((x) => (x.id === u.id ? { ...x, prefs: { ...x.prefs, notify_pendencias: e.target.checked } } : x)))}
                    />
                    Pendências
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Button variant="primary" onClick={() => savePrefs(u)}>💾 Salvar</Button>

                <Button variant="ghost" onClick={() => resetPassword(u)}>
                  🔑 Resetar senha
                </Button>

                {u.ativo ? (
                  <Button variant="danger" onClick={() => toggleAtivo(u, false)}>
                    ⛔ Desativar
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => toggleAtivo(u, true)}>
                    ✅ Ativar
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}

const chk: React.CSSProperties = { display: "flex", gap: 6, alignItems: "center", opacity: 0.9 };
