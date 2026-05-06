import { headers } from "next/headers";
import Link from "next/link";

import { DashboardLanguageSettings } from "@/components/dashboard-language-settings";
import { auth } from "@/lib/auth";
import { getGamificationOverview } from "@/lib/gamification/gamification-service";
import { levelProgressFromTotalXp } from "@/lib/gamification/xp-level";
import { getProgressSnapshots } from "@/lib/learning/aggregate";
import { ensureAllStudyLanguageSettingsRows, ensurePreferredLanguageSettingsRow } from "@/lib/learning/bootstrap-language-settings";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredStudyLanguageCode: true, totalXp: true },
  });

  await ensurePreferredLanguageSettingsRow(userId, userRow?.preferredStudyLanguageCode ?? null);
  await ensureAllStudyLanguageSettingsRows(userId);

  const [snapshots, quizRows, g] = await Promise.all([
    getProgressSnapshots(userId),
    prisma.quizAttempt.findMany({
      where: { userId },
      select: { score: true, total: true },
    }),
    getGamificationOverview(userId),
  ]);

  const { aggregate, byLanguage } = snapshots;

  let quizCorrect = 0;
  let quizAnswered = 0;
  for (const row of quizRows) {
    quizCorrect += row.score;
    quizAnswered += row.total;
  }
  const quizSessions = quizRows.length;
  const quizAccuracyPct =
    quizAnswered === 0 ? null : Math.round((100 * quizCorrect) / quizAnswered);

  const totalXp = g.totalXp;
  const xpProgress = levelProgressFromTotalXp(totalXp);
  const xpFillPct = `${Math.round(xpProgress.progress01 * 100)}%`;
  const nextXpTarget =
    xpProgress.nextLevel !== null ? `${xpProgress.nextLevel.xpRequired} XP` : "max";

  const aggregateTooltip =
    "Persentase total = round(100 × item dikuasai ÷ semua item yang dipublikasikan), hanya bahasa dengan centang «Masuk progress total gabungan». Item = kartu konten; dikuasai = status LEARNED.";

  const overallDisplay =
    aggregate.overallPercent !== null ? `${aggregate.overallPercent}%` : "—";

  return (
    <main className="page-body fade-in">
      <div className="dashboard-welcome">
        <span className="cjk-bg">学</span>
        <div className="welcome-greeting">Selamat Datang Kembali</div>
        <div className="welcome-name">Ringkasan belajar</div>
        <div className="welcome-quote">
          Progress modul utama (hiragana / hangul / pinyin) dan agregat mengikuti pengaturan bahasa di bawah — data tersimpan di akun Anda.
        </div>
        <div className="welcome-streak">
          <span>★</span>
          <span>
            {g.streakCurrent} hari streak
            {g.streakBest > 0 ? ` · rekor ${g.streakBest} hari` : ""}
          </span>
        </div>
        <div className="welcome-xp-bar">
          <div className="xp-level-badge">Lv.{xpProgress.level.level}</div>
          <div style={{ flex: 1 }}>
            <div className="xp-bar-track">
              <div className="xp-bar-fill" style={{ width: xpFillPct }} />
            </div>
            <div className="xp-bar-labels">
              <span>{totalXp} XP</span>
              <span>
                {xpProgress.level.nameJa} {xpProgress.level.nameId}
              </span>
              <span>{nextXpTarget}</span>
            </div>
            <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: 6 }}>
              Zona waktu akun memengaruhi hari kalender (streak & challenge).{" "}
              <Link href="/stats#riwayat-xp">Riwayat XP →</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="stats-grid" id="stats-placeholder">
        <div
          className="stat-card red"
          title={aggregateTooltip}
        >
          <div className="stat-label">Progress total gabungan</div>
          <div className="stat-value">{overallDisplay}</div>
          <div className="stat-desc">
            {aggregate.masteredItems} / {aggregate.totalPublishableItems} item dikuasai (v1)
          </div>
        </div>
        <div className="stat-card gold">
          <div className="stat-label">Streak Harian</div>
          <div className="stat-value">{g.streakCurrent}</div>
          <div className="stat-desc">hari berturut-turut · rekor {g.streakBest}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Quiz Selesai</div>
          <div className="stat-value">{quizSessions}</div>
          <div className="stat-desc">sesi latihan tersimpan</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Akurasi Quiz</div>
          <div className="stat-value">
            {quizAccuracyPct === null ? "—" : `${quizAccuracyPct}%`}
          </div>
          <div className="stat-desc">rata-rata jawaban benar</div>
        </div>
      </div>

      <section className="card" style={{ marginTop: 24 }}>
        <div className="section-header" style={{ marginBottom: 8 }}>
          <h2 className="dashboard-section-title" style={{ margin: 0 }}>
            Challenge harian
          </h2>
          <span className="badge">{g.calendarYmd}</span>
        </div>
        <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: 16, lineHeight: 1.5 }}>
          Daftar berganti setiap tanggal kalender sesuai pengaturan zona waktu SRS akun Anda. Hadiah XP
          otomatis dicatat ke riwayat saat tugas pertama kali tercapai hari ini.
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
          {g.todayChallenges.map((ch) => {
            const tgt = ch.target ?? ch.count ?? 1;
            const prog = Math.min(ch.progress ?? 0, tgt);
            const fill = tgt > 0 ? `${Math.round((prog / tgt) * 100)}%` : "0%";
            return (
              <li
                key={ch.id}
                style={{
                  border: "1px solid var(--border-1, rgba(255,255,255,0.12))",
                  borderRadius: 10,
                  padding: "12px 14px",
                  background: ch.completed ? "rgba(39,174,96,0.06)" : "transparent",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1.35rem" }} aria-hidden>
                    {ch.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{ch.title}</div>
                    <div className="text-muted" style={{ fontSize: "0.88rem", marginTop: 2 }}>
                      {ch.desc}
                    </div>
                    <div className="xp-bar-track" style={{ marginTop: 10, height: 6 }}>
                      <div className="xp-bar-fill" style={{ width: fill }} />
                    </div>
                    <div
                      className="text-muted"
                      style={{ fontSize: "0.78rem", marginTop: 6, display: "flex", justifyContent: "space-between" }}
                    >
                      <span>
                        {ch.completed ? "Selesai" : `${prog} / ${tgt}`}
                      </span>
                      <span>+{ch.xp} XP</span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <DashboardLanguageSettings rows={byLanguage} />

      {byLanguage.map((lang) => (
        <div key={lang.languageId} className="modules-section">
          <div className="section-header">
            <div className="section-title">{lang.sectionTitle}</div>
            {lang.isStudying ? (
              <span className="badge badge-red">Sedang dipelajari</span>
            ) : (
              <span className="badge">Referensi</span>
            )}
          </div>
          <p className="text-muted dashboard-module-blurb">
            Modul {lang.heroModuleTitle.toLowerCase()}:{" "}
            <strong>
              {lang.heroMastered} / {lang.heroTotal}
            </strong>
            {lang.heroTotal === 0 ? " — konten menyusul untuk bahasa ini." : " kartu."}
          </p>
          <div className="module-grid">
            <Link className="module-card" href={`/learn/${lang.languageCode}/${lang.heroModuleSlug}`}>
              <span className="module-char cjk">
                {lang.languageCode === "ja" ? "あ" : lang.languageCode === "ko" ? "한" : "拼"}
              </span>
              <span className="module-name">{lang.heroModuleTitle}</span>
              <span className="module-count">
                {lang.heroTotal > 0
                  ? `${lang.heroMastered} / ${lang.heroTotal} dari database`
                  : "Jalankan seed untuk memuat konten"}
              </span>
            </Link>
          </div>
        </div>
      ))}

      <div className="daily-quote">
        <div className="quote-icon cjk">学</div>
        <div>
          <div className="quote-text">
            Belajar tanpa berpikir adalah sia-sia. Berpikir tanpa belajar adalah berbahaya.
          </div>
          <div className="quote-source">— Konfusius</div>
        </div>
      </div>
    </main>
  );
}
