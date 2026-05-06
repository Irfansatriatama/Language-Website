import { RegisterForm } from "@/components/register-form";

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const raw = typeof searchParams?.callbackUrl === "string" ? searchParams.callbackUrl : "/dashboard";
  const callbackUrl = raw.startsWith("/") ? raw : "/dashboard";

  return (
    <div className="auth-page">
      <aside className="auth-panel">
        <span className="auth-panel-cjk c1">한</span>
        <span className="auth-panel-cjk c2">拼</span>
        <span className="auth-panel-cjk c3">学</span>
        <div className="auth-panel-content">
          <div className="auth-panel-logo">Mulai Hari Ini</div>
          <div className="auth-panel-tagline">Satu kemajuan tiap sesi pendek</div>
          <p className="auth-panel-sub">
            Akun baru otomatis tersimpan aman dengan Better Auth + sesi cookie httpOnly.
          </p>
        </div>
      </aside>

      <div className="auth-form-panel">
        <RegisterForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
