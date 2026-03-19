"use client";

import React, { forwardRef } from "react";
import Link from "next/link"; // ✅ Essencial para navegação rápida PWA

// ==========================================
// CONTAINERS & LINKS
// ==========================================

export const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => {
    return <div ref={ref} className={`card ${className}`.trim()} {...props} />;
  }
);
Card.displayName = "Card";

// ✅ Agora o CardLink entende navegação SPA/PWA do Next.js sem recarregar a tela
type CardLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export const CardLink = forwardRef<HTMLAnchorElement, CardLinkProps>(
  ({ className = "", href, children, ...props }, ref) => {
    // Se for link externo (ex: https://google.com), usa <a> normal
    const isExternal = href.startsWith("http");

    if (isExternal) {
      return (
        <a ref={ref} href={href} className={`card cardHover ${className}`.trim()} {...props}>
          {children}
        </a>
      );
    }

    // Se for rota interna do app, usa o Link otimizado do Next
    return (
      <Link ref={ref} href={href} className={`card cardHover ${className}`.trim()} {...props}>
        {children}
      </Link>
    );
  }
);
CardLink.displayName = "CardLink";


// ==========================================
// BOTÕES E TAGS
// ==========================================

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: "default" | "primary" | "ghost" | "danger" 
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", className = "", ...props }, ref) => {
    const v = variant === "primary" ? "btnPrimary" 
            : variant === "ghost" ? "btnGhost" 
            : variant === "danger" ? "btnDanger" 
            : "";
    return <button ref={ref} className={`btn ${v} ${className}`.trim()} {...props} />;
  }
);
Button.displayName = "Button";

export const Pill = forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className = "", ...props }, ref) => {
    return <span ref={ref} className={`pill ${className}`.trim()} {...props} />;
  }
);
Pill.displayName = "Pill";

export const Badge = forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className = "", ...props }, ref) => {
    return <span ref={ref} className={`badge ${className}`.trim()} {...props} />;
  }
);
Badge.displayName = "Badge";


// ==========================================
// FORMULÁRIOS
// ==========================================

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => {
    return <input ref={ref} className={`input ${className}`.trim()} {...props} />;
  }
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => {
    return <textarea ref={ref} className={`textarea ${className}`.trim()} {...props} />;
  }
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", ...props }, ref) => {
    return <select ref={ref} className={`select ${className}`.trim()} {...props} />;
  }
);
Select.displayName = "Select";

// ✅ Field atualizado: Usando <label> para aumentar a área de toque no celular
export function Field({ 
  label, 
  children, 
  hint, 
  htmlFor // Adicionado htmlFor para ligar o texto ao input
}: { 
  label: string; 
  children: React.ReactNode; 
  hint?: string;
  htmlFor?: string;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={htmlFor}>
        <b style={{ color: "var(--text)" }}>{label}</b>
        {hint && <div style={{ marginTop: 3, color: "var(--muted2)", fontSize: 12 }}>{hint}</div>}
      </label>
      {children}
    </div>
  );
}