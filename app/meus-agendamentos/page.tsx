"use client";
import { useEffect, useState } from "react";
import { money, time } from "@/lib/catalog";
import Logout from "@/app/logout-button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
export default function MyBookings() {
  const [bookings, setBookings] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [login, setLogin] = useState(false),
    [cancel, setCancel] = useState<any>(null),
    [busy, setBusy] = useState(false);
  async function load() {
    setError("");
    try {
      const r = await fetch("/api/me", { cache: "no-store" }),
        d = await r.json();
      if (r.status === 401) {
        setLogin(true);
        return;
      }
      if (!r.ok) throw Error(d.error);
      setBookings(d.bookings);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="system">
      <header className="sys-header">
        <a className="wordmark" href="/"><span className="official-logo"><img src="/logo-santo-corte.png" alt="Santo Corte Barbearia" width={1450} height={1088} /></span></a>
        <Logout />
      </header>
      <main className="booking-shell">
        <div className="eyebrow">SUA CONTA</div>
        <h1>
          SEUS PRÓXIMOS
          <br />
          <span>MOMENTOS.</span>
        </h1>
        <a className="action" href="/agendar">
          Novo agendamento
        </a>
        {error && (
          <p role="alert" className="notice error">
            {error}
            <button onClick={load}>Tentar novamente</button>
          </p>
        )}
        {loading ? (
          <p className="notice">Carregando…</p>
        ) : login ? (
          <div className="empty-panel">
            <h2>Entre para ver seus horários</h2>
            <a className="action" href="/entrar?next=%2Fmeus-agendamentos">
              Entrar com Google
            </a>
          </div>
        ) : !bookings.length ? (
          <div className="empty-panel">
            <h2>Seu primeiro horário começa aqui</h2>
            <p>Você ainda não tem agendamentos.</p>
          </div>
        ) : (
          <div className="appointment-list">
            {bookings.map((b) => (
              <article
                className={
                  "appointment " + (b.status === "cancelled" ? "cancelled" : "")
                }
                key={b.id}
              >
                <div className="appointment-time">
                  {time(b.start)}
                  <small>{b.date.split("-").reverse().join("/")}</small>
                </div>
                <div className="appointment-main">
                  <span className="badge">
                    {b.status === "confirmed"
                      ? "Confirmado"
                      : b.status === "completed"
                        ? "Concluído"
                        : "Cancelado"}
                  </span>
                  <h3>{b.service_name}</h3>
                  <p>
                    {b.barber_name} · {b.end - b.start} minutos
                  </p>
                  <p>{money(b)}</p>
                </div>
                {b.status === "confirmed" && (
                  <button
                    className="mini-button danger"
                    onClick={() => setCancel(b)}
                  >
                    Cancelar
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
      <AlertDialog
        open={!!cancel}
        onOpenChange={(v) => {
          if (!v) setCancel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar seu agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancel?.service_name} ·{" "}
              {cancel?.date?.split("-").reverse().join("/")} às{" "}
              {cancel && time(cancel.start)}. O horário ficará disponível para
              outra pessoa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter horário</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await fetch("/api/me", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: cancel.id }),
                    }),
                    d = await r.json();
                  if (!r.ok) throw Error(d.error);
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                  setCancel(null);
                }
              }}
            >
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
