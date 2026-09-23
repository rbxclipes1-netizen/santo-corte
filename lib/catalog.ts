export type Service = {
  id: string;
  name: string;
  duration: number;
  price: number | null;
  price_kind: string;
  active: number;
  note: string;
};
export type Shift = { open: number; close: number; enabled: boolean };
export type Barber = {
  photo_path?: string | null;
  photo_url?: string | null;
  id: string;
  name: string;
  email?: string;
  active: number;
  service_ids: string;
  schedule: string;
};
export const defaultSchedule: Shift[] = Array.from({ length: 7 }, (_, i) => ({
  enabled: i !== 0,
  open: i === 6 ? 480 : 510,
  close: i === 6 ? 1080 : 1170,
}));
export const initialServices: Service[] = [
  {
    id: "corte",
    name: "Corte",
    duration: 30,
    price: null,
    price_kind: "consult",
    active: 1,
    note: "",
  },
  {
    id: "corte-barba",
    name: "Corte + Barba",
    duration: 60,
    price: 8000,
    price_kind: "from",
    active: 1,
    note: "",
  },
  {
    id: "barba",
    name: "Barba",
    duration: 30,
    price: null,
    price_kind: "consult",
    active: 1,
    note: "",
  },
  {
    id: "dois-cortes",
    name: "2 Cortes",
    duration: 60,
    price: 8000,
    price_kind: "from",
    active: 1,
    note: "",
  },
  {
    id: "progressiva",
    name: "Escova Progressiva",
    duration: 90,
    price: 10000,
    price_kind: "from",
    active: 1,
    note: "",
  },
  {
    id: "combo-pendente",
    name: "Corte + Barba + S...",
    duration: 60,
    price: 10000,
    price_kind: "from",
    active: 0,
    note: "Confirmar o nome completo do serviço antes de ativar.",
  },
];
export const money = (s: { price: number | null; price_kind: string }) =>
  s.price === null
    ? "Sob consulta"
    : (s.price_kind === "from" ? "A partir de " : "") +
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(s.price / 100);
export const time = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
export const minute = (s: string) =>
  Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function withinDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(date + "T12:00:00-03:00");
  return (
    Number.isFinite(d.getTime()) &&
    d.toISOString().slice(0, 10) === date &&
    date >= today() &&
    d.getTime() < Date.now() + 90 * 86400000
  );
}
export function validSlot(
  date: string,
  start: number,
  duration: number,
  schedule: Shift[],
) {
  if (
    !withinDate(date) ||
    !Number.isInteger(start) ||
    start % 15 ||
    duration < 15
  )
    return false;
  const day = new Date(date + "T12:00:00-03:00").getUTCDay(),
    s = schedule[day];
  return (
    s?.enabled &&
    start >= s.open &&
    start + duration <= s.close &&
    new Date(date + "T" + time(start) + ":00-03:00").getTime() > Date.now()
  );
}
