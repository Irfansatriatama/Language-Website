"use client";

import type { ContentItem } from "@prisma/client";
import { ItemProgressState } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { markLearned, toggleFavorite, unmarkLearned } from "@/actions/learning-actions";
import { resolveHiraganaSampleAudioUrl } from "@/lib/media/hiragana-audio-url";

import { ContentSampleAudioButton } from "./content-sample-audio-button";
import { hiraganaPayloadFromRow } from "./hiragana-grid";

export type HiraganaProgressClient = Record<
  string,
  { state: ItemProgressState; favorite: boolean }
>;

type Props = {
  items: ContentItem[];
  initialProgress: HiraganaProgressClient;
  /** BCP-47 for Web Speech preview (default matches legacy Japanese modules). */
  speechLang?: string;
  /** Gunakan font/stack CJK untuk `char`; matikan untuk kata Latin (ES/DE/EN). */
  charMainUseCjkFont?: boolean;
};

function rowProgress(
  initialProgress: HiraganaProgressClient,
  contentItemId: string,
): HiraganaProgressClient[string] {
  return initialProgress[contentItemId] ?? { state: ItemProgressState.NEW, favorite: false };
}

export function HiraganaInteractiveGrid({
  items,
  initialProgress,
  speechLang = "ja-JP",
  charMainUseCjkFont = true,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function run(fn: () => Promise<void>) {
    startTransition(() => {
      void (async () => {
        try {
          await fn();
          router.refresh();
        } catch (err) {
          console.error(err);
        }
      })();
    });
  }

  return (
    <div className="char-grid">
      {items.map((row) => {
        const p = hiraganaPayloadFromRow(row);
        const hosted = resolveHiraganaSampleAudioUrl(p);
        const speechText = p.example?.word ?? p.char;
        const prog = rowProgress(initialProgress, row.id);
        const learned = prog.state === ItemProgressState.LEARNED;

        return (
          <div
            key={row.id}
            className={`char-cell${learned ? " char-cell-learned" : ""}`}
            title={`${p.romaji} · ${p.group} · ${p.type}`}
          >
            <span className={`char-main${charMainUseCjkFont ? " cjk" : ""}`}>{p.char}</span>
            <span className="char-romaji">{p.romaji}</span>
            <div className="char-cell-actions">
              <ContentSampleAudioButton
                hostedAudioUrl={hosted}
                speechText={speechText}
                speechLang={speechLang}
                ariaLabel={`Dengarkan contoh audio: ${p.char} (${p.romaji})`}
              />
              <button
                type="button"
                className={`char-cell-icon-btn${learned ? " active-learned" : ""}`}
                aria-pressed={learned}
                aria-label={learned ? "Tandai belum dikuasai" : "Tandai sudah dikuasai"}
                onClick={() =>
                  run(async () => {
                    if (learned) {
                      await unmarkLearned(row.id);
                    } else {
                      await markLearned(row.id);
                    }
                  })
                }
              >
                ✓
              </button>
              <button
                type="button"
                className={`char-cell-icon-btn${prog.favorite ? " active-fav" : ""}`}
                aria-pressed={prog.favorite}
                aria-label={prog.favorite ? "Hapus favorit" : "Tandai favorit"}
                onClick={() =>
                  run(async () => {
                    await toggleFavorite(row.id);
                  })
                }
              >
                ★
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
