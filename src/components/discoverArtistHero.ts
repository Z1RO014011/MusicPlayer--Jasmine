const IMAGE_URL_RE = /^url\((['"]?)(.*?)\1\)/i;

interface ArtistArtworkCandidate {
  id?: number;
  name?: string;
  picUrl?: string;
}

export function extractImageUrlFromCoverColor(coverColor: string | undefined | null): string | null {
  if (!coverColor) return null;

  const match = coverColor.trim().match(IMAGE_URL_RE);
  return match?.[2]?.trim() || null;
}

export function hasImageCoverBackground(coverColor: string | undefined | null): boolean {
  return extractImageUrlFromCoverColor(coverColor) !== null;
}

export function shouldHydrateArtistArtwork(artist: ArtistArtworkCandidate | null | undefined): boolean {
  return Boolean(artist?.id && !artist.picUrl);
}
