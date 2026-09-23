"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import BarberPhoto from "@/components/barber-photo";
import PhotoEditor from "@/components/photo-editor";
import { PHOTO_BUCKET, PHOTO_LIMIT, photoURL } from "@/lib/photos";
import { supabaseBrowser } from "@/lib/supabase/client";
import Notifications from "./notifications";
import Logout from "@/app/logout-button";
import {
  CalendarDays,
  Scissors,
  Users,
  Plus,
  RefreshCw,
  LockKeyhole,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  defaultSchedule,
  money,
  time,
  minute,
  today,
  type Service,
  type Barber,
  type Shift,
} from "@/lib/catalog";
type Reservation = {
  id: string;
  barber_id: string;
  barber_name: string;
  service_name: string;
  customer_name: string;
  phone: string;
  start: number;
  end: number;
  status: string;
  kind: string;
  price: number | null;
  price_kind: string;
};
type Data = {
  owner: boolean;
  name: string;
  services: Service[];
  barbers: Barber[];
  bookings: Reservation[];
};
function Choice({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (s: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="sys-select" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="check-label">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
      />
      {label}
    </label>
  );
}
const newService: Service = {
  id: "",
  name: "",
  duration: 30,
  price: null,
  price_kind: "consult",
  active: 1,
  note: "",
};
const freshBarber = () => ({
  photo_path: null as string | null,
  id: "",
  name: "",
  email: "",
  active: 1,
  services: [] as string[],
  schedule: defaultSchedule.map((s) => ({ ...s })),
});
export default function Dashboard({ owner }: { owner: boolean }) {
  const [date, setDate] = useState(""),
    [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState("all"),
    [service, setService] = useState<Service | null>(null),
    [barber, setBarber] = useState<ReturnType<typeof freshBarber> | null>(null),
    [cancel, setCancel] = useState<Reservation | null>(null),
    [reserve, setReserve] = useState(false),
    [kind, setKind] = useState("manual"),
    [reserveBarber, setReserveBarber] = useState(""),
    [reserveService, setReserveService] = useState(""),
    [start, setStart] = useState("09:00"),
    [duration, setDuration] = useState(60),
    [client, setClient] = useState(""),
    [phone, setPhone] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoChecking, setPhotoChecking] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoLock = useRef(false);
  const requestKey = useRef("");
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!date) return;
    const seq = ++sequence.current;
    try {
      const r = await fetch("/api/admin?date=" + date, { cache: "no-store" }),
        d = (await r.json()) as Data & { error: string };
      if (!r.ok) throw Error(d.error);
      if (seq === sequence.current) {
        setData(d);
        setError("");
      }
    } catch (e) {
      if (seq === sequence.current) setError((e as Error).message);
    } finally {
      if (seq === sequence.current) setLoading(false);
    }
  }, [date]);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("date");
    setDate(q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : today());
  }, []);
  useEffect(() => {
    setLoading(true);
    void refresh();
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, [refresh]);
  async function send(body: unknown, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        d = (await r.json()) as Data & { error: string };
      if (!r.ok) throw Error(d.error);
      setMessage(success);
      await refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function editBarber(next: ReturnType<typeof freshBarber> | null) {
    if (photoLock.current || photoChecking) return;
    setPhotoFile(null);
    setPhotoError("");
    setBarber(next);
  }
  async function saveBarber() {
    if (!barber || photoLock.current || busy || photoChecking) return;
    photoLock.current = true;
    setPhotoBusy(true);
    setPhotoError("");
    let uploaded: string | null = null;
    try {
      const client = supabaseBrowser();
      const originalPath =
        data?.barbers.find((b) => b.id === barber.id)?.photo_path || null;
      let path = barber.photo_path;
      if (photoFile) {
        const extensions: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        };
        const ext = extensions[photoFile.type];
        if (!ext || photoFile.size > PHOTO_LIMIT)
          throw Error("Use JPG, PNG ou WebP com até 5 MB.");
        const {
          data: { user },
          error: authError,
        } = await client.auth.getUser();
        if (authError || !user)
          throw Error(
            "Sua sessão expirou. Entre novamente para enviar a foto.",
          );
        path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await client.storage
          .from(PHOTO_BUCKET)
          .upload(path, photoFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: photoFile.type,
          });
        if (uploadError)
          throw Error(
            "Não foi possível enviar a foto. Confira a conexão e se a atualização de fotos foi configurada no Supabase.",
          );
        uploaded = path;
      }
      if (
        await send(
          { action: "barber", barber: { ...barber, photo_path: path } },
          "Profissional salvo.",
        )
      ) {
        if (originalPath && originalPath !== path)
          await client.storage
            .from(PHOTO_BUCKET)
            .remove([originalPath])
            .catch(() => {});
        setBarber(null);
        setPhotoFile(null);
      } else {
        if (uploaded)
          await client.storage
            .from(PHOTO_BUCKET)
            .remove([uploaded])
            .catch(() => {});
        setPhotoError(
          "O cadastro não foi salvo. Confira a mensagem acima e tente novamente.",
        );
      }
    } catch (e) {
      setPhotoError((e as Error).message);
    } finally {
      photoLock.current = false;
      setPhotoBusy(false);
    }
  }
  useEffect(() => {
    requestKey.current = crypto.randomUUID();
  }, [
    reserveBarber,
    reserveService,
    kind,
    date,
    start,
    duration,
    client,
    phone,
  ]);
  const activeBookings = (data?.bookings || []).filter(
    (x) => filter === "all" || x.barber_id === filter,
  );
  const services = data?.services || [],
    barbers = data?.barbers || [];
  const currentBarber = barbers.find((b) => b.id === reserveBarber);
  const permittedServices = services.filter(
    (s) =>
      s.active &&
      currentBarber &&
      JSON.parse(currentBarber.service_ids).includes(s.id),
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
        <div className="action-row" style={{ margin: 0 }}>
          <a href="/agendar" className="quiet-link">
            Ver agendamento <ArrowUpRight size={16} />
          </a>
          <Logout />
        </div>
      </header>
      <main className="dashboard">
        <div className="dashboard-heading">
          <div>
            <span className="eyebrow">ÁREA DA EQUIPE</span>
            <h1>
              {owner ? "SUA BARBEARIA." : "SUA AGENDA."}
              <br />
              <span>SOB CONTROLE.</span>
            </h1>
          </div>
          <div className="account-label">
            <LockKeyhole size={16} />
            {owner ? "Administrador" : "Profissional"}
            <small>{data?.name}</small>
          </div>
        </div>
        <Notifications />
        {error && (
          <div role="alert" className="notice error">
            {error}
            <button onClick={refresh}>Atualizar</button>
          </div>
        )}
        {message && (
          <p role="status" className="notice success">
            <Check size={18} />
            {message}
          </p>
        )}
        <Tabs defaultValue="agenda">
          <TabsList className="admin-tabs">
            <TabsTrigger value="agenda">
              <CalendarDays size={18} /> Agenda
            </TabsTrigger>
            {owner && (
              <>
                <TabsTrigger value="services">
                  <Scissors size={18} /> Serviços
                </TabsTrigger>
                <TabsTrigger value="team">
                  <Users size={18} /> Equipe
                </TabsTrigger>
              </>
            )}
          </TabsList>
          <TabsContent value="agenda">
            <div className="toolbar">
              <label>
                Data
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setReserve(false);
                  }}
                />
              </label>
              <div>
                <span className="field-label">Profissional</span>
                <Choice
                  value={filter}
                  onChange={setFilter}
                  label="Filtrar profissional"
                  options={[
                    {
                      value: "all",
                      label: owner ? "Toda a equipe" : "Minha agenda",
                    },
                    ...barbers.map((b) => ({ value: b.id, label: b.name })),
                  ]}
                />
              </div>
              <button
                className="icon-button"
                onClick={refresh}
                aria-label="Atualizar agenda"
              >
                <RefreshCw size={18} />
              </button>
              <button
                className="action"
                disabled={!barbers.some((b) => b.active)}
                onClick={() => {
                  setReserve(!reserve);
                  requestKey.current = crypto.randomUUID();
                  setReserveBarber(barbers.find((b) => b.active)?.id || "");
                  setReserveService("");
                  setClient("");
                  setPhone("");
                }}
              >
                <Plus size={18} /> Adicionar à agenda
              </button>
            </div>
            {reserve && (
              <form
                className="editor"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await send(
                      {
                        action: "reserve",
                        kind,
                        barber: reserveBarber,
                        service: reserveService,
                        date,
                        start: minute(start),
                        duration,
                        name: client,
                        phone,
                        key: requestKey.current,
                      },
                      kind === "block"
                        ? "Horário bloqueado."
                        : "Agendamento confirmado e salvo.",
                    )
                  )
                    setReserve(false);
                }}
              >
                <h2>
                  {kind === "block" ? "Bloquear horário" : "Novo agendamento"}
                </h2>
                <div className="form-grid">
                  <label>
                    Tipo
                    <Choice
                      value={kind}
                      onChange={setKind}
                      label="Tipo"
                      options={[
                        { value: "manual", label: "Agendamento manual" },
                        { value: "block", label: "Bloqueio / intervalo" },
                      ]}
                    />
                  </label>
                  <label>
                    Profissional
                    <Choice
                      value={reserveBarber}
                      onChange={(v) => {
                        setReserveBarber(v);
                        setReserveService("");
                      }}
                      label="Profissional"
                      options={barbers
                        .filter((b) => b.active)
                        .map((b) => ({ value: b.id, label: b.name }))}
                    />
                  </label>
                  {kind === "manual" ? (
                    <label>
                      Serviço
                      <Choice
                        value={reserveService}
                        onChange={setReserveService}
                        label="Serviço"
                        options={permittedServices.map((s) => ({
                          value: s.id,
                          label: s.name + " · " + s.duration + " min",
                        }))}
                      />
                    </label>
                  ) : (
                    <label>
                      Duração (minutos)
                      <input
                        type="number"
                        min="15"
                        max="720"
                        step="15"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                      />
                    </label>
                  )}
                  <label>
                    Início
                    <input
                      type="time"
                      step="900"
                      required
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </label>
                  <label>
                    {kind === "block"
                      ? "Motivo do bloqueio"
                      : "Nome do cliente"}
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                    />
                  </label>
                  {kind === "manual" && (
                    <label>
                      Telefone
                      <input
                        type="tel"
                        required
                        value={phone}
                        maxLength={25}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </label>
                  )}
                </div>
                <p className="fineprint">
                  {date.split("-").reverse().join("/")} · Horário de Brasília. A
                  reserva é confirmada automaticamente se o horário estiver
                  livre.
                </p>
                <div className="action-row">
                  <button
                    type="submit"
                    className="action"
                    disabled={busy || (kind === "manual" && !reserveService)}
                  >
                    {busy ? "Salvando…" : "Salvar na agenda"}
                  </button>
                  <button
                    type="button"
                    className="action secondary"
                    onClick={() => setReserve(false)}
                  >
                    Fechar
                  </button>
                </div>
              </form>
            )}
            <div className="stats">
              <div>
                <span>AGENDAMENTOS</span>
                <strong>
                  {
                    activeBookings.filter(
                      (x) => x.kind !== "block" && x.status === "confirmed",
                    ).length
                  }
                </strong>
              </div>
              <div>
                <span>CONCLUÍDOS</span>
                <strong>
                  {
                    activeBookings.filter((x) => x.status === "completed")
                      .length
                  }
                </strong>
              </div>
              <div>
                <span>BLOQUEIOS</span>
                <strong>
                  {
                    activeBookings.filter(
                      (x) => x.kind === "block" && x.status !== "cancelled",
                    ).length
                  }
                </strong>
              </div>
            </div>
            {loading ? (
              <p className="notice" role="status">
                Carregando agenda…
              </p>
            ) : !activeBookings.length ? (
              <div className="empty-panel">
                <CalendarDays size={36} />
                <h2>
                  {barbers.length
                    ? "Agenda livre neste dia"
                    : "Vamos preparar sua equipe"}
                </h2>
                <p>
                  {barbers.length
                    ? "Os agendamentos aparecerão aqui, organizados por horário."
                    : "Cadastre os profissionais na aba Equipe para abrir os horários."}
                </p>
              </div>
            ) : (
              <div className="appointment-list">
                {activeBookings.map((b) => (
                  <article
                    key={b.id}
                    className={
                      "appointment " +
                      (b.status === "cancelled" ? "cancelled" : "")
                    }
                  >
                    <div className="appointment-time">
                      {time(b.start)}
                      <small>até {time(b.end)}</small>
                    </div>
                    <div className="appointment-main">
                      <span className={"badge " + b.status}>
                        {b.status === "cancelled"
                          ? "Cancelado"
                          : b.status === "completed"
                            ? "Concluído"
                            : b.kind === "block"
                              ? "Bloqueado"
                              : "Confirmado"}
                      </span>
                      <h3>{b.customer_name}</h3>
                      <p>
                        {b.service_name} · {b.barber_name}
                      </p>
                      {b.phone && (
                        <a href={"tel:" + b.phone.replace(/[^+\d]/g, "")}>
                          {b.phone}
                        </a>
                      )}
                    </div>
                    <div className="appointment-end">
                      {b.kind !== "block" && <strong>{money(b)}</strong>}
                      {b.status === "confirmed" && (
                        <div className="action-row">
                          {b.kind !== "block" && (
                            <button
                              disabled={busy}
                              className="mini-button"
                              onClick={() =>
                                send(
                                  {
                                    action: "status",
                                    id: b.id,
                                    status: "completed",
                                  },
                                  "Atendimento concluído.",
                                )
                              }
                            >
                              Concluir
                            </button>
                          )}
                          <button
                            disabled={busy}
                            className="mini-button danger"
                            onClick={() => setCancel(b)}
                          >
                            {b.kind === "block" ? "Liberar" : "Cancelar"}
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
            <p className="fineprint">
              Atualização automática a cada 20 segundos · Reservas canceladas
              ficam no histórico.
            </p>
          </TabsContent>
          {owner && (
            <TabsContent value="services">
              <div className="section-heading">
                <div>
                  <h2>Catálogo de serviços</h2>
                  <p>Preço, duração e disponibilidade em um só lugar.</p>
                </div>
                <button
                  className="action"
                  onClick={() => setService({ ...newService })}
                >
                  <Plus size={18} /> Novo serviço
                </button>
              </div>
              {!services.length && !loading && (
                <div className="empty-panel">
                  <h3>Importar os serviços dos prints</h3>
                  <p>
                    São cinco serviços completos e um combo aguardando
                    confirmação do nome.
                  </p>
                  <button
                    className="action"
                    disabled={busy}
                    onClick={() => {
                      setError(
                        "Execute supabase/02-servicos.sql no SQL Editor do Supabase, conforme o guia.",
                      );
                    }}
                  >
                    Como carregar catálogo
                  </button>
                </div>
              )}
              {service && (
                <form
                  className="editor"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      await send(
                        { action: "service", service },
                        "Serviço salvo.",
                      )
                    )
                      setService(null);
                  }}
                >
                  <h2>{service.id ? "Editar serviço" : "Novo serviço"}</h2>
                  <div className="form-grid">
                    <label>
                      Nome
                      <input
                        required
                        minLength={2}
                        maxLength={100}
                        value={service.name}
                        onChange={(e) =>
                          setService({ ...service, name: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Duração (minutos)
                      <input
                        type="number"
                        min="15"
                        max="240"
                        step="15"
                        value={service.duration}
                        onChange={(e) =>
                          setService({
                            ...service,
                            duration: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Tipo de preço
                      <Choice
                        value={service.price_kind}
                        onChange={(v) =>
                          setService({
                            ...service,
                            price_kind: v,
                            price:
                              v === "consult" ? null : (service.price ?? 0),
                          })
                        }
                        label="Tipo de preço"
                        options={[
                          { value: "consult", label: "Sob consulta" },
                          { value: "from", label: "A partir de" },
                          { value: "fixed", label: "Preço fixo" },
                        ]}
                      />
                    </label>
                    {service.price_kind !== "consult" && (
                      <label>
                        Preço em reais
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={(service.price ?? 0) / 100}
                          onChange={(e) =>
                            setService({
                              ...service,
                              price: Math.round(Number(e.target.value) * 100),
                            })
                          }
                        />
                      </label>
                    )}
                  </div>
                  <Toggle
                    checked={!!service.active}
                    onChange={(v) =>
                      setService({ ...service, active: v ? 1 : 0 })
                    }
                    label="Disponível para agendamento"
                  />
                  {service.note && <p className="notice">{service.note}</p>}
                  <div className="action-row">
                    <button className="action" disabled={busy}>
                      Salvar serviço
                    </button>
                    <button
                      className="action secondary"
                      type="button"
                      onClick={() => setService(null)}
                    >
                      Fechar
                    </button>
                  </div>
                </form>
              )}
              <div className="admin-service-grid">
                {services.map((s) => (
                  <article key={s.id}>
                    <Scissors size={22} />
                    <span className="badge">
                      {s.active ? "Ativo" : "Pendente / inativo"}
                    </span>
                    <h3>{s.name}</h3>
                    <p>{s.duration} minutos</p>
                    <strong>{money(s)}</strong>
                    {s.note && <p className="fineprint">{s.note}</p>}
                    <button
                      className="mini-button"
                      onClick={() => setService({ ...s })}
                    >
                      Editar serviço
                    </button>
                  </article>
                ))}
              </div>
            </TabsContent>
          )}
          {owner && (
            <TabsContent value="team">
              <div className="section-heading">
                <div>
                  <h2>Equipe & expediente</h2>
                  <p>
                    Cada profissional tem seus serviços e sua disponibilidade.
                  </p>
                </div>
                <button
                  className="action"
                  disabled={!services.length}
                  onClick={() => editBarber(freshBarber())}
                >
                  <Plus size={18} /> Novo profissional
                </button>
              </div>
              {!services.length && (
                <p className="notice">
                  Execute o arquivo 02-servicos.sql no Supabase antes de
                  cadastrar a equipe.
                </p>
              )}
              {barber && (
                <form
                  className="editor"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await saveBarber();
                  }}
                >
                  <h2>
                    {barber.id ? "Editar profissional" : "Novo profissional"}
                  </h2>
                  <fieldset
                    className="barber-fields"
                    disabled={busy || photoBusy}
                  >
                    <PhotoEditor
                      onChecking={setPhotoChecking}
                      name={barber.name}
                      src={photoURL(barber.photo_path)}
                      file={photoFile}
                      onFile={setPhotoFile}
                      onRemove={() => {
                        setPhotoFile(null);
                        setBarber({ ...barber, photo_path: null });
                      }}
                      disabled={busy || photoBusy}
                    />
                    {photoError && (
                      <p className="notice error" role="alert">
                        {photoError}
                      </p>
                    )}
                    <div className="form-grid">
                      <label>
                        Nome
                        <input
                          required
                          minLength={2}
                          maxLength={80}
                          value={barber.name}
                          onChange={(e) =>
                            setBarber({ ...barber, name: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        E-mail de acesso
                        <input
                          type="email"
                          required
                          value={barber.email}
                          onChange={(e) =>
                            setBarber({ ...barber, email: e.target.value })
                          }
                        />
                      </label>
                    </div>
                    <p className="fineprint">
                      O profissional deve entrar com Google usando este e-mail.
                      Ele verá apenas sua própria agenda.
                    </p>
                    <Toggle
                      checked={!!barber.active}
                      onChange={(v) =>
                        setBarber({ ...barber, active: v ? 1 : 0 })
                      }
                      label="Profissional ativo"
                    />
                    <h3>Serviços atendidos</h3>
                    <div className="checks">
                      {services
                        .filter((s) => s.active)
                        .map((s) => (
                          <Toggle
                            key={s.id}
                            label={s.name}
                            checked={barber.services.includes(s.id)}
                            onChange={(v) =>
                              setBarber({
                                ...barber,
                                services: v
                                  ? [...barber.services, s.id]
                                  : barber.services.filter((id) => id !== s.id),
                              })
                            }
                          />
                        ))}
                    </div>
                    <h3>Expediente semanal</h3>
                    <p className="fineprint">
                      Horário de Brasília. Para almoço, férias ou folgas
                      pontuais, adicione um bloqueio na agenda.
                    </p>
                    <div className="shift-list">
                      {[
                        "Domingo",
                        "Segunda",
                        "Terça",
                        "Quarta",
                        "Quinta",
                        "Sexta",
                        "Sábado",
                      ].map((day, i) => (
                        <div key={day}>
                          <Toggle
                            checked={barber.schedule[i].enabled}
                            label={day}
                            onChange={(v) =>
                              setBarber({
                                ...barber,
                                schedule: barber.schedule.map((s, j) =>
                                  j === i ? { ...s, enabled: v } : s,
                                ),
                              })
                            }
                          />
                          <input
                            aria-label={"Início " + day}
                            type="time"
                            step="900"
                            disabled={!barber.schedule[i].enabled}
                            value={time(barber.schedule[i].open)}
                            onChange={(e) =>
                              setBarber({
                                ...barber,
                                schedule: barber.schedule.map((s, j) =>
                                  j === i
                                    ? { ...s, open: minute(e.target.value) }
                                    : s,
                                ),
                              })
                            }
                          />
                          <span>até</span>
                          <input
                            aria-label={"Fim " + day}
                            type="time"
                            step="900"
                            disabled={!barber.schedule[i].enabled}
                            value={time(barber.schedule[i].close)}
                            onChange={(e) =>
                              setBarber({
                                ...barber,
                                schedule: barber.schedule.map((s, j) =>
                                  j === i
                                    ? { ...s, close: minute(e.target.value) }
                                    : s,
                                ),
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <div className="action-row">
                      <button
                        className="action"
                        disabled={busy || photoBusy || photoChecking}
                      >
                        {photoBusy
                          ? "Salvando profissional…"
                          : "Salvar profissional"}
                      </button>
                      <button
                        className="action secondary"
                        type="button"
                        onClick={() => editBarber(null)}
                      >
                        Fechar
                      </button>
                    </div>
                  </fieldset>
                </form>
              )}
              {!barbers.length && !barber ? (
                <div className="empty-panel">
                  <Users size={36} />
                  <h2>Nenhum profissional cadastrado</h2>
                  <p>
                    Adicione os nomes reais, e-mails e serviços de cada
                    barbeiro.
                  </p>
                </div>
              ) : (
                <div className="admin-service-grid">
                  {barbers.map((b) => (
                    <article key={b.id}>
                      <BarberPhoto name={b.name} src={b.photo_url} />
                      <h3>{b.name}</h3>
                      <p>{b.email}</p>
                      <span className="badge">
                        {b.active ? "Ativo" : "Inativo"}
                      </span>
                      <p>{JSON.parse(b.service_ids).length} serviços</p>
                      <button
                        className="mini-button"
                        onClick={() =>
                          editBarber({
                            photo_path: b.photo_path || null,
                            id: b.id,
                            name: b.name,
                            email: b.email || "",
                            active: b.active,
                            services: JSON.parse(b.service_ids),
                            schedule: JSON.parse(b.schedule),
                          })
                        }
                      >
                        Editar profissional
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>
      <AlertDialog
        open={!!cancel}
        onOpenChange={(v) => {
          if (!v) setCancel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {cancel?.kind === "block"
                ? "Liberar este horário?"
                : "Cancelar este agendamento?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cancel?.customer_name} · {cancel && time(cancel.start)}. O
              horário ficará disponível novamente. A ação ficará registrada no
              histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (cancel)
                  await send(
                    { action: "status", id: cancel.id, status: "cancelled" },
                    "Horário liberado.",
                  );
                setCancel(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <footer className="sys-footer">
        Santo Corte · Painel da equipe <a href="/">Voltar ao site</a>
      </footer>
    </div>
  );
}
function ShieldNotice() {
  return <LockKeyhole size={24} aria-hidden="true" />;
}
