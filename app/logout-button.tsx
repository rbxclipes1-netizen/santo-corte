"use client";
import { useState } from "react";
export default function Logout() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="mini-button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          if ("serviceWorker" in navigator) {
            const reg = await navigator.serviceWorker.getRegistration("/"),
              sub = await reg?.pushManager.getSubscription();
            if (sub) {
              await fetch("/api/push", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "unsubscribe",
                  endpoint: sub.endpoint,
                }),
              });
              await sub.unsubscribe();
            }
          }
          const r = await fetch("/api/logout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          });
          if (!r.ok) throw Error("Não foi possível sair.");
          window.location.href = "/";
        } catch {
          setBusy(false);
        }
      }}
    >
      {busy ? "Saindo…" : "Sair da conta"}
    </button>
  );
}
