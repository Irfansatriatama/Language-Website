import { LoginForm } from "@/components/login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const raw = typeof searchParams?.callbackUrl === "string" ? searchParams.callbackUrl : "/dashboard";
  const callbackUrl = raw.startsWith("/") ? raw : "/dashboard";

  return (
    <div className="auth-page">
      <aside className="auth-panel">
        <span className="auth-panel-cjk c1">日</span>
        <span className="auth-panel-cjk c2">語</span>
        <span className="auth-panel-cjk c3">学</span>
        <div className="auth-panel-content">
          <div className="auth-panel-logo">Lingora Next</div>
          <div className="auth-panel-tagline">Belajar lintas aksara · Server-first</div>
          <p className="auth-panel-sub">
            Foundation stack: Next.js 14 · Prisma Postgres · Better Auth · UI shell seperti referensi Lingora.
          </p>
        </div>
      </aside>

      <div className="auth-form-panel">
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
