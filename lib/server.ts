import { photoURL } from "./photos";
import { supabaseServer } from "./supabase/server";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function identity() {
  const s = await supabaseServer();
  const {
    data: { user },
    error,
  } = await s.auth.getUser();
  if (error || !user) return null;
  const { data: access, error: e } = await s.rpc("my_access");
  if (e) throw new Error("ACCESS_UNAVAILABLE");
  return {
    userId: user.id,
    email: user.email ?? "",
    displayName: String(
      user.user_metadata.full_name || user.email || "Minha conta",
    ),
    owner: access?.owner === true,
    barberId: access?.barber_id ?? null,
  };
}
export async function staff() {
  const u = await identity();
  if (!u) throw new HttpError(401, "Entre com Google para acessar o painel.");
  if (!u.owner && !u.barberId)
    throw new HttpError(403, "Sua conta não tem acesso à agenda da equipe.");
  return u;
}
export function result(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export function fail(e: unknown) {
  if (e instanceof HttpError) return result({ error: e.message }, e.status);
  console.error(
    "Santo Corte:",
    e instanceof Error ? e.message : "Unexpected failure",
  );
  return result(
    {
      error:
        e instanceof Error && e.message === "CONFIG_MISSING"
          ? "O sistema ainda precisa ser conectado ao Supabase. Consulte o guia de instalação."
          : "Não foi possível concluir. Tente novamente.",
    },
    503,
  );
}
export function requireValue(ok: unknown, message: string): asserts ok {
  if (!ok) throw new HttpError(400, message);
}
export async function payload(r: Request) {
  const origin = r.headers.get("origin"),
    expected = process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
      : new URL(r.url).origin;
  if (origin !== expected) throw new HttpError(403, "Origem inválida.");
  if (!r.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Formato inválido.");
  const raw = await r.text();
  if (raw.length > 16000) throw new HttpError(413, "Solicitação muito grande.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Dados inválidos.");
  }
}
export function dbError(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (error.code === "23P01" || error.code === "23505")
    throw new HttpError(
      409,
      "Este horário acabou de ser ocupado. Atualize a agenda.",
    );
  if (error.code === "P0001") throw new HttpError(400, error.message);
  if (error.code === "42501")
    throw new HttpError(403, "Acesso não autorizado.");
  throw new Error("DATABASE_UNAVAILABLE");
}
export const normalizeBarber = (b: any) => ({
  ...b,
  photo_url: photoURL(b.photo_path),
  active: b.active ? 1 : 0,
  service_ids: JSON.stringify(b.service_ids),
  schedule: JSON.stringify(b.schedule),
});
export const normalizeService = (s: any) => ({
  ...s,
  active: s.active ? 1 : 0,
});
export const normalizeBooking = (b: any) => ({
  ...b,
  date: b.day,
  start: b.start_min,
  end: b.end_min,
  barber_name: b.barbers?.name ?? b.barber_name ?? "",
});
