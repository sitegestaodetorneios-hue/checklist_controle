import Link from "next/link";
import { CardLink, Pill } from "./components/ui";
import { getCurrentUser } from "@/lib/currentUser";

export default async function Home() {
  const user = await getCurrentUser(); // ✅ server-side (cookies)
  const isAdmin = user?.role === "admin_unit" || user?.role === "admin_global";

  return (
    <main className="grid" style={{ paddingTop: 12 }}>
      <section className="card" style={{ padding: 16 }}>
        <div className="row">
          <div>
            <h1 className="h1">✅ Checklist Operacional</h1>
            <div className="sub">
              Experiência PWA focada em velocidade e zero erros: <b>turno</b>, <b>saída</b>, <b>retorno</b>.
            </div>
          </div>

          {/* ✅ LINKS (condicionais por login/role) */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
            {user ? (
              <>
                <Link href="/perfil" style={{ textDecoration: "none" }}>
                  <Pill>👤 Perfil</Pill>
                </Link>
                <Link href="/historico">📚 Pendencias Devoluções →</Link>
                <Link href="/turno/historico">📚 Ver checklists</Link>

                {isAdmin ? (
                  <Link href="/admin/users" style={{ textDecoration: "none" }}>
                    <Pill className="pillWarn">⚙️ Admin Users</Pill>
                  </Link>
                ) : null}
              </>
            ) : (
              <Link href="/login" style={{ textDecoration: "none" }}>
                <Pill className="pillWarn">🔐 Login</Pill>
              </Link>
            )}

            <Pill>🇧🇷 Horário SP</Pill>
            <Pill>🔔 Push</Pill>
            <Pill>📶 Funciona com sinal ruim</Pill>
          </div>
        </div>
      </section>

      <section className="gridCards">
        <CardLink href="/turno" style={{ display: "block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/shift.svg"
            alt=""
            style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}
          />
          <div style={{ marginTop: 12 }}>
            <div className="cardKicker">Início de turno</div>
            <div className="cardTitle">Fazer checklist</div>
            <div className="cardDesc">Coletores • paleteiras • itens extras configurados pelo admin</div>
          </div>
        </CardLink>

        <CardLink href="/carros/saida" style={{ display: "block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/truck.svg"
            alt=""
            style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}
          />
          <div style={{ marginTop: 12 }}>
            <div className="cardKicker">Carro</div>
            <div className="cardTitle">Registrar saída</div>
            <div className="cardDesc">Paletes carregados/vazios • paleteira • stretch/tubete</div>
          </div>
        </CardLink>

        <CardLink href="/pendencias" style={{ display: "block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/return.svg"
            alt=""
            style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}
          />
          <div style={{ marginTop: 12 }}>
            <div className="cardKicker">Retorno</div>
            <div className="cardTitle">Pendências e fechamento</div>
            <div className="cardDesc">Confirma devoluções • registra retorno • fecha carregamento</div>
          </div>
        </CardLink>
      </section>

      <section className="card" style={{ padding: 16 }}>
        <div className="row">
          <div>
            <div className="cardKicker">Fluxo</div>
            <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Pill>1) Turno</Pill>
              <Pill>2) Saída</Pill>
              <Pill>3) Retorno</Pill>
              <Pill className="pillWarn">4) Pendências</Pill>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link href="/turno">Abrir turno →</Link>
            <Link href="/carros/saida">Nova saída →</Link>

            {user ? <Link href="/perfil">Perfil →</Link> : <Link href="/login">Login →</Link>}

            {isAdmin ? <Link href="/admin/users">Admin Users →</Link> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
