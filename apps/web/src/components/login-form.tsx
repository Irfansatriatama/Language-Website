"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";

type Props = {
  callbackUrl?: string;
};

export function LoginForm({ callbackUrl = "/dashboard" }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const { error } = await authClient.signIn.email({
      email,
      password,
      callbackURL: callbackUrl,
    });

    if (error?.message) {
      setError(error.message);
      setPending(false);
      return;
    }

    router.push(callbackUrl.startsWith("/") ? callbackUrl : "/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-form-box">
      <Link href="/" className="auth-mobile-logo">
        <div className="auth-mobile-logo-mark cjk">学</div>
        <span className="auth-mobile-logo-text">Lingora Next</span>
      </Link>

      <div className="auth-heading-area">
        <div className="form-heading">Masuk</div>
        <div className="form-sub">
          Langsung lanjut belajar Hiragana, Hanzi, Hangul — satu akun untuk semua bahasa target.
        </div>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      <form onSubmit={(e) => void onSubmit(e)}>
        <div className="form-group">
          <label className="form-label" htmlFor="email">
            Email
          </label>
          <input
            className="form-control"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">
            Password
          </label>
          <input
            className="form-control"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
          />
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={pending}>
          {pending ? "Memproses…" : "Masuk"}
        </button>

        <div className="form-footer">
          Belum punya akun? <Link href="/register">Buat sekarang</Link>
        </div>
      </form>
    </div>
  );
}
