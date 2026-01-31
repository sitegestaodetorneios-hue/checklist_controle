"use client";

import React from "react";

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...props} />;
}

export function CardLink({ className = "", ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={`card cardHover ${className}`} {...props} />;
}

export function Button({ variant = "default", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "ghost" | "danger" }) {
  const v = variant === "primary" ? "btnPrimary" : variant === "ghost" ? "btnGhost" : variant === "danger" ? "btnDanger" : "";
  return <button className={`btn ${v} ${className}`} {...props} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className || ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`textarea ${props.className || ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`select ${props.className || ""}`} />;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="field">
      <div className="label">
        <b style={{ color: "var(--text)" }}>{label}</b>
        {hint ? <div style={{ marginTop: 3, color: "var(--muted2)", fontSize: 12 }}>{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function Pill({ className = "", ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={`pill ${className}`} {...props} />;
}

export function Badge({ className = "", ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={`badge ${className}`} {...props} />;
}
