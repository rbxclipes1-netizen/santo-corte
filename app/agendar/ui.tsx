"use client";
import BarberPhoto from "@/components/barber-photo";
import { useEffect, useState, useRef } from "react";
import {
  Scissors,
  ArrowLeft,
  ArrowRight,
  Clock,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { money, time, today, type Service, type Barber } from "@/lib/catalog";
export default function Booking() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(
      null,
    ),
    [clientName, setClientName] = useState(""),
    [phone, setPhone] = useState(""),
    [saving, setSaving] = useState(false),
    [confirmation, setConfirmation] = useState<any>(null);
  const key = useRef(""),
    restore = useRef<number | null>(null);
  const [services, setServices] = useState<Service[]>([]),
    [barbers, setBarbers] = useState<Barber[]>([]),
    [service, setService] = useState(""),
    [barber, setBarber] = useState(""),
    [date, setDate] = useState(""),
    [slot, setSlot] = useState<number | null>(null),
    [slots, setSlots] = useState<number[]>([]),
    [step, setStep] = useState(1),
    [loading, setLoading] = useState(true),
    [slotLoading, setSlotLoading] = useState(false),
    [error, setError] = useState(""),
    [owner, setOwner] = useState(false),
    [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    fetch("/api/catalog", { cache: "no-store" })
      .then(async (r) => {
        const d = (await r.json()) as {
          error: string;
          services: Service[];
          barbers: Barber[];
          owner: boolean;
          user: { name: string; email: string } | null;
          slots: number[];
        };
        if (!r.ok) throw Error(d.error);
        if (live) {
          setServices(d.services);
          setBarbers(d.barbers);
          setOwner(d.owner);
          setUser(d.user);
          setClientName(d.user?.name || "");
          const q = new URLSearchParams(window.location.search);
          setDate(q.get("date") || today());
          if (d.barbers.some((x) => x.id === q.get("barber")))
            setBarber(q.get("barber")!);
          if (d.services.some((x) => x.id === q.get("service"))) {
            setService(q.get("service")!);
            if (d.barbers.some((x) => x.id === q.get("barber"))) {
              setBarber(q.get("barber")!);
              const n = Number(q.get("time"));
              restore.current = q.has("time") && Number.isInteger(n) ? n : null;
            }
            setStep(2);
          }
        }
      })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [reload]);
  useEffect(() => {
    setSlot(null);
    setSlots([]);
    if (!barber || !service || !date) return;
    const c = new AbortController();
    setSlotLoading(true);
    setError("");
    fetch(
      `/api/slots?barber=${encodeURIComponent(barber)}&service=${encodeURIComponent(service)}&date=${date}`,
      { signal: c.signal, cache: "no-store" },
    )
      .then(async (r) => {
        const d = (await r.json()) as {
          error: string;
          services: Service[];
          barbers: Barber[];
          owner: boolean;
          user: { name: string; email: string } | null;
          slots: number[];
        };
        if (!r.ok) throw Error(d.error);
        setSlots(d.slots);
        if (restore.current !== null && d.slots.includes(restore.current)) {
          setSlot(restore.current);
          setStep(3);
        }
        restore.current = null;
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setSlotLoading(false);
      });
    return () => c.abort();
  }, [barber, service, date]);
  useEffect(() => {
    key.current = crypto.randomUUID();
  }, [service, barber, date, slot, clientName, phone]);
  async function confirm() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service,
            barber,
            date,
            start: slot,
            name: clientName,
            phone,
            key: key.current,
          }),
        }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      setConfirmation(d.reservation);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(1);
  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step;
      stepHeading.current?.focus({ preventScroll: true });
      stepHeading.current?.scrollIntoView({ block: "start", behavior: "auto" });
    }
  }, [step]);
  const selected = services.find((s) => s.id === service),
    professional = barbers.find((b) => b.id === barber),
    available = barbers.filter((b) =>
      JSON.parse(b.service_ids).includes(service),
    );
  return (
    <div className="system">
      <header className="sys-header">
        <a className="wordmark" href="/">
          <span className="official-logo">
            <img
              src="/logo-santo-corte.png"
              alt="Santo Corte Barbearia"
              width={1450}
              height={1088}
            />
          </span>
        </a>
        <a href="/meus-agendamentos" className="quiet-link">
          Meus agendamentos ↗
        </a>
      </header>
      <main className="booking-shell">
        <div className="eyebrow">SEU PRÓXIMO MOMENTO</div>
        <h1>
          SEU ESTILO.
          <br />
          <span>NO SEU HORÁRIO.</span>
        </h1>
        <p className="intro">
          Escolha o serviço, encontre seu horário e confirme com Google.
        </p>
        <ol className="progress-steps" aria-label="Etapas do agendamento">
          {["Serviço", "Profissional e horário", "Confirmação"].map((s, i) => (
            <li
              key={s}
              aria-current={step === i + 1 ? "step" : undefined}
              className={step >= i + 1 ? "current" : ""}
            >
              <span>{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <div className="booking-layout">
          <div className="booking-main">
            {error && (
              <div role="alert" className="notice error">
                {error}{" "}
                <button onClick={() => setReload((x) => x + 1)}>
                  Tentar novamente
                </button>
              </div>
            )}
            {loading ? (
              <p role="status" className="notice">
                Carregando serviços…
              </p>
            ) : (
              <>
                {step === 1 && (
                  <>
                    <h2 ref={stepHeading} tabIndex={-1}>
                      01. Escolha seu serviço
                    </h2>
                    {professional && (
                      <div className="selected-professional">
                        <BarberPhoto
                          name={professional.name}
                          src={professional.photo_url}
                        />
                        <div>
                          <small>Você escolheu</small>
                          <strong>{professional.name}</strong>
                        </div>
                        <button
                          className="mini-button"
                          onClick={() => {
                            setBarber("");
                            setService("");
                          }}
                        >
                          Trocar profissional
                        </button>
                      </div>
                    )}
                    <RadioGroup
                      value={service}
                      onValueChange={(v) => {
                        setService(v);
                        if (
                          professional &&
                          !JSON.parse(professional.service_ids).includes(v)
                        )
                          setBarber("");
                        setSlot(null);
                      }}
                      className="service-grid"
                      aria-label="Serviço"
                    >
                      {services
                        .filter(
                          (s) =>
                            !professional ||
                            JSON.parse(professional.service_ids).includes(s.id),
                        )
                        .map((s) => (
                          <label
                            className={
                              "service-card " +
                              (service === s.id ? "selected" : "")
                            }
                            key={s.id}
                          >
                            <div className="service-card-top">
                              <Scissors size={24} />
                              <RadioGroupItem value={s.id} id={s.id} />
                            </div>
                            <h3>{s.name}</h3>
                            <p>
                              <Clock size={14} /> {s.duration} min
                            </p>
                            <strong>{money(s)}</strong>
                          </label>
                        ))}
                    </RadioGroup>
                    <button
                      className="action"
                      disabled={!selected}
                      onClick={() => setStep(2)}
                    >
                      Escolher profissional e horário <ArrowRight size={18} />
                    </button>
                    <p className="fineprint">
                      Valores “a partir de” e “sob consulta” são confirmados com
                      a barbearia. Não há pagamento online nesta etapa.
                    </p>
                  </>
                )}
                {step === 2 && (
                  <>
                    <h2 ref={stepHeading} tabIndex={-1}>
                      02. Profissional e horário
                    </h2>
                    {!available.length ? (
                      <div className="empty-panel">
                        <Scissors size={32} />
                        <h3>A agenda está em preparação</h3>
                        <p>
                          Nenhum profissional disponível para este serviço no
                          momento.
                        </p>
                        {owner && (
                          <a className="action secondary" href="/painel">
                            Cadastrar equipe no painel ↗
                          </a>
                        )}
                      </div>
                    ) : (
                      <>
                        <p className="field-label">
                          Com quem você quer marcar?
                        </p>
                        <RadioGroup
                          value={barber}
                          onValueChange={setBarber}
                          className="professional-grid"
                          aria-label="Escolha o profissional"
                        >
                          {available.map((b) => (
                            <label
                              key={b.id}
                              className={`professional-option${barber === b.id ? " selected" : ""}`}
                            >
                              <BarberPhoto name={b.name} src={b.photo_url} />
                              <span className="professional-option-name">
                                {b.name}
                                <small>
                                  {barber === b.id
                                    ? "Selecionado"
                                    : "Selecionar profissional"}
                                </small>
                              </span>
                              <RadioGroupItem
                                value={b.id}
                                aria-label={b.name}
                              />
                            </label>
                          ))}
                        </RadioGroup>
                        <label className="field-label" htmlFor="date">
                          Data
                        </label>
                        <input
                          id="date"
                          type="date"
                          value={date}
                          min={today()}
                          onChange={(e) => setDate(e.target.value)}
                        />
                        <p className="fineprint">Horário de Brasília</p>
                        {slotLoading ? (
                          <p role="status">Consultando horários…</p>
                        ) : (
                          barber && (
                            <>
                              <label className="field-label">
                                Horários disponíveis
                              </label>
                              {slots.length ? (
                                <RadioGroup
                                  className="slot-grid"
                                  value={slot === null ? "" : String(slot)}
                                  onValueChange={(v) => setSlot(Number(v))}
                                  aria-label="Horário"
                                >
                                  {slots.map((n) => (
                                    <label
                                      className={
                                        "slot " + (slot === n ? "selected" : "")
                                      }
                                      key={n}
                                    >
                                      <RadioGroupItem value={String(n)} />
                                      {time(n)}
                                    </label>
                                  ))}
                                </RadioGroup>
                              ) : (
                                <p className="notice">
                                  Nenhum horário disponível nesta data. Tente
                                  outro dia.
                                </p>
                              )}
                            </>
                          )
                        )}
                      </>
                    )}
                    <div className="action-row">
                      <button
                        className="action secondary"
                        onClick={() => setStep(1)}
                      >
                        Voltar
                      </button>
                      <button
                        className="action"
                        disabled={slot === null || !barber}
                        onClick={() => setStep(3)}
                      >
                        Revisar agendamento <ArrowRight size={18} />
                      </button>
                    </div>
                  </>
                )}
                {step === 3 && (
                  <>
                    <h2 ref={stepHeading} tabIndex={-1}>
                      03. Confirme seu momento
                    </h2>
                    <div className="review-card">
                      {professional && (
                        <div className="review-professional">
                          <BarberPhoto
                            name={professional.name}
                            src={professional.photo_url}
                          />
                          <span>
                            Seu atendimento com{" "}
                            <strong>{professional.name}</strong>
                          </span>
                        </div>
                      )}
                      <h3>{selected?.name}</h3>
                      <p>
                        {professional?.name} ·{" "}
                        {date.split("-").reverse().join("/")} às{" "}
                        {slot !== null ? time(slot) : ""}
                      </p>
                      <strong>{selected && money(selected)}</strong>
                    </div>
                    {confirmation ? (
                      <div className="confirmation">
                        <ShieldCheck size={36} />
                        <h3>Seu horário está confirmado!</h3>
                        <p>
                          {date.split("-").reverse().join("/")} às{" "}
                          {slot !== null ? time(slot) : ""} ·{" "}
                          {professional?.name}
                        </p>
                        <p>O agendamento já está na agenda do profissional.</p>
                        <a className="action" href="/meus-agendamentos">
                          Ver meus agendamentos
                        </a>
                      </div>
                    ) : user ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void confirm();
                        }}
                      >
                        <p className="fineprint">Conectado como {user.email}</p>
                        <label className="field-label" htmlFor="customer-name">
                          Nome de quem será atendido
                        </label>
                        <input
                          id="customer-name"
                          required
                          minLength={2}
                          maxLength={100}
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                        />
                        <label className="field-label" htmlFor="customer-phone">
                          Telefone com DDD
                        </label>
                        <input
                          id="customer-phone"
                          type="tel"
                          required
                          minLength={10}
                          maxLength={25}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                        <p className="fineprint">
                          Confira os dados. A confirmação será automática se o
                          horário continuar livre. Se precisar cancelar, avise
                          com antecedência em Meus agendamentos.
                        </p>
                        <div className="action-row">
                          <button className="action" disabled={saving}>
                            {saving
                              ? "Confirmando…"
                              : "Confirmar meu agendamento"}
                          </button>
                          <button
                            type="button"
                            className="action secondary"
                            disabled={saving}
                            onClick={() => setStep(2)}
                          >
                            Alterar horário
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <a
                          className="google-button"
                          href={
                            "/entrar?next=" +
                            encodeURIComponent(
                              "/agendar?service=" +
                                service +
                                "&barber=" +
                                barber +
                                "&date=" +
                                date +
                                "&time=" +
                                slot,
                            )
                          }
                        >
                          Continuar com Google
                        </a>
                        <p className="fineprint">
                          Após entrar, você revisa e confirma. A escolha do
                          horário não é uma reserva.
                        </p>
                        <button
                          className="action secondary"
                          onClick={() => setStep(2)}
                        >
                          Alterar horário
                        </button>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
          <aside className="summary">
            <span className="eyebrow">SUA EXPERIÊNCIA</span>
            <h2>SANTO CORTE</h2>
            <p>
              <MapPin size={16} /> Canaã, Ipatinga
            </p>
            <dl>
              <div>
                <dt>Serviço</dt>
                <dd>{selected?.name || "Escolha um serviço"}</dd>
              </div>
              {selected && (
                <div>
                  <dt>Duração</dt>
                  <dd>{selected.duration} minutos</dd>
                </div>
              )}
              {professional && (
                <div>
                  <dt>Profissional</dt>
                  <dd className="summary-professional">
                    <BarberPhoto
                      name={professional.name}
                      src={professional.photo_url}
                    />
                    {professional.name}
                  </dd>
                </div>
              )}
              {slot !== null && (
                <div>
                  <dt>Quando</dt>
                  <dd>
                    {date.split("-").reverse().join("/")} · {time(slot)}
                  </dd>
                </div>
              )}
              <div className="summary-price">
                <dt>Valor</dt>
                <dd>{selected ? money(selected) : "—"}</dd>
              </div>
            </dl>
            <p className="fineprint">
              Av. Galiléia, 496 · Canaã
              <br />
              Tolerância de atraso: 10 minutos.
            </p>
            <div className="summary-note">
              Confirmação automática, sem esperar aprovação.
            </div>
          </aside>
        </div>
      </main>
      <footer className="sys-footer">
        Santo Corte Barbearia <a href="/painel">Área da equipe ↗</a>
      </footer>
    </div>
  );
}
