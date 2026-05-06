import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { HiraganaInteractiveGrid } from "@/components/hiragana-interactive-grid";
import { HiraganaQuizClient } from "@/components/hiragana-quiz-client";
import { HiraganaSrsPanel } from "@/components/hiragana-srs-panel";
import { auth } from "@/lib/auth";
import { getModuleProgressMap } from "@/lib/learning/aggregate";
import { ensurePreferredLanguageSettingsRow } from "@/lib/learning/bootstrap-language-settings";
import { heroModuleForCode } from "@/lib/learning/hero-module";
import {
  getJaHiraganaSrsStats,
  listDueJaHiraganaContentIds,
  listUnreviewedJaHiraganaIds,
} from "@/lib/srs/srs-service";
import { prisma } from "@/lib/prisma";
import { rowFromContentItem } from "@/lib/quiz/hiragana-multiple-choice";
import {
  STUDY_LANGUAGE_SPEECH_BCP47,
  isStudyLanguageCode,
  STUDY_LANGUAGES,
  type StudyLanguageCode,
} from "@/lib/study-languages";

export const runtime = "nodejs";

type PageProps = {
  params: { lang: string; slug?: string[] };
  searchParams?: { tab?: string };
};

export default async function LearnPage({ params, searchParams }: PageProps) {
  if (!isStudyLanguageCode(params.lang)) notFound();

  const langCode = params.lang as StudyLanguageCode;
  const meta = STUDY_LANGUAGES.find((l) => l.code === langCode)!;
  const hero = heroModuleForCode(langCode);

  if (!params.slug?.[0]) {
    redirect(`/learn/${langCode}/${hero.slug}`);
  }

  const slug = params.slug;
  const segment = slug[0];
  const trail = slug.length ? ` / ${slug.join(" / ")}` : "";

  const jaQuiz =
    langCode === "ja" &&
    (segment === "quiz" || (segment === "hiragana" && slug[1] === "quiz"));

  if (jaQuiz) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;

    const mod = await prisma.module.findFirst({
      where: { slug: "hiragana", language: { code: "ja" } },
      include: {
        contentItems: { orderBy: { sortOrder: "asc" } },
      },
    });

    const quizRows =
      mod?.contentItems.map(rowFromContentItem).filter((r): r is NonNullable<typeof r> => r !== null) ??
      [];

    return (
      <main className="page-body fade-in">
        <header className="module-page-header" data-cjk="★">
          <div>
            <h1>Kuis Hiragana</h1>
            <p>
              Pilihan ganda char → romaji. Skor dan XP disimpan untuk pengguna yang masuk (Fase E).
            </p>
          </div>
        </header>
        <nav className="module-tabs" aria-label="Tampilan modul">
          <Link href="/learn/ja/hiragana" className="module-tab" prefetch={false}>
            Grid
          </Link>
          <Link href="/learn/ja/hiragana?tab=srs" className="module-tab" prefetch={false}>
            SRS
          </Link>
          <Link href="/learn/ja/hiragana/quiz" className="module-tab module-tab-active" prefetch={false}>
            Quiz
          </Link>
        </nav>
        <HiraganaQuizClient items={quizRows} authenticated={userId !== undefined} />
      </main>
    );
  }

  if (segment === hero.slug && slug[1] !== "quiz") {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;

    const prefRow =
      userId === undefined
        ? null
        : await prisma.user.findUnique({
            where: { id: userId },
            select: { preferredStudyLanguageCode: true },
          });

    if (userId) {
      await ensurePreferredLanguageSettingsRow(userId, prefRow?.preferredStudyLanguageCode ?? null);
    }

    const mod = await prisma.module.findFirst({
      where: { slug: hero.slug, language: { code: langCode } },
      include: {
        contentItems: { orderBy: { sortOrder: "asc" } },
      },
    });

    const progressMap =
      userId === undefined ? new Map() : await getModuleProgressMap(userId, langCode, hero.slug);
    const initialProgress = Object.fromEntries(progressMap);

    const itemIds = mod?.contentItems.map((c) => c.id) ?? [];
    const showSrs = langCode === "ja" && hero.slug === "hiragana";

    let srsExtras: {
      dueIds: string[];
      unreviewedIds: string[];
      stats: Awaited<ReturnType<typeof getJaHiraganaSrsStats>>;
      srsCardByItemId: Record<
        string,
        { intervalDays: number; repetitions: number; easeFactor: number }
      >;
    } | null = null;

    if (showSrs && userId !== undefined && itemIds.length > 0) {
      const [dueIds, unreviewedIds, stats, cardRows] = await Promise.all([
        listDueJaHiraganaContentIds(userId, itemIds),
        listUnreviewedJaHiraganaIds(userId, itemIds),
        getJaHiraganaSrsStats(userId, itemIds),
        prisma.srsCard.findMany({
          where: { userId, contentItemId: { in: itemIds } },
          select: {
            contentItemId: true,
            intervalDays: true,
            repetitions: true,
            easeFactor: true,
          },
        }),
      ]);

      srsExtras = {
        dueIds,
        unreviewedIds,
        stats,
        srsCardByItemId: Object.fromEntries(
          cardRows.map((c) => [
            c.contentItemId,
            {
              intervalDays: c.intervalDays,
              repetitions: c.repetitions,
              easeFactor: c.easeFactor,
            },
          ]),
        ),
      };
    }

    const showSrsTab = searchParams?.tab === "srs";

    const moduleBlurb =
      langCode === "ja"
        ? `${mod?.contentItems.length ?? 0} karakter dari database — struktur mengikuti referensi Lingora.`
        : langCode === "ko"
          ? `${mod?.contentItems.length ?? 0} kartu hangul (jamo + suku kata) dari referensi Lingora.`
          : langCode === "zh"
            ? `${mod?.contentItems.length ?? 0} kartu pinyin (inisial, final, kombinasi) dari referensi Lingora.`
            : `${mod?.contentItems.length ?? 0} kartu kosakata & catatan tense (aksara Latin, proof Fase I).`;

    return (
      <main className="page-body fade-in">
        <header className="module-page-header" data-cjk={hero.dashboardChar}>
          <div>
            <h1>{hero.title}</h1>
            <p>
              {mod
                ? moduleBlurb
                : "Jalankan migrasi dan seed (lihat prisma/) untuk memuat konten."}
            </p>
          </div>
        </header>
        {mod && mod.contentItems.length > 0 ? (
          <>
            {showSrs ? (
              <nav className="module-tabs" aria-label="Tampilan modul">
                <Link
                  href={`/learn/${langCode}/${hero.slug}`}
                  className={`module-tab${!showSrsTab ? " module-tab-active" : ""}`}
                  prefetch={false}
                >
                  Grid
                </Link>
                <Link
                  href={`/learn/${langCode}/${hero.slug}?tab=srs`}
                  className={`module-tab${showSrsTab ? " module-tab-active" : ""}`}
                  prefetch={false}
                >
                  SRS
                </Link>
                <Link href="/learn/ja/hiragana/quiz" className="module-tab" prefetch={false}>
                  Quiz
                </Link>
              </nav>
            ) : (
              <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: 12 }}>
                Tandai kartu yang sudah dikuasai; progress tercermin di dashboard dan halaman statistik.
              </p>
            )}
            {showSrs && showSrsTab ? (
              <HiraganaSrsPanel
                authenticated={userId !== undefined}
                items={mod.contentItems}
                dueIds={srsExtras?.dueIds ?? []}
                unreviewedIds={srsExtras?.unreviewedIds ?? []}
                stats={
                  srsExtras?.stats ?? { due: 0, learning: 0, mastered: 0 }
                }
                srsCardByItemId={srsExtras?.srsCardByItemId ?? {}}
              />
            ) : (
              <HiraganaInteractiveGrid
                items={mod.contentItems}
                initialProgress={initialProgress}
                speechLang={STUDY_LANGUAGE_SPEECH_BCP47[langCode]}
                charMainUseCjkFont={
                  langCode === "ja" || langCode === "ko" || langCode === "zh"
                }
              />
            )}
          </>
        ) : (
          <div className="card">
            <p className="text-muted" style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
              Belum ada data modul <code>{hero.slug}</code>. Set <code>DATABASE_URL</code>, lalu:{" "}
              <code>npx prisma migrate deploy</code>, <code>node prisma/build-lang-data.mjs</code>, dan{" "}
              <code>npx prisma db seed</code>.
            </p>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="page-body fade-in">
      <div className="card">
        <div style={{ marginBottom: 8 }}>
          <span className="badge badge-gold">{meta.flag}</span>{" "}
          <strong>{meta.sectionTitle}</strong>
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", marginBottom: 8 }}>
          {meta.label}
          <span className="text-muted" style={{ fontWeight: 400, marginLeft: 8 }}>
            {trail}
          </span>
        </h2>
        <p style={{ fontSize: "0.9rem", color: "var(--text-2)", lineHeight: 1.6 }}>
          Rute placeholder untuk <code>{`/learn/${langCode}/${segment}`}</code>
          . Modul utama ({hero.title}) tersedia di{" "}
          <Link href={`/learn/${langCode}/${hero.slug}`}>/{langCode}/{hero.slug}</Link>.
        </p>
      </div>
    </main>
  );
}
