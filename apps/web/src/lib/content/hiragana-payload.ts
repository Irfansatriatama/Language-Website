/** Hiragana character row stored in ContentItem.payload (seed + importer). */
export type HiraganaItemPayload = {
  char: string;
  romaji: string;
  group: string;
  type: string;
  base?: string;
  example?: { word: string; reading: string; meaning: string };
  /** Full HTTPS URL (e.g. Cloudinary `video/upload/...mp3`) */
  sampleAudioUrl?: string;
  /** Public ID under your Cloudinary cloud; client builds URL if NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is set */
  sampleAudioPublicId?: string;
};
