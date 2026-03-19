import { Suspense } from "react";
import Link from "next/link";
import RetornoClient from "./RetornoClient";
import { Button } from "../../components/ui";

export default function RetornoPage() {
  return (
    <main className="grid" style={{ gap: 24, padding: "16px 0 40px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 300px" }}>
          <h1 className="h1">↩️ Retorno do Veículo</h1>
          <p className="sub" style={{ marginTop: 4 }}>
            Informe paletes, stretch e confirme devoluções para fechar o carregamento.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/pendencias">
            <Button variant="ghost">← Pendências</Button>
          </Link>
        </div>
      </div>

      <Suspense fallback={
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>
          Carregando dados do retorno...
        </div>
      }>
        <RetornoClient />
      </Suspense>
    </main>
  );
}