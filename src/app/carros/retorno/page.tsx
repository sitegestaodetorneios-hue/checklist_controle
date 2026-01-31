import { Suspense } from "react";
import Link from "next/link";
import RetornoClient from "./RetornoClient";

export default function RetornoPage() {
  return (
    <main style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>↩️ Retorno</h1>
          <div style={{ opacity: 0.8, marginTop: 4 }}>
            Informe paletes, stretch e confirme devoluções para fechar o carregamento.
          </div>
        </div>
        <Link href="/pendencias" style={{ color: "#8ab4ff" }}>
          ⬅ Pendências
        </Link>
      </div>

      <Suspense
        fallback={
          <section
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 14,
              padding: 14,
              marginTop: 14,
              opacity: 0.85,
            }}
          >
            Carregando retorno…
          </section>
        }
      >
        <RetornoClient />
      </Suspense>
    </main>
  );
}
