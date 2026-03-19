"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui";

// Converte a chave VAPID pública para o formato exigido pelo PushManager
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export default function PushRegister() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // 1. Verifica se o navegador/celular suporta Web Push (Esconde no iOS antigo, por exemplo)
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return; 
    }
    
    setIsSupported(true);

    // 2. Verifica silenciosamente se já está inscrito para não incomodar o usuário
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setIsSubscribed(true);
      });
    }).catch(() => {
      console.warn("Service Worker não está ativo para Push.");
    });
  }, []);

  async function enable() {
    setLoading(true);
    setMsg("");
    
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) throw new Error("Service Worker não encontrado.");

      // Pede permissão nativa ao usuário (Aparece o modal do Chrome/Safari)
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        throw new Error("Permissão negada pelo usuário.");
      }

      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setIsSubscribed(true);
        return;
      }

      const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
      if (!vapidPublic) throw new Error("Chave VAPID não configurada no sistema.");

      // Gera a inscrição no navegador
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublic),
      });

      // Salva no seu banco de dados (Supabase/API)
      const r = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(sub),
      });

      if (!r.ok) {
        throw new Error("Falha ao registrar no servidor.");
      }

      setIsSubscribed(true);
    } catch (e: any) {
      setMsg(e?.message || "Erro ao ativar alertas.");
    } finally {
      setLoading(false);
    }
  }

  // Se o navegador não suportar, não renderiza nada (evita botões quebrados)
  if (!isSupported) return null;

  // Se já estiver inscrito, mostra um selo discreto e elegante na Topbar
  if (isSubscribed) {
    return (
      <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
        🔔 <span className="hide-mobile">Alertas Ativos</span>
      </span>
    );
  }

  // Se não estiver inscrito, mostra o botão chamativo
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Button 
        variant="primary" 
        onClick={enable} 
        disabled={loading} 
        style={{ 
          padding: "6px 12px", 
          minHeight: "auto", 
          fontSize: "0.85rem", 
          borderRadius: "20px", // Formato pílula mais elegante para a barra superior
          whiteSpace: "nowrap"
        }}
      >
        {loading ? "Ativando…" : "🔔 Ativar Alertas"}
      </Button>
      {msg && <span style={{ fontSize: "0.75rem", color: "var(--danger)", fontWeight: 600 }}>{msg}</span>}
    </div>
  );
}