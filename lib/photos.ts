export const PHOTO_BUCKET = "barber-photos";
export const PHOTO_LIMIT = 5 * 1024 * 1024;
export function photoURL(path?: string | null) {
  if (!path || !/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(path))
    return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base
    ? `${base.replace(/\/$/, "")}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`
    : null;
}
