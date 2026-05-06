"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  STUDY_LANGUAGES,
  defaultStudyLangCode,
  isStudyLanguageCode,
  type StudyLanguageCode,
} from "@/lib/study-languages";
import { urlAfterStudyLanguageChange } from "@/lib/cross-language-learn-path";

type Props = {
  /** DB preference for signed-in users; cookie mirror is synced server-side via `/api/study-language`. */
  preferredStudyLanguageCode: string | null;
  /** Distinct DOM ids when two pickers mount (topbar + mobile drawer). */
  variant?: "topbar" | "drawer";
};

function learnSegmentsFromPathname(pathname: string): string[] | null {
  if (!pathname.startsWith("/learn/")) return null;
  const parts = pathname.slice(1).split("/").filter(Boolean);
  if (parts[0] !== "learn") return null;
  return parts;
}

/**
 * **Bahasa pelajaran**: changing it navigates into `/learn/{code}` so the sidebar + URLs share one context,
 * persists `preferredStudyLanguageCode` on the User row plus a non-httpOnly mirror cookie `preferred_study_lang`.
 */
export function StudyLanguagePicker({
  preferredStudyLanguageCode,
  variant = "topbar",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const idSuffix = variant === "drawer" ? "-drawer" : "-topbar";

  const learnParts = learnSegmentsFromPathname(pathname);
  const rawFromPath = learnParts && typeof learnParts[1] === "string" ? learnParts[1] : null;
  const fromPath =
    rawFromPath && isStudyLanguageCode(rawFromPath) ? rawFromPath : null;

  const fallback: StudyLanguageCode =
    preferredStudyLanguageCode && isStudyLanguageCode(preferredStudyLanguageCode)
      ? preferredStudyLanguageCode
      : defaultStudyLangCode();

  const value: StudyLanguageCode = fromPath ?? fallback;

  const onChange = async (next: StudyLanguageCode) => {
    const dest =
      learnParts && learnParts[1] && isStudyLanguageCode(learnParts[1])
        ? urlAfterStudyLanguageChange(learnParts, next)
        : `/learn/${next}`;

    router.push(dest);

    await fetch("/api/study-language", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: next }),
      credentials: "include",
    });
    router.refresh();
  };

  return (
    <div className="study-lang-picker">
      <label htmlFor={`study-lang${idSuffix}`} className="study-lang-label">
        Bahasa pelajaran
      </label>
      <select
        id={`study-lang${idSuffix}`}
        aria-label="Bahasa pelajaran"
        value={value}
        onChange={(e) => void onChange(e.target.value as StudyLanguageCode)}
      >
        {STUDY_LANGUAGES.map((row) => (
          <option key={row.code} value={row.code}>
            {row.flag} {row.label}
          </option>
        ))}
      </select>
    </div>
  );
}
