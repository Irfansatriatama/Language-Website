"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";

import { submitHiraganaMcQuizAttempt } from "@/actions/quiz-actions";
import { HIRAGANA_MC_CHAR_TO_ROMAJI } from "@/lib/quiz/quiz-modes";
import type { HiraganaQuizRow } from "@/lib/quiz/hiragana-multiple-choice";
import { buildCharToRomajiQuestions } from "@/lib/quiz/hiragana-multiple-choice";

const QUESTION_COUNT = 10;
const MIN_POOL = 5;

type Phase = "idle" | "running" | "submitting" | "done";

type Props = {
  items: HiraganaQuizRow[];
  authenticated: boolean;
};

export function HiraganaQuizClient({ items, authenticated }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [questions, setQuestions] = useState<ReturnType<typeof buildCharToRomajiQuestions>>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [finish, setFinish] = useState<{
    score: number;
    total: number;
    xpGained: number;
    newTotalXp: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startedAtRef = useRef(0);
  const answersRef = useRef<{ contentItemId: string; selectedRomaji: string }[]>([]);

  const poolOk = items.length >= MIN_POOL;

  const current = questions[index];

  const progressLabel = useMemo(() => {
    if (phase !== "running" || !current) return "";
    return `Soal ${index + 1} dari ${questions.length}`;
  }, [phase, current, index, questions.length]);

  const startQuiz = useCallback(() => {
    setError(null);
    setFinish(null);
    answersRef.current = [];
    const qs = buildCharToRomajiQuestions(items, Math.min(QUESTION_COUNT, items.length));
    if (qs.length === 0) {
      setError("Tidak ada soal yang bisa dibuat.");
      return;
    }
    setQuestions(qs);
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    startedAtRef.current = Date.now();
    setPhase("running");
  }, [items]);

  const pickChoice = useCallback(
    (romaji: string) => {
      if (phase !== "running" || revealed || !current) return;
      setSelected(romaji);
      setRevealed(true);
      answersRef.current.push({
        contentItemId: current.contentItemId,
        selectedRomaji: romaji,
      });
    },
    [phase, revealed, current],
  );

  const goNext = useCallback(async () => {
    if (phase !== "running" || !revealed) return;
    const nextIdx = index + 1;
    if (nextIdx < questions.length) {
      setIndex(nextIdx);
      setSelected(null);
      setRevealed(false);
      return;
    }

    const ordered = answersRef.current;
    let score = 0;
    for (let i = 0; i < questions.length; i++) {
      if (ordered[i]?.selectedRomaji === questions[i]?.answerRomaji) score++;
    }
    const total = questions.length;

    if (!authenticated) {
      setPhase("done");
      setFinish({
        score,
        total,
        xpGained: 0,
        newTotalXp: 0,
      });
      return;
    }

    const durationMs = Date.now() - startedAtRef.current;

    setPhase("submitting");
    setError(null);

    const res = await submitHiraganaMcQuizAttempt({
      mode: HIRAGANA_MC_CHAR_TO_ROMAJI,
      durationMs,
      answers: ordered,
    });

    if (!res.ok) {
      setError(res.error);
      setPhase("running");
      return;
    }

    setFinish({
      score: res.score,
      total: res.total,
      xpGained: res.xpGained,
      newTotalXp: res.newTotalXp,
    });
    setPhase("done");
  }, [phase, revealed, index, questions, authenticated]);

  if (!poolOk) {
    return (
      <div className="card">
        <p className="text-muted" style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
          Minimal {MIN_POOL} karakter hiragana di database untuk kuis. Jalankan seed atau periksa modul.
        </p>
      </div>
    );
  }

  return (
    <div className="quiz-session">
      {!authenticated && phase === "idle" && (
        <p className="text-muted quiz-guest-hint">
          Anda belum masuk — latihan tetap bisa; skor dan XP disimpan setelah login.
        </p>
      )}

      {phase === "idle" && (
        <div className="card quiz-intro-card">
          <h2 className="quiz-intro-title">Kuis Hiragana</h2>
          <p className="text-muted quiz-intro-desc">
            Tebak bacaan (romaji) untuk tiap karakter. Empat pilihan unik bila memungkinkan (BF-001).
          </p>
          <button type="button" className="btn btn-primary" onClick={startQuiz}>
            Mulai ({Math.min(QUESTION_COUNT, items.length)} soal)
          </button>
        </div>
      )}

      {(phase === "running" || phase === "submitting") && current && (
        <div className="card quiz-question-card">
          <div className="quiz-progress-row">
            <span>{progressLabel}</span>
            {phase === "submitting" && <span className="text-muted">Menyimpan…</span>}
          </div>
          <div className="quiz-char-display cjk" data-cjk={current.char}>
            {current.char}
          </div>
          <p className="text-muted quiz-prompt">Pilih romaji yang benar</p>
          <div className="quiz-choices-grid">
            {current.choicesRomaji.map((choice) => {
              const isSel = selected === choice;
              let cls = "quiz-choice-btn";
              if (revealed) {
                if (choice === current.answerRomaji) cls += " quiz-choice-correct";
                else if (isSel) cls += " quiz-choice-wrong";
              } else if (isSel) cls += " quiz-choice-selected";
              return (
                <button
                  key={`${current.contentItemId}-${choice}`}
                  type="button"
                  className={cls}
                  disabled={revealed || phase === "submitting"}
                  onClick={() => pickChoice(choice)}
                >
                  {choice}
                </button>
              );
            })}
          </div>
          {revealed && phase === "running" && (
            <button type="button" className="btn btn-primary quiz-next-btn" onClick={() => void goNext()}>
              {index + 1 >= questions.length ? "Selesai" : "Lanjut"}
            </button>
          )}
        </div>
      )}

      {phase === "done" && finish && (
        <div className="card quiz-result-card">
          <h2 className="quiz-result-title">Hasil</h2>
          <p className="quiz-result-score">
            Skor:{" "}
            <strong>
              {finish.score} / {finish.total}
            </strong>
          </p>
          {authenticated ? (
            <p className="text-muted">
              +{finish.xpGained} XP · Total XP sekarang: <strong>{finish.newTotalXp}</strong>
            </p>
          ) : (
            <p className="text-muted">
              <Link href="/login">Masuk</Link> untuk menyimpan skor dan mendapat XP.
            </p>
          )}
          <div className="quiz-result-actions">
            <button type="button" className="btn btn-primary" onClick={startQuiz}>
              Ulangi kuis
            </button>
            <Link className="btn btn-outline" href="/learn/ja/hiragana">
              Kembali ke grid
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="card quiz-error-card" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
