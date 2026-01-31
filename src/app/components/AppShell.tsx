"use client";

import Link from "next/link";
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
              {/* Logo (se existir) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/ativa.png" alt="" style={{ width: 26, height: 26, objectFit: "contain" }} />
            </div>
            <div>
              <div className="brandTitle">Checklist</div>
              <div className="brandSubtitle">Turno • Saída • Retorno</div>
            </div>
          </div>

          <div className="topActions">
            <div style={{ minWidth: 220 }}>
              <PushRegister />
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>{me?.user?.nome || me?.user?.username || ""}</div>
              {isAdmin ? <div style={{ fontSize: 12, color: "var(--muted2)" }}>Admin</div> : null}
            </div>
            <Button variant="ghost" onClick={logout} aria-label="Sair">
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
      <span style={{ display: "inline-flex", opacity: active ? 1 : 0.9 }}>{icon}</span>
      <span className="navLabel">{label}</span>
    </Link>
  );
}
