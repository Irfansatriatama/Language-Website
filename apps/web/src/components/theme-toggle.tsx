"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = document.documentElement.getAttribute("data-theme") === "dark";
    setDark(t);
  }, []);

  const toggle = () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("lingora_data_theme", next);
    setDark(next === "dark");
  };

  if (!mounted) {
    return (
      <button type="button" className="theme-toggle-btn" title="Toggle tema">
        ☀️
      </button>
    );
  }

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={toggle}
      title={dark ? "Terangkan" : "Mode gelap"}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
