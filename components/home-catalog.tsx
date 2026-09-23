"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, Clock3, Scissors } from "lucide-react";
import BarberPhoto from "./barber-photo";
import { money, type Service, type Barber } from "@/lib/catalog";
export default function HomeCatalog() {
  const [catalog, setCatalog] = useState<{
    services: Service[];
    barbers: Barber[];
  } | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch("/api/catalog", { signal: controller.signal, cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) =>
        setCatalog({
          services: data.services.filter((s: Service) => s.active),
          barbers: data.barbers.filter((b: Barber) => b.active),
        }),
      )
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [attempt]);
  const feedback = (
    <div className="sc-feedback" role="status">
      {error ? (
        <>
          Não foi possível carregar agora.{" "}
          <button onClick={() => setAttempt((n) => n + 1)}>
            Tentar novamente
          </button>
        </>
      ) : (
        "Carregando serviços e equipe…"
      )}
    </div>
  );
  return (
    <>
      <section
        className="sc-section sc-services"
        id="servicos"
        aria-labelledby="services-title"
      >
        <div className="sc-container">
          <div className="sc-section-heading">
            <div>
              <span className="sc-kicker">ESCOLHA SEU CUIDADO</span>
              <h2 id="services-title">Serviços & combos</h2>
              <p>
                Conheça os serviços da Santo Corte e encontre o seu próximo
                horário.
              </p>
            </div>
            <a className="sc-inline-link" href="/agendar">
              Ver horários disponíveis <ArrowUpRight size={16} />
            </a>
          </div>
          {!catalog ? (
            feedback
          ) : catalog.services.length ? (
            <div className="sc-services-grid">
              {catalog.services.map((s) => (
                <article className="sc-service" key={s.id}>
                  <div className="sc-service-meta">
                    <span>
                      <Scissors size={14} /> SANTO CORTE
                    </span>
                    <span>
                      <Clock3 size={13} /> {s.duration} min
                    </span>
                  </div>
                  <h3>{s.name}</h3>
                  <p>
                    Escolha o profissional e consulte os horários disponíveis
                    para este serviço.
                  </p>
                  <div className="sc-service-bottom">
                    <div>
                      <small>Valor do serviço</small>
                      <strong>{money(s)}</strong>
                    </div>
                    <a
                      className="sc-btn"
                      href={`/agendar?service=${encodeURIComponent(s.id)}`}
                      aria-label={`Agendar ${s.name}`}
                    >
                      Agendar <ArrowUpRight size={14} />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="sc-feedback">
              Os serviços estarão disponíveis em breve.
            </p>
          )}
          <div className="sc-section-action">
            <a className="sc-btn" href="/agendar">
              <Scissors size={16} /> VER HORÁRIOS E AGENDAR ONLINE
            </a>
          </div>
        </div>
      </section>
      <section
        className="sc-section sc-container"
        id="equipe"
        aria-labelledby="team-title"
      >
        <div className="sc-section-heading sc-centered">
          <span className="sc-kicker">QUEM CUIDA DO SEU ESTILO</span>
          <h2 id="team-title">Conheça nossa equipe</h2>
          <p>
            Escolha o profissional da sua preferência.
            <br />
            Seu próximo cuidado começa por aqui.
          </p>
        </div>
        {!catalog ? (
          feedback
        ) : catalog.barbers.length ? (
          <div className="sc-team-grid">
            {catalog.barbers.map((b) => {
              let ids: string[] = [];
              try {
                ids = JSON.parse(b.service_ids);
              } catch {
                /* Fall back to a link to booking. */
              }
              const services = catalog.services.filter((s) =>
                ids.includes(s.id),
              );
              return (
                <article className="sc-team-card" key={b.id}>
                  <div className="sc-team-image">
                    <BarberPhoto name={b.name} src={b.photo_url} large />
                    <span className="sc-photo-label">SANTO CORTE · EQUIPE</span>
                  </div>
                  <div className="sc-team-copy">
                    <h3>{b.name}</h3>
                    <div className="sc-team-services">
                      <span className="sc-kicker">
                        SERVIÇOS DO PROFISSIONAL
                      </span>
                      {services.length ? (
                        <ul>
                          {services.map((s) => (
                            <li key={s.id}>
                              <span>{s.name}</span>
                              <strong>{money(s)}</strong>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>Consulte os serviços no agendamento.</p>
                      )}
                    </div>
                    <a
                      className="sc-btn sc-btn-secondary"
                      href={`/agendar?barber=${encodeURIComponent(b.id)}`}
                      aria-label={`Agendar com ${b.name}`}
                    >
                      <Scissors size={15} /> AGENDAR COM {b.name.split(" ")[0]}
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="sc-feedback">
            Nossa equipe estará aqui em breve.{" "}
            <a href="/agendar">Consultar agendamento ↗</a>
          </p>
        )}
      </section>
    </>
  );
}
