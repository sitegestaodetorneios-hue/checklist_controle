"use client";

import { useEffect, useState } from "react";

async function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export default function PushRegister() {
  const [status, setStatus] = useState<string>("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          setStatus("Seu navegador não suporta push");
          return;
        }
        const reg = await navigator.serviceWorker.register("/sw.js");
        const existing = await reg.pushManager.getSubscription();
        if (existing) setStatus("Notificações ativas ✅");
        setReady(true);
      } catch {
        setStatus("Falha ao preparar notificações");
      }
    })();
  }, []);

  async function enable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) throw new Error("Service Worker não registrado");

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus("Notificações desativadas");
        return;
      }

      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setStatus("Notificações ativas ✅");
        return;
      }

      const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
      if (!vapidPublic) throw new Error("Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY");

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: await urlBase64ToUint8Array(vapidPublic),
      });

      const r = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(sub),
      });

      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || "Falha ao registrar push");
      }

      setStatus("Notificações ativas ✅");
    } catch (e: any) {
      setStatus(e?.message || "Erro ao ativar notificações");
    } finally {
      setLoading(false);
    }
  }

  if (!ready && !status) return null;

  const enabled = status.includes("ativas");

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
      {!enabled ? (
        <button className="btn btnPrimary" onClick={enable} disabled={loading} style={{ padding: "8px 12px" }}>
          {loading ? "Ativando…" : "Ativar notificações"}
        </button>
      ) : null}
      {status ? <div style={{ opacity: 0.85, fontSize: 12 }}>{status}</div> : null}
    </div>
  );
}
