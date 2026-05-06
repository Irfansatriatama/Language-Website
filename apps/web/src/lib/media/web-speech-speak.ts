/**
 * Browser Web Speech API (SpeechSynthesis) fallback when no hosted audio URL exists.
 * Limitations: voice quality and availability depend on OS/browser; many mobile browsers
 * require a direct user gesture before the first speak(); languages may fall back to a
 * default locale voice; some engines ignore pitch/rate.
 */
export function cancelWebSpeech(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function speakWithWebSpeech(text: string, lang: string): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(trimmed);
  u.lang = lang;
  window.speechSynthesis.speak(u);
  return true;
}
