"use client";

import Link from "next/link";
// Removi o import do Image do next/image, já que voltamos para a tag <img> nativa.
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PushRegister from "./PushRegister";
import { IconAlert, IconCheck, IconHome, IconTruck, IconUserCog } from "./icons";
import { Button } from "./ui";

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

type Me = {
  ok?: boolean;
  user?: { username?: string; nome?: string; role?: string };
};

// ✅ Componente de Troca de Tema corrigido (Regras dos Hooks aplicadas)
function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // O useEffect DEVE vir antes de qualquer 'return' condicional
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("app-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme ? "dark" : "light");
    localStorage.setItem("app-theme", newTheme ? "dark" : "light");
  };

  // ✅ O return de segurança (hidratação) só pode acontecer AQUI, depois de todos os hooks
  if (!mounted) return <div style={{ width: 36, height: 36 }} />; 

  return (
    <button 
      onClick={toggleTheme} 
      aria-label="Alternar tema"
      style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        color: "var(--text)",
        width: 36,
        height: 36,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: "16px"
      }}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname?.startsWith("/login");

  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (isLogin) return;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        const d = (await safeJson(r)) as Me;
        if (r.ok) setMe(d);
      } catch {
        setMe(null);
      }
    })();
  }, [isLogin]);

  const isAdmin = useMemo(() => {
    const role = me?.user?.role || "";
    return role === "admin_unit" || role === "admin_global";
  }, [me]);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      router.push("/login");
    }
  }

  if (isLogin) return <>{children}</>;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbarInner">
          <div className="brand">
            <div className="brandLogo" aria-hidden>
              {/* ✅ Tag img nativa restaurada corretamente */}
              <img 
                src="/brand/ativa.png" 
                alt="Logo Ativa" 
                style={{ width: 26, height: 26, objectFit: "contain" }} 
              />
            </div>
            <div>
              <div className="brandTitle">Checklist</div>
              <div className="brandSubtitle">Turno • Saída • Retorno</div>
            </div>
          </div>

          <div className="topActions">
            <ThemeToggle />

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <PushRegister />
            </div>

            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
                {me?.user?.nome || me?.user?.username || ""}
              </div>
              {isAdmin && <div style={{ fontSize: 11, color: "var(--accent)" }}>Admin</div>}
            </div>

            <Button variant="ghost" onClick={logout} aria-label="Sair" style={{ padding: "8px" }}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container">{children}</div>

      <nav className="bottomNav" aria-label="Navegação">
        <div className="bottomNavInner">
          <NavLink href="/" label="Home" active={pathname === "/"} icon={<IconHome />} />
          <NavLink href="/turno" label="Turno" active={pathname?.startsWith("/turno")} icon={<IconCheck />} />
          <NavLink href="/carros/saida" label="Saída" active={pathname?.startsWith("/carros/saida")} icon={<IconTruck />} />
          <NavLink href="/pendencias" label="Pendências" active={pathname?.startsWith("/pendencias")} icon={<IconAlert />} />
          {isAdmin ? <NavLink href="/admin/users" label="Admin" active={pathname?.startsWith("/admin")} icon={<IconUserCog />} /> : null}
        </div>
      </nav>
    </div>
  );
}

function NavLink({ href, label, active, icon }: { href: string; label: string; active?: boolean; icon: React.ReactNode }) {
  return (
    <Link href={href} className={`navItem ${active ? "navItemActive" : ""}`}>
      <span style={{ display: "inline-flex", opacity: active ? 1 : 0.6, transform: active ? "scale(1.1)" : "scale(1)", transition: "0.2s" }}>
        {icon}
      </span>
      <span className="navLabel" style={{ fontWeight: active ? 700 : 500 }}>{label}</span>
    </Link>
  );
}