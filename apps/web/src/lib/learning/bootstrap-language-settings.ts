import { prisma } from "@/lib/prisma";
import {
  defaultStudyLangCode,
  isStudyLanguageCode,
  STUDY_LANGUAGES,
  type StudyLanguageCode,
} from "@/lib/study-languages";

const studyCodes = STUDY_LANGUAGES.map((l) => l.code);

/**
 * Ensures the user's preferred study language has a settings row with onboarding defaults.
 * Does not downgrade existing flags (only creates missing rows).
 */
export async function ensurePreferredLanguageSettingsRow(
  userId: string,
  preferredStudyLanguageCode: string | null,
): Promise<void> {
  const code: StudyLanguageCode =
    preferredStudyLanguageCode && isStudyLanguageCode(preferredStudyLanguageCode)
      ? preferredStudyLanguageCode
      : defaultStudyLangCode();

  const language = await prisma.language.findUnique({
    where: { code },
    select: { id: true },
  });
  if (!language) return;

  await prisma.userLanguageSettings.upsert({
    where: {
      userId_languageId: { userId, languageId: language.id },
    },
    create: {
      userId,
      languageId: language.id,
      isStudying: true,
      includeInTotalProgress: true,
    },
    update: {},
  });
}

/**
 * Creates missing `UserLanguageSettings` untuk semua bahasa di `STUDY_LANGUAGES` yang ada di DB
 * supaya checkbox progress gabungan konsisten sejak awal (Fase F / Fase I).
 */
export async function ensureAllStudyLanguageSettingsRows(userId: string): Promise<void> {
  const langs = await prisma.language.findMany({
    where: { code: { in: [...studyCodes] } },
    select: { id: true },
  });

  for (const lang of langs) {
    await prisma.userLanguageSettings.upsert({
      where: {
        userId_languageId: { userId, languageId: lang.id },
      },
      create: {
        userId,
        languageId: lang.id,
        isStudying: true,
        includeInTotalProgress: true,
      },
      update: {},
    });
  }
}
