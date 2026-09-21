"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, Volume2, Smartphone } from "lucide-react";
export default function Notifications() {
  const [state, setState] = useState(""),
    [active, setActive] = useState(false),
    [busy, setBusy] = useState(false),
    [sound, setSound] = useState(false),
    [configured, setConfigured] = useState(true),
    [info, setInfo] = useState({ pending: 0, failed: 0 });
  const audio = useRef<AudioContext | null>(null),
    seen = useRef<Set<string> | null>(null),
    soundOn = useRef(false);
  async function api(body: unknown) {
    const r = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      d = await r.json();
    if (!r.ok) throw Error(d.error);
    return d;
  }
  async function setup() {
    setBusy(true);
    setState("");
    try {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      )
        throw Error(
          "Neste navegador, instale o site na tela inicial e tente novamente. No iPhone, use Safari e iOS 16.4 ou posterior.",
        );
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw Error(
          "Permita notificações nas configurações do navegador para receber os avisos.",
        );
      const r = await fetch("/api/push"),
        d = await r.json();
      if (!r.ok || !d.configured)
        throw Error(
          d.error ||
            "As chaves de notificações ainda precisam ser configuradas na Netlify.",
        );
      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const pad = "=".repeat((4 - (d.publicKey.length % 4)) % 4),
          raw = atob((d.publicKey + pad).replace(/-/g, "+").replace(/_/g, "/"));
        const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: bytes,
        });
      }
      await api({ action: "subscribe", subscription: sub.toJSON() });
      setActive(true);
      setState(
        "Avisos ativados neste aparelho. Use “Testar aviso” para conferir som e recebimento.",
      );
    } catch (e) {
      setState((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/"),
        sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await api({ action: "unsubscribe", endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setActive(false);
      setState("Avisos desativados neste aparelho.");
    } catch (e) {
      setState((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function beep() {
    const c = audio.current;
    if (!c || c.state !== "running") return;
    for (let i = 0; i < 2; i++) {
      const osc = c.createOscillator(),
        g = c.createGain(),
        t = c.currentTime + i * 0.25;
      osc.type = "sine";
      osc.frequency.value = 880;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.15, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    }
  }
  async function toggleSound() {
    try {
      if (soundOn.current) {
        soundOn.current = false;
        setSound(false);
        return;
      }
      if (!audio.current) audio.current = new AudioContext();
      await audio.current.resume();
      soundOn.current = true;
      setSound(true);
      beep();
    } catch {
      setState("O navegador não liberou áudio. Toque novamente em Ativar som.");
    }
  }
  useEffect(() => {
    let live = true;
    fetch("/api/push", { cache: "no-store" })
      .then((r) => r.json())
      .then(async (d) => {
        if (!live) return;
        setConfigured(!!d.configured);
        setInfo({ pending: d.pending || 0, failed: d.failed || 0 });
        if ("serviceWorker" in navigator && "PushManager" in window) {
          const reg = await navigator.serviceWorker.register("/sw.js"),
            sub = await reg.pushManager.getSubscription();
          if (sub && d.configured) {
            await api({ action: "subscribe", subscription: sub.toJSON() });
            if (live) setActive(true);
          }
        }
      })
      .catch(
        () =>
          live &&
          setState(
            "Não foi possível conferir os avisos. Tente ativar novamente.",
          ),
      );
    async function poll() {
      try {
        const r = await fetch("/api/activity", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (!live) return;
        const ids = new Set<string>(d.items.map((x: { id: string }) => x.id));
        if (
          seen.current &&
          d.items.some((x: { id: string }) => !seen.current!.has(x.id))
        ) {
          if (soundOn.current) beep();
          setState("Novo agendamento recebido. Confira a agenda.");
        }
        seen.current = ids;
      } catch {}
    }
    void poll();
    const timer = setInterval(poll, 15000);
    return () => {
      live = false;
      clearInterval(timer);
      void audio.current?.close();
      audio.current = null;
    };
  }, []);
  return (
    <section className="push-panel">
      <div>
        <Bell size={23} />
        <h2>AVISOS NO SEU CELULAR</h2>
        <span className="badge">
          {active ? "Ativos neste aparelho" : "Não ativados"}
        </span>
      </div>
      <p>
        Receba notificações de novos agendamentos, inclusive com o site fechado,
        nos aparelhos compatíveis.
      </p>
      {!configured && (
        <p className="notice">
          Configure as chaves VAPID e a chave de servidor do Supabase na
          Netlify.
        </p>
      )}
      <div className="action-row">
        <button
          className="action"
          disabled={busy || !configured}
          onClick={active ? disable : setup}
        >
          <Bell size={17} />
          {busy
            ? "Aguarde…"
            : active
              ? "Desativar avisos"
              : "Ativar avisos neste celular"}
        </button>
        <button
          className="action secondary"
          disabled={busy || !active}
          onClick={async () => {
            setBusy(true);
            try {
              const d = await api({ action: "test" });
              setState(
                d.processed
                  ? "Teste enviado. Confira a notificação do aparelho."
                  : "Teste na fila. A tentativa automática ocorre em até alguns minutos.",
              );
            } catch (e) {
              setState((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Testar aviso
        </button>
        <button className="action secondary" onClick={toggleSound}>
          <Volume2 size={17} />
          {sound ? "Desativar som do painel" : "Ativar som do painel"}
        </button>
      </div>
      {state && (
        <p role="status" className="notice">
          {state}
        </p>
      )}
      <details>
        <summary>
          <Smartphone size={16} /> Como instalar e ouvir os avisos
        </summary>
        <p>
          <strong>Android:</strong> abra no Chrome, use “Instalar app” ou
          “Adicionar à tela inicial” e permita notificações.
        </p>
        <p>
          <strong>iPhone:</strong> no Safari, toque em Compartilhar → Adicionar
          à Tela de Início. Abra pelo ícone instalado e ative os avisos (iOS
          16.4+).
        </p>
        <p>
          O volume, o modo silencioso, o Não Perturbe e a economia de bateria
          podem silenciar ou atrasar avisos. O site não consegue ignorar essas
          configurações. O som do painel funciona enquanto a página está aberta
          e o navegador permite áudio.
        </p>
        <p>
          O acesso à agenda exige internet. Avisos pendentes: {info.pending}.
          Falhas após tentativas: {info.failed}.
        </p>
      </details>
    </section>
  );
}
