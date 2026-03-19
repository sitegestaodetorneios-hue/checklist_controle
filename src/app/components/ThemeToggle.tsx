"use client";

import { useEffect, useState } from "react";
import styles from "../page.module.css";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Ao carregar, verifica se o usuário já salvou uma preferência ou usa o padrão do sistema
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

  return (
    <button onClick={toggleTheme} className={styles.themeToggleBtn} aria-label="Alternar tema">
      {isDark ? "☀️ Modo Claro" : "🌙 Modo Escuro"}
    </button>
  );
}