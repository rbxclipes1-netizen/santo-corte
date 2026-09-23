"use client";
import { useEffect, useState } from "react";
import BarberPhoto from "./barber-photo";
import type { Barber } from "@/lib/catalog";
export default function TeamShowcase() {
  const [team, setTeam] = useState<Barber[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/team", { signal: c.signal, cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw Error();
        const d = await r.json();
        setTeam(d.barbers);
        setServices(d.services);
        setStatus("ready");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setStatus("error");
      });
    return () => c.abort();
  }, []);
  return (
    <section
      className="team-section section"
      id="equipe"
      aria-labelledby="team-title"
    >
      <div className="team-heading">
        <div>
          <div className="eyebrow">QUEM CUIDA DO SEU ESTILO</div>
          <h2 id="team-title">
            CONHEÇA
            <br />
            <span>NOSSA EQUIPE.</span>
          </h2>
        </div>
        <p>
          Escolha com quem você quer marcar.
          <br />
          Seu próximo cuidado começa por aqui.
        </p>
      </div>
      {status === "loading" ? (
        <p className="team-feedback" role="status">
          Carregando a equipe…
        </p>
      ) : team.length ? (
        <div className="team-grid">
          {team.map((b) => {
            const ids: string[] = JSON.parse(b.service_ids);
            const names = services
              .filter((s) => ids.includes(s.id))
              .map((s) => s.name);
            return (
              <article className="team-card" key={b.id}>
                <BarberPhoto name={b.name} src={b.photo_url} large />
                <div className="team-card-copy">
                  <span className="team-kicker">
                    SANTO CORTE · PROFISSIONAL
                  </span>
                  <h3>{b.name}</h3>
                  <p>
                    {names.slice(0, 3).join(" · ") ||
                      "Conheça os serviços no agendamento"}
                    {names.length > 3 ? " e mais" : ""}
                  </p>
                  <a
                    className="text-link"
                    href={`/agendar?barber=${encodeURIComponent(b.id)}`}
                    aria-label={`Agendar com ${b.name}`}
                  >
                    AGENDAR COM {b.name.split(" ")[0]}{" "}
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="team-feedback">
          {status === "error"
            ? "Não foi possível carregar a equipe agora. "
            : "Nossa equipe estará aqui em breve. "}
          <a href="/agendar">Consultar agendamento ↗</a>
        </p>
      )}
    </section>
  );
}
