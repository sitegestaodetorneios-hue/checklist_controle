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
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Checklist Operacional</h1>
            <p className={styles.subtitle}>
              Experiencia PWA focada em velocidade: <b>turno</b>, <b>saida</b>, <b>retorno</b> e <b>recebimento</b>.
            </p>
          </div>
        </div>

        <div className={styles.actionBar}>
          <div className={styles.userGroup}>
            <Link href="/turno/historico" className={styles.textLink}>
              Ver checklists
            </Link>
            <Link href="/historico" className={styles.textLink}>
              Pendencias
            </Link>
            <Link href="/recebimento" className={styles.textLink}>
              Formulario recebimento
            </Link>
            <Link href="/recebimento/historico" className={styles.textLink}>
              Historico recebimento
            </Link>

            {user && (
              <Link href="/perfil" className={styles.noDecor}>
                <Pill className={styles.pillAction}>{user.nome || user.username || "Perfil"}</Pill>
              </Link>
            )}

            {isAdmin && (
              <Link href="/admin/users" className={styles.noDecor}>
                <Pill className={styles.pillWarn}>Admin</Pill>
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className={styles.grid}>
        <CardLink href="/turno" className={styles.card}>
          <div className={styles.cardImg}>
            <Image
              src="/illustrations/shift.svg"
              alt="Inicio de Turno"
              fill
              style={{ objectFit: "cover" }}
              sizes="(max-width: 768px) 100vw, 33vw"
              priority
            />
          </div>
          <div className={styles.cardContent}>
            <span className={styles.kicker}>PASSO 1 - INICIO DE TURNO</span>
            <h2 className={styles.cardTitle}>Fazer Checklist</h2>
            <p className={styles.cardDesc}>Coletores, paleteiras e itens configurados</p>
          </div>
        </CardLink>

        <CardLink href="/carros/saida" className={styles.card}>
          <div className={styles.cardImg}>
            <Image
              src="/illustrations/truck.svg"
              alt="Saida do Carro"
              fill
              style={{ objectFit: "cover" }}
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
          <div className={styles.cardContent}>
            <span className={styles.kicker}>PASSO 2 - CARRO</span>
            <h2 className={styles.cardTitle}>Registrar Saida</h2>
            <p className={styles.cardDesc}>Paletes, paleteira e stretch/tubete</p>
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
            <span className={styles.kicker}>PASSO 3 - RETORNO</span>
            <h2 className={styles.cardTitle}>Pendencias e Fechamento</h2>
            <p className={styles.cardDesc}>Confirma devolucoes e registra retorno</p>
          </div>
        </CardLink>

        <CardLink href="/recebimento" className={styles.card}>
          <div className={styles.cardImg}>
            <Image
              src="/illustrations/truck.svg"
              alt="Formulario de recebimento"
              fill
              style={{ objectFit: "cover" }}
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
          <div className={styles.cardContent}>
            <span className={styles.kicker}>FORMULARIO OPERACIONAL</span>
            <h2 className={styles.cardTitle}>Descarregamento / Recebimento</h2>
            <p className={styles.cardDesc}>Planilha digital pronta para impressao com assinatura eletronica</p>
          </div>
        </CardLink>

        <CardLink href="/recebimento/historico" className={styles.card}>
          <div className={styles.cardImg}>
            <Image
              src="/illustrations/return.svg"
              alt="Historico de recebimento"
              fill
              style={{ objectFit: "cover" }}
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
          <div className={styles.cardContent}>
            <span className={styles.kicker}>HISTORICO OPERACIONAL</span>
            <h2 className={styles.cardTitle}>Formularios salvos</h2>
            <p className={styles.cardDesc}>Reabra, continue preenchendo e reimprima com a mesma assinatura</p>
          </div>
        </CardLink>
      </section>

      <footer className={styles.footer}>
        <div className={styles.flowSection}>
          <span className={styles.kicker}>RESUMO DO FLUXO</span>
          <div className={styles.flowPills}>
            <Pill className={styles.pillFlow}>1) Turno</Pill>
            <Pill className={styles.pillFlow}>2) Saida</Pill>
            <Pill className={styles.pillFlow}>3) Retorno</Pill>
            <Pill className={styles.pillWarn}>4) Recebimento</Pill>
          </div>
        </div>
        <div className={styles.footerActions}>
          <Link href="/turno" className={styles.btnPrimary}>Abrir turno -&gt;</Link>
          <Link href="/recebimento" className={styles.btnSecondary}>Novo formulario -&gt;</Link>
        </div>
      </footer>
    </main>
  );
}
