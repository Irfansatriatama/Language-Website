"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";

import { authClient } from "@/lib/auth-client";
import { STUDY_LANGUAGES, type StudyLanguageCode } from "@/lib/study-languages";
import { ThemeToggle } from "@/components/theme-toggle";
import { StudyLanguagePicker } from "@/components/study-language-picker";

const jpMods = [
  { href: "/learn/ja/hiragana", icon: "あ", label: "Hiragana" },
  { href: "/learn/ja/katakana", icon: "ア", label: "Katakana" },
  { href: "/learn/ja/kanji", icon: "漢", label: "Kanji" },
  { href: "/learn/ja/vocabulary", icon: "📖", label: "Kosakata JP" },
  { href: "/learn/ja/grammar", icon: "📝", label: "Grammar JP" },
  { href: "/learn/ja/dialog", icon: "💬", label: "Dialog JP" },
];

const zhMods = [
  { href: "/learn/zh/pinyin", icon: "拼", label: "Pinyin" },
  { href: "/learn/zh/tones", icon: "🎵", label: "Nada (Tones)" },
  { href: "/learn/zh/hanzi", icon: "汉", label: "Hanzi" },
  { href: "/learn/zh/vocabulary", icon: "📖", label: "Kosakata ZH" },
  { href: "/learn/zh/dialog", icon: "💬", label: "Dialog ZH" },
];

const koMods = [
  { href: "/learn/ko/hangul", icon: "한", label: "Hangul" },
  { href: "/learn/ko/vocabulary", icon: "📖", label: "Kosakata KR" },
  { href: "/learn/ko/grammar", icon: "📝", label: "Grammar KR" },
  { href: "/learn/ko/dialog", icon: "💬", label: "Dialog KR" },
];

function navModsForStudyLanguage(code: StudyLanguageCode) {
  if (code === "ja") return jpMods;
  if (code === "zh") return zhMods;
  if (code === "ko") return koMods;
  const tag = code.toUpperCase();
  return [
    { href: `/learn/${code}/starter-vocabulary`, icon: "📘", label: "Kosakata & tense" },
    { href: `/learn/${code}/vocabulary`, icon: "📖", label: `Kosakata ${tag}` },
    { href: `/learn/${code}/grammar`, icon: "📝", label: `Grammar ${tag}` },
    { href: `/learn/${code}/dialog`, icon: "💬", label: `Dialog ${tag}` },
  ];
}

export type ShellUser = {
  name: string;
  email: string;
  avatarChar: string;
  preferredStudyLanguageCode: string | null;
};

type Props = PropsWithChildren<{
  user: ShellUser;
  topbarAccessory?: ReactNode;
}>;

function useIsMobileNavBreakpoint() {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return narrow;
}

function titleFromPath(path: string): string {
  if (path.startsWith("/dashboard")) return "Dashboard";
  if (path.startsWith("/stats")) return "Statistik";
  if (path.startsWith("/learn")) return "Belajar";
  return "Lingora Next";
}

function NavLink({
  href,
  active,
  onNavigate,
  children,
}: PropsWithChildren<{ href: string; active?: boolean; onNavigate?: () => void }>) {
  return (
    <Link className={`nav-item${active ? " active" : ""}`} href={href} onClick={onNavigate}>
      {children}
    </Link>
  );
}

export function AppShell({ user, children, topbarAccessory }: Props) {
  const pathname = usePathname();
  const isMobileNav = useIsMobileNavBreakpoint();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  useEffect(() => {
    if (!isMobileNav) setDrawerOpen(false);
  }, [isMobileNav]);

  useEffect(() => {
    if (!drawerOpen || !isMobileNav) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, isMobileNav, closeDrawer]);

  useEffect(() => {
    if (!drawerOpen || !isMobileNav) return;
    const t = window.setTimeout(() => {
      const first = sidebarRef.current?.querySelector<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      first?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [drawerOpen, isMobileNav]);

  async function logout() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  const drawerActive = drawerOpen && isMobileNav;

  return (
    <div className="app-shell">
      <nav
        ref={sidebarRef}
        className={`sidebar${drawerActive ? " drawer-open" : ""}`}
        id="sidebar"
        aria-label="Menu samping"
        aria-hidden={isMobileNav ? !drawerOpen : undefined}
      >
        <div className="sidebar-logo">
          <div className="logo-main">Lingora Next</div>
          <div className="logo-sub">Jepang • Mandarin • Korea • Eropa</div>
        </div>

        <div className="sidebar-user">
          <div className="avatar-circle cjk">{user.avatarChar}</div>
          <div className="sidebar-user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-meta">{user.email}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Umum</div>
          <NavLink href="/dashboard" active={pathname === "/dashboard"} onNavigate={closeDrawer}>
            <span className="nav-icon">■</span>
            Dashboard
          </NavLink>
          <NavLink href="/stats" active={pathname.startsWith("/stats")} onNavigate={closeDrawer}>
            <span className="nav-icon">📊</span>
            Statistik
          </NavLink>

          {STUDY_LANGUAGES.map((langGroup) => {
            const mods = navModsForStudyLanguage(langGroup.code);
            return (
              <div key={langGroup.code}>
                <div className="nav-section-label">{langGroup.sectionTitle}</div>
                {mods.map((m) => (
                  <NavLink
                    key={m.href}
                    href={m.href}
                    active={pathname.startsWith(m.href)}
                    onNavigate={closeDrawer}
                  >
                    <span className={`nav-icon${m.icon.length <= 2 ? " cjk" : ""}`}>{m.icon}</span>
                    {m.label}
                  </NavLink>
                ))}
              </div>
            );
          })}

          <div className="nav-section-label">Latihan</div>
          <NavLink
            href="/learn/ja/hiragana/quiz"
            active={pathname.includes("/learn/ja") && pathname.includes("/quiz")}
            onNavigate={closeDrawer}
          >
            <span className="nav-icon">★</span>
            Quiz Jepang
          </NavLink>
          <NavLink href="/learn/zh/pinyin" active={pathname.startsWith("/learn/zh/pinyin")} onNavigate={closeDrawer}>
            <span className="nav-icon">★</span>
            Quiz Mandarin
          </NavLink>
          <NavLink href="/learn/ko/hangul" active={pathname.startsWith("/learn/ko/hangul")} onNavigate={closeDrawer}>
            <span className="nav-icon">★</span>
            Quiz Korea
          </NavLink>

          <div className="nav-section-label">Akun</div>
          <button type="button" className="nav-item" aria-label="Keluar dari akun" onClick={() => void logout()}>
            <span className="nav-icon">🚪</span>
            Keluar
          </button>
        </nav>
      </nav>

      <div
        role="presentation"
        className={`drawer-overlay${drawerActive ? " open" : ""}`}
        id="drawer-overlay"
        onClick={closeDrawer}
        aria-hidden={!drawerActive}
      />

      <div className="main-content" {...(drawerActive ? { inert: true } : {})}>
        <header className="topbar">
          <span className="topbar-title">{titleFromPath(pathname)}</span>
          <StudyLanguagePicker
            preferredStudyLanguageCode={user.preferredStudyLanguageCode}
            variant="topbar"
          />
          <ThemeToggle />
          <div className="topbar-actions">{topbarAccessory}</div>
        </header>

        <header className="mobile-topbar">
          <button
            type="button"
            className="hamburger"
            onClick={openDrawer}
            aria-label="Buka menu navigasi"
            aria-expanded={drawerActive}
            aria-controls="sidebar"
          >
            <span />
            <span />
            <span />
          </button>
          <span className="logo-main">Lingora Next</span>
          <StudyLanguagePicker
            preferredStudyLanguageCode={user.preferredStudyLanguageCode}
            variant="drawer"
          />
          <ThemeToggle />
        </header>

        {children}

        <nav className="bottom-nav" aria-label="Navigasi mobile">
          <div className="bottom-nav-inner">
            <Link
              href="/dashboard"
              className={`bottom-nav-item${pathname === "/dashboard" ? " active" : ""}`}
              onClick={closeDrawer}
            >
              <span className="bnav-icon">■</span>
              <span>Dashboard</span>
            </Link>
            <Link
              href="/learn/ja"
              className={`bottom-nav-item${pathname.startsWith("/learn/ja") ? " active" : ""}`}
              onClick={closeDrawer}
            >
              <span className="bnav-icon cjk">あ</span>
              <span>Jepang</span>
            </Link>
            <Link
              href="/learn/zh"
              className={`bottom-nav-item${pathname.startsWith("/learn/zh") ? " active" : ""}`}
              onClick={closeDrawer}
            >
              <span className="bnav-icon cjk">拼</span>
              <span>Mandarin</span>
            </Link>
            <Link
              href="/learn/ko"
              className={`bottom-nav-item${pathname.startsWith("/learn/ko") ? " active" : ""}`}
              onClick={closeDrawer}
            >
              <span className="bnav-icon cjk">한</span>
              <span>Korea</span>
            </Link>
            <Link href="/dashboard" className="bottom-nav-item" onClick={closeDrawer}>
              <span className="bnav-icon">👤</span>
              <span>Profil</span>
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
