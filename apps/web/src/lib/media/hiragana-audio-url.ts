import type { HiraganaItemPayload } from "@/lib/content/hiragana-payload";

import { cloudinaryAudioMp3Url } from "./cloudinary-delivery-url";

export function resolveHiraganaSampleAudioUrl(payload: HiraganaItemPayload): string | null {
  const p = payload;
  if (typeof p.sampleAudioUrl === "string" && /^https?:\/\//i.test(p.sampleAudioUrl.trim())) {
    return p.sampleAudioUrl.trim();
  }
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (cloud && typeof p.sampleAudioPublicId === "string" && p.sampleAudioPublicId.trim().length > 0) {
    return cloudinaryAudioMp3Url(cloud, p.sampleAudioPublicId.trim());
  }
  return null;
}
