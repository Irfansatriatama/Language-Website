"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";

type Props = {
  callbackUrl?: string;
};

export function RegisterForm({ callbackUrl = "/dashboard" }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const { error } = await authClient.signUp.email({
      name,
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
        <div className="form-heading">Daftar</div>
        <div className="form-sub">Buat akun penyimpan progres lintas bahasa target.</div>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      <form onSubmit={(e) => void onSubmit(e)}>
        <div className="form-group">
          <label className="form-label" htmlFor="name">
            Nama tampilan
          </label>
          <input
            className="form-control"
            id="name"
            name="name"
            autoComplete="name"
            required
          />
        </div>

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
            Password (min 8 karakter)
          </label>
          <input
            className="form-control"
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={pending}>
          {pending ? "Membuat akun…" : "Buat akun"}
        </button>

        <div className="form-footer">
          Sudah punya akun? <Link href="/login">Masuk</Link>
        </div>
      </form>
    </div>
  );
}
