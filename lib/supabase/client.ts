"use client";
import { createBrowserClient } from "@supabase/ssr";
export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw Error("O login ainda não foi configurado.");
  return createBrowserClient(url, key);
}
