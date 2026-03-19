import Link from "next/link";
import Image from "next/image";
import { CardLink, Pill } from "./components/ui";
import { getCurrentUser } from "@/lib/currentUser";
import styles from "./page.module.css";

export default async function Home() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin_unit" || user?.role === "admin_global";

  return (
    <main className={styles.container}>
      {/* HEADER PROFISSIONAL */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Checklist Operacional</h1>
            <p className={styles.subtitle}>
              Experiência PWA focada em velocidade: <b>turno</b>, <b>saída</b>, <b>retorno</b>.
            </p>
          </div>
        </div>

        {/* BARRA DE AÇÕES (Somente Links Úteis para a Operação) */}
        <div className={styles.actionBar}>
          <div className={styles.userGroup}>
            <Link href="/turno/historico" className={styles.textLink}>
              📚 Ver checklists
            </Link>
            <Link href="/historico" className={styles.textLink}>
              📚 Pendências
            </Link>
            
            {user && (
              <Link href="/perfil" className={styles.noDecor}>
                <Pill className={styles.pillAction}>
                  👤 {user.nome || user.username || "Perfil"}
                </Pill>
              </Link>
            )}
            
            {isAdmin && (
              <Link href="/admin/users" className={styles.noDecor}>
                <Pill className={styles.pillWarn}>⚙️ Admin</Pill>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* GRID DE OPERAÇÃO - ALVOS DE TOQUE GRANDES */}
      <section className={styles.grid}>
        <CardLink href="/turno" className={styles.card}>
          <div className={styles.cardImg}>
            {/* O atributo 'sizes' é obrigatório para performance no Next.js Image com 'fill' */}
            <Image 
              src="/illustrations/shift.svg" 
              alt="Início de Turno" 
              fill 
              style={{ objectFit: "cover" }} 
              sizes="(max-width: 768px) 100vw, 33vw"
              priority 
            />
          </div>
          <div className={styles.cardContent}>
            <span className={styles.kicker}>PASSO 1 • INÍCIO DE TURNO</span>
            <h2 className={styles.cardTitle}>Fazer Checklist</h2>
            <p className={styles.cardDesc}>Coletores • paleteiras • itens configurados</p>
          </div>
        </CardLink>

        <CardLink href="/carros/saida" className={styles.card}>
          <div className={styles.cardImg}>
            <Image 
              src="/illustrations/truck.svg" 
              alt="Saída do Carro" 
              fill 
              style={{ objectFit: "cover" }} 
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
          <div className={styles.cardContent}>
            <span className={styles.kicker}>PASSO 2 • CARRO</span>
            <h2 className={styles.cardTitle}>Registrar Saída</h2>
            <p className={styles.cardDesc}>Paletes • paleteira • stretch/tubete</p>
          </div>
        </CardLink>

        <CardLink href="/pendencias" className={styles.card}>
          <div className={styles.cardImg}>
            <Image 
              src="/illustrations/return.svg" 
              alt="Retorno" 
              fill 
              style={{ objectFit: "cover" }} 
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
          <div className={styles.cardContent}>
            <span className={styles.kicker}>PASSO 3 • RETORNO</span>
            <h2 className={styles.cardTitle}>Pendências e Fechamento</h2>
            <p className={styles.cardDesc}>Confirma devoluções • registra retorno</p>
          </div>
        </CardLink>
      </section>

      {/* FOOTER DE RESUMO */}
      <footer className={styles.footer}>
        <div className={styles.flowSection}>
          <span className={styles.kicker}>RESUMO DO FLUXO</span>
          <div className={styles.flowPills}>
            <Pill className={styles.pillFlow}>1) Turno</Pill>
            <Pill className={styles.pillFlow}>2) Saída</Pill>
            <Pill className={styles.pillFlow}>3) Retorno</Pill>
            <Pill className={styles.pillWarn}>4) Pendências</Pill>
          </div>
        </div>
        <div className={styles.footerActions}>
          <Link href="/turno" className={styles.btnPrimary}>Abrir turno →</Link>
          <Link href="/carros/saida" className={styles.btnSecondary}>Nova saída →</Link>
        </div>
      </footer>
    </main>
  );
}