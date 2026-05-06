"use client";

import type { ContentItem } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";

import { submitSrsReview } from "@/actions/srs-actions";
import type { HiraganaSrsStats } from "@/lib/srs/srs-service";
import {
  calculateNext,
  defaultSrsCardState,
  intervalLabel,
  ratingEmoji,
  ratingWord,
} from "@/lib/srs/sm2";

import { resolveHiraganaSampleAudioUrl } from "@/lib/media/hiragana-audio-url";

import { ContentSampleAudioButton } from "./content-sample-audio-button";
import { hiraganaPayloadFromRow } from "./hiragana-grid";

export type SrsCardStateDTO = {
  intervalDays: number;
  repetitions: number;
  easeFactor: number;
};

type Props = {
  /** Logged-in session required for review persistence */
  authenticated: boolean;
  items: ContentItem[];
  dueIds: string[];
  unreviewedIds: string[];
  stats: HiraganaSrsStats;
  srsCardByItemId: Record<string, SrsCardStateDTO>;
};

function buildQueue(items: ContentItem[], dueIds: string[], unreviewedIds: string[]): ContentItem[] {
  const dueSet = new Set(dueIds);
  const newSet = new Set(unreviewedIds);
  const dueItems = items.filter((i) => dueSet.has(i.id));
  const newItems = items.filter((i) => newSet.has(i.id)).slice(0, 20);
  return [...dueItems, ...newItems];
}

export function HiraganaSrsPanel({
  authenticated,
  items,
  dueIds,
  unreviewedIds,
  stats,
  srsCardByItemId,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [queueExtra, setQueueExtra] = useState<ContentItem[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [localeCards, setLocaleCards] = useState<Record<string, SrsCardStateDTO>>({});
  const [reviewsCompleted, setReviewsCompleted] = useState(0);

  const baseQueue = useMemo(
    () => buildQueue(items, dueIds, unreviewedIds),
    [items, dueIds, unreviewedIds],
  );

  const queue = useMemo(() => [...baseQueue, ...queueExtra], [baseQueue, queueExtra]);

  const getCardDto = useCallback(
    (contentItemId: string): SrsCardStateDTO => {
      return localeCards[contentItemId] ?? srsCardByItemId[contentItemId] ?? defaultSrsCardState();
    },
    [localeCards, srsCardByItemId],
  );

  const newCount = unreviewedIds.length;

  const sessionComplete = queue.length > 0 && index >= queue.length;

  const runReview = async (contentItemId: string, rating: number) => {
    await submitSrsReview(contentItemId, rating);
    const prev = getCardDto(contentItemId);
    const next = calculateNext(prev, rating);
    setLocaleCards((prevMap) => ({
      ...prevMap,
      [contentItemId]: {
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        easeFactor: next.easeFactor,
      },
    }));
    startTransition(() => router.refresh());
  };

  const restartSession = () => {
    setQueueExtra([]);
    setIndex(0);
    setRevealed(false);
    setLocaleCards({});
    setReviewsCompleted(0);
    router.refresh();
  };

  if (!authenticated) {
    return (
      <div className="card">
        <p className="text-muted" style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
          Masuk untuk menyimpan sesi SRS (SM-2) ke akunmu.
        </p>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="srs-main">
        <div className="srs-stats-bar">
          <div className="srs-stat-chip due">
            <span className="chip-icon">📅</span>
            <span>{stats.due} jatuh tempo</span>
          </div>
          <div className="srs-stat-chip learn">
            <span className="chip-icon">📖</span>
            <span>{newCount} baru</span>
          </div>
          <div className="srs-stat-chip master">
            <span className="chip-icon">🏆</span>
            <span>{stats.mastered} dikuasai</span>
          </div>
        </div>
        <div className="srs-done-wrap">
          <div className="srs-done-icon">🎉</div>
          <div className="srs-done-title">Semua Beres!</div>
          <div className="srs-done-sub">
            Tidak ada kartu yang perlu diulang sekarang.
            <br />
            Kembali besok untuk sesi berikutnya.
          </div>
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="srs-main">
        <div className="srs-stats-bar" aria-live="polite">
          <div className="srs-stat-chip due">
            <span className="chip-icon">📅</span>
            <span>{stats.due} jatuh tempo</span>
          </div>
          <div className="srs-stat-chip learn">
            <span className="chip-icon">📖</span>
            <span>{newCount} baru</span>
          </div>
          <div className="srs-stat-chip master">
            <span className="chip-icon">🏆</span>
            <span>{stats.mastered} dikuasai</span>
          </div>
        </div>
        <div className="srs-done-wrap">
          <div className="srs-done-icon">✅</div>
          <div className="srs-done-title">Sesi Selesai!</div>
          <div className="srs-done-sub">
            Kamu telah mereview {reviewsCompleted} kartu.
            <br />
            {stats.mastered} kartu sudah dikuasai — keren! 🏆
          </div>
          <button type="button" className="srs-restart-btn" onClick={restartSession}>
            Mulai Ulang Sesi
          </button>
        </div>
      </div>
    );
  }

  const item = queue[index]!;
  const p = hiraganaPayloadFromRow(item);
  const hostedAudioUrl = resolveHiraganaSampleAudioUrl(p);
  const speechText = p.example?.word ?? p.char;
  const dto = getCardDto(item.id);
  const isNew = !srsCardByItemId[item.id] && !localeCards[item.id];
  const total = queue.length;
  const pct = Math.round((index / total) * 100);
  const previews = [0, 1, 2, 3].map((r) => intervalLabel(calculateNext(dto, r).intervalDays));

  return (
    <div className="srs-main">
      <div className="srs-stats-bar" aria-live="polite">
        <div className="srs-stat-chip due">
          <span className="chip-icon">📅</span>
          <span>{stats.due} jatuh tempo</span>
        </div>
        <div className="srs-stat-chip learn">
          <span className="chip-icon">📖</span>
          <span>{newCount} baru</span>
        </div>
        <div className="srs-stat-chip master">
          <span className="chip-icon">🏆</span>
          <span>{stats.mastered} dikuasai</span>
        </div>
      </div>

      <div className="srs-card-wrap">
        <div className="srs-progress-row">
          <span>
            {index + 1} / {total}
          </span>
          <div className="srs-progress-bar-wrap">
            <div className="srs-progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span>{pct}%</span>
        </div>

        <div className="srs-card" role="region" aria-label="Kartu SRS">
          <span className="srs-counter">#{index + 1}</span>
          {isNew ? (
            <span className="srs-badge new-badge">BARU</span>
          ) : (
            <span className="srs-badge">ULANG</span>
          )}
          <div className="srs-front">
            <div className="srs-front-inner">
              <span className="cjk">{p.char}</span>
              <ContentSampleAudioButton
                hostedAudioUrl={hostedAudioUrl}
                speechText={speechText}
                speechLang="ja-JP"
                ariaLabel={`Dengarkan contoh untuk huruf ${p.char}, ${p.romaji}`}
                className="char-cell-icon-btn srs-audio-btn"
              />
            </div>
          </div>
          <div className={`srs-back${revealed ? "" : " srs-hidden"}`}>
            <strong>{p.romaji}</strong>
            <div>
              {p.group} · {p.type}
            </div>
            {p.example ? (
              <div style={{ marginTop: 8 }}>
                <span className="cjk">{p.example.word}</span> — {p.example.reading} ({p.example.meaning})
              </div>
            ) : null}
          </div>
        </div>

        {!revealed ? (
          <button type="button" className="srs-reveal-btn" onClick={() => setRevealed(true)}>
            Tampilkan jawaban
          </button>
        ) : (
          <div className="srs-ratings" role="group" aria-label="Nilai ingatan">
            {[0, 1, 2, 3].map((r) => (
              <button
                key={r}
                type="button"
                className="srs-rating-btn"
                data-rating={r}
                aria-label={`${ratingWord(r)}, perkiraan ulang ${previews[r]}`}
                onClick={() => {
                  startTransition(() => {
                    void (async () => {
                      try {
                        await runReview(item.id, r);
                        if (r === 0) {
                          setQueueExtra((prev) => [...prev, item]);
                        }
                        setReviewsCompleted((n) => n + 1);
                        setRevealed(false);
                        setIndex((i) => i + 1);
                      } catch (e) {
                        console.error(e);
                      }
                    })();
                  });
                }}
              >
                <span className="rbtn-emoji">{ratingEmoji(r)}</span>
                <span className="rbtn-label">{ratingWord(r)}</span>
                <span className="rbtn-interval">{previews[r]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
