"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { safeNext } from "@/lib/security.mjs";
export default function Login() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function login() {
    setBusy(true);
    setError("");
    try {
      const next = safeNext(
        new URLSearchParams(window.location.search).get("next"),
      );
      const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error } = await supabaseBrowser().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            origin + "/auth/callback?next=" + encodeURIComponent(next),
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="system gate">
      <a className="wordmark" href="/"><span className="official-logo"><img src="/logo-santo-corte.png" alt="Santo Corte Barbearia" width={1450} height={1088} /></span></a>
      <h1>
        SEU MOMENTO.
        <br />
        <span>SUA CONTA.</span>
      </h1>
      <p>
        Entre com Google para confirmar seus horários ou acessar a agenda da
        equipe.
      </p>
      <button className="google-button" onClick={login} disabled={busy}>
        {busy ? "Abrindo Google…" : "Continuar com Google"}
      </button>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <p className="fineprint">
        Se a tentativa anterior não foi concluída, toque novamente para entrar.
        Usamos seu nome e e-mail para identificar sua conta.
      </p>
      <a href="/">Voltar ao site</a>
    </main>
  );
}
