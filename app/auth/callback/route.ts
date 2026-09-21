import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/security.mjs";
export async function GET(request: Request) {
  const u = new URL(request.url),
    origin = process.env.NEXT_PUBLIC_SITE_URL || u.origin,
    code = u.searchParams.get("code");
  if (code) {
    try {
      const s = await supabaseServer();
      const { error } = await s.auth.exchangeCodeForSession(code);
      if (!error) {
        await s.rpc("link_my_barber");
        return NextResponse.redirect(
          new URL(safeNext(u.searchParams.get("next")), origin),
        );
      }
    } catch {}
  }
  return NextResponse.redirect(new URL("/entrar?erro=1", origin));
}
