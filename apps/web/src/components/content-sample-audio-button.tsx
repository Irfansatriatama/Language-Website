"use client";

import { useCallback, useRef } from "react";

import { speakWithWebSpeech } from "@/lib/media/web-speech-speak";

type Props = {
  /** Cloudinary (or other) HTTPS URL; when null, only Web Speech is used */
  hostedAudioUrl: string | null;
  /** Text spoken when there is no URL or hosted playback fails */
  speechText: string;
  speechLang?: string;
  /** Short description of the sound for assistive tech, e.g. "Pelafalan hiragana あ" */
  ariaLabel: string;
  className?: string;
};

export function ContentSampleAudioButton({
  hostedAudioUrl,
  speechText,
  speechLang = "ja-JP",
  ariaLabel,
  className,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playHosted = useCallback(async () => {
    if (!hostedAudioUrl) return false;
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(hostedAudioUrl);
      }
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      return true;
    } catch {
      return false;
    }
  }, [hostedAudioUrl]);

  const onClick = useCallback(() => {
    void (async () => {
      if (hostedAudioUrl) {
        const ok = await playHosted();
        if (ok) return;
      }
      speakWithWebSpeech(speechText, speechLang);
    })();
  }, [hostedAudioUrl, playHosted, speechText, speechLang]);

  return (
    <button
      type="button"
      className={className ?? "char-cell-icon-btn"}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      🔊
    </button>
  );
}
