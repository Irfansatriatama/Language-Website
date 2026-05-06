/**
 * Build a public (unsigned) Cloudinary delivery URL for audio delivered as MP3.
 * @see https://cloudinary.com/documentation/audio_optimization
 */
export function cloudinaryAudioMp3Url(cloudName: string, publicId: string): string {
  const trimmed = publicId.replace(/^\/+/, "").replace(/\.mp3$/i, "");
  return `https://res.cloudinary.com/${cloudName}/video/upload/${trimmed}.mp3`;
}
