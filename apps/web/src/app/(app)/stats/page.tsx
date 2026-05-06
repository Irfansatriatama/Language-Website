import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  getLanguageAllItemsProgress,
  getProgressSnapshots,
} from "@/lib/learning/aggregate";
import { getRecentXpLedger } from "@/lib/gamification/gamification-service";
import {
  ensureAllStudyLanguageSettingsRows,
  ensurePreferredLanguageSettingsRow,
} from "@/lib/learning/bootstrap-language-settings";
import { prisma } from "@/lib/prisma";
import {
  isStudyLanguageCode,
  STUDY_LANGUAGES,
  type StudyLanguageCode,
} from "@/lib/study-languages";

export const runtime = "nodejs";

type Scope = "gabungan" | StudyLanguageCode;

function parseScope(raw: string | undefined): Scope {
  if (raw && isStudyLanguageCode(raw)) return raw;
  return "gabungan";
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }> | { scope?: string };
}) {
  const sp = await Promise.resolve(searchParams);
  const scope = parseScope(sp.scope);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredStudyLanguageCode: true },
  });

  await ensurePreferredLanguageSettingsRow(userId, userRow?.preferredStudyLanguageCode ?? null);
  await ensureAllStudyLanguageSettingsRows(userId);

  const snapshots = await getProgressSnapshots(userId);

  const perLangAll = await Promise.all(
    STUDY_LANGUAGES.map((l) =>
      getLanguageAllItemsProgress(userId, l.code).then((row) => ({ code: l.code, ...row })),
    ),
  );

  const quizByLang = await Promise.all(
    STUDY_LANGUAGES.map(async (l) => {
      const attempts = await prisma.quizAttempt.findMany({
        where: {
          userId,
          module: { language: { code: l.code } },
        },
        select: { score: true, total: true },
      });
      let correct = 0;
      let answered = 0;
      for (const a of attempts) {
        correct += a.score;
        answered += a.total;
      }
      return {
        code: l.code,
        sessions: attempts.length,
        accuracyPct: answered === 0 ? null : Math.round((100 * correct) / answered),
      };
    }),
  );

  const recentXpRows = await getRecentXpLedger(userId, 25);

  const aggregateNote =
    "Progress gabungan mengikuti centang «Masuk progress total gabungan» di dashboard — hanya bahasa yang dicentang yang dihitung di pembilang dan penyebut.";

  return (
    <main className="page-body fade-in">
      <header className="module-page-header" data-cjk="📊">
        <div>
          <h1>Statistik</h1>
          <p className="text-muted" style={{ fontSize: "0.95rem", lineHeight: 1.55 }}>
            Filter gabungan atau per bahasa (Fase F). Sumber angka sama dengan dashboard:{" "}
            <code>getProgressSnapshots</code> + query konten per bahasa.
          </p>
        </div>
      </header>

      <nav className="module-tabs" aria-label="Cakupan statistik">
        <Link
          href="/stats"
          className={`module-tab${scope === "gabungan" ? " module-tab-active" : ""}`}
          prefetch={false}
        >
          Gabungan
        </Link>
        {STUDY_LANGUAGES.map((l) => (
          <Link
            key={l.code}
            href={`/stats?scope=${l.code}`}
            className={`module-tab${scope === l.code ? " module-tab-active" : ""}`}
            prefetch={false}
          >
            {l.flag} {l.label}
          </Link>
        ))}
      </nav>

      {scope === "gabungan" ? (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 className="dashboard-section-title">Ringkasan gabungan</h2>
          <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: 16 }}>
            {aggregateNote}
          </p>
          <div className="stats-grid">
            <div className="stat-card red">
              <div className="stat-label">Progress total gabungan</div>
              <div className="stat-value">
                {snapshots.aggregate.overallPercent !== null
                  ? `${snapshots.aggregate.overallPercent}%`
                  : "—"}
              </div>
              <div className="stat-desc">
                {snapshots.aggregate.masteredItems} / {snapshots.aggregate.totalPublishableItems}{" "}
                item LEARNED pada bahasa yang masuk gabungan
              </div>
            </div>
          </div>
          <h3 className="dashboard-section-title" style={{ marginTop: 24 }}>
            Per bahasa (modul utama)
          </h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {snapshots.byLanguage.map((row) => (
              <li
                key={row.languageId}
                style={{
                  padding: "12px 0",
                  borderBottom: "1px solid var(--border-1, rgba(255,255,255,0.08))",
                  fontSize: "0.95rem",
                }}
              >
                <strong>{row.flagLabel}</strong> — {row.heroModuleTitle}:{" "}
                <strong>
                  {row.heroMastered} / {row.heroTotal}
                </strong>
                {" · "}
                {row.includeInTotalProgress ? "ikut gabungan" : "tidak ikut gabungan"}
                {" · "}
                <Link href={`/stats?scope=${row.languageCode}`} className="text-muted">
                  detail →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (() => {
          const row = snapshots.byLanguage.find((r) => r.languageCode === scope);
          const all = perLangAll.find((p) => p.code === scope);
          const quiz = quizByLang.find((q) => q.code === scope);
          const meta = STUDY_LANGUAGES.find((l) => l.code === scope);
          if (!row || !all || !quiz || !meta) notFound();

          return (
            <div className="card" style={{ marginTop: 20 }}>
              <h2 className="dashboard-section-title">
                {meta.flag} {meta.sectionTitle}
              </h2>
              <p className="text-muted" style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
                Modul <strong>{row.heroModuleTitle}</strong> — {row.heroMastered} / {row.heroTotal}{" "}
                kartu LEARNED. Seluruh konten bahasa ini di DB:{" "}
                <strong>
                  {all.learned} / {all.total}
                </strong>
                {all.percent !== null ? ` (${all.percent}%)` : ""}.
              </p>
              <div className="stats-grid" style={{ marginTop: 16 }}>
                <div className="stat-card">
                  <div className="stat-label">Quiz (modul bahasa ini)</div>
                  <div className="stat-value">{quiz.sessions}</div>
                  <div className="stat-desc">
                    akurasi:{" "}
                    {quiz.accuracyPct === null ? "— (belum ada jawaban)" : `${quiz.accuracyPct}%`}
                  </div>
                </div>
                <div className="stat-card gold">
                  <div className="stat-label">Sedang dipelajari</div>
                  <div className="stat-value">{row.isStudying ? "Ya" : "Tidak"}</div>
                  <div className="stat-desc">pengaturan akun</div>
                </div>
              </div>
              <p style={{ marginTop: 20 }}>
                <Link href={`/learn/${scope}/${row.heroModuleSlug}`} className="btn btn-outline">
                  Buka modul {row.heroModuleTitle}
                </Link>
              </p>
            </div>
          );
        })()}

      <section className="card" id="riwayat-xp" style={{ marginTop: 36 }}>
        <h2 className="dashboard-section-title">Riwayat XP</h2>
        <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: 14 }}>
          Mutasi dari ledger server (belajar, kuis, SRS, streak, challenge). Tanggal pakai penyimpanan
          UTC di basis data.
        </p>
        {recentXpRows.length === 0 ? (
          <p className="text-muted">Belum ada entri. Selesaikan aktivitas di dashboard atau modul belajar.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {recentXpRows.map((row) => (
              <li
                key={row.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border-1, rgba(255,255,255,0.08))",
                  fontSize: "0.92rem",
                }}
              >
                <div>
                  <div>
                    <strong>{row.source}</strong>
                    {row.refType ? (
                      <span className="text-muted">
                        {" "}
                        · {row.refType}
                        {row.refId ? `: ${row.refId}` : ""}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                    {row.createdAt.toISOString().replace("T", " ").slice(0, 19)} UTC
                  </div>
                </div>
                <div style={{ fontWeight: 600, color: row.amount >= 0 ? "inherit" : "#e74c3c" }}>
                  {row.amount >= 0 ? "+" : ""}
                  {row.amount} XP
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
