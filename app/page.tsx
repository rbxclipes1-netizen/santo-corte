import {
  ArrowUpRight,
  Scissors,
  Clock3,
  MapPin,
  Phone,
  UserRound,
  Wifi,
  CreditCard,
  Check,
  Menu,
} from "lucide-react";
import HomeCatalog from "@/components/home-catalog";
import "./home-premium.css";

const mapQuery = "Santo Corte Barbearia Avenida Galileia 496 Ipatinga MG";
function Logo() {
  return (
    <span className="official-logo">
      <img
        src="/logo-santo-corte.png"
        alt="Santo Corte Barbearia"
        width={1450}
        height={1088}
      />
    </span>
  );
}
const links = [
  ["#inicio", "Início"],
  ["#servicos", "Serviços"],
  ["#equipe", "Equipe"],
  ["#essencia", "A barbearia"],
  ["#visite", "Localização"],
];
export default function Home() {
  return (
    <div className="sc-home">
      <a className="skip" href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className="sc-header">
        <div className="sc-container sc-header-inner">
          <a
            className="sc-brand"
            href="#inicio"
            aria-label="Santo Corte, início"
          >
            <Logo />
          </a>
          <nav className="sc-desktop-nav" aria-label="Menu principal">
            {links.map(([url, name]) => (
              <a href={url} key={url}>
                {name}
              </a>
            ))}
          </nav>
          <div className="sc-header-actions">
            <a
              className="sc-btn sc-btn-secondary sc-client"
              href="/meus-agendamentos"
            >
              <UserRound size={15} aria-hidden="true" /> Área do cliente
            </a>
            <a className="sc-btn" href="/agendar">
              Agendar horário
            </a>
          </div>
          <details className="sc-mobile-menu">
            <summary aria-label="Abrir menu de navegação">
              <Menu size={22} />
            </summary>
            <nav aria-label="Menu móvel">
              {links.map(([url, name]) => (
                <a href={url} key={url}>
                  {name}
                </a>
              ))}
              <a href="/meus-agendamentos">Área do cliente</a>
            </nav>
          </details>
        </div>
      </header>
      <main id="conteudo">
        <section className="sc-hero" id="inicio" aria-labelledby="hero-title">
          <div className="sc-hero-backdrop" />
          <div className="sc-container sc-hero-inner">
            <span className="sc-pill">
              <Scissors size={14} aria-hidden="true" /> BARBEARIA EM CANAÃ ·
              IPATINGA, MG
            </span>
            <h1 id="hero-title">
              SEU ESTILO. SEU MOMENTO.
              <br />
              <span>SANTO CORTE.</span>
            </h1>
            <p>
              Uma pausa na rotina. Um novo olhar no espelho.
              <br />
              Escolha seu profissional e reserve seu próximo cuidado com a Santo
              Corte.
            </p>
            <div className="sc-hero-actions">
              <a className="sc-btn sc-btn-lg" href="/agendar">
                <Scissors size={18} aria-hidden="true" /> AGENDAR HORÁRIO ONLINE
              </a>
              <a className="sc-btn sc-btn-lg sc-btn-secondary" href="#servicos">
                Ver serviços e valores
              </a>
            </div>
            <ul className="sc-benefits">
              <li>
                <Clock3 size={16} /> Horário marcado
              </li>
              <li>
                <UserRound size={16} /> Adulto e infantil
              </li>
              <li>
                <Wifi size={16} /> Wi-Fi no ambiente
              </li>
              <li>
                <CreditCard size={16} /> Pix, débito e crédito
              </li>
            </ul>
          </div>
        </section>
        <div className="sc-container">
          <aside className="sc-callout">
            <div>
              <span className="sc-kicker">SEU PRÓXIMO HORÁRIO</span>
              <h2>Seu cuidado começa com uma escolha.</h2>
              <p>
                Consulte os serviços, escolha seu barbeiro e encontre o melhor
                horário para você.
              </p>
            </div>
            <a className="sc-btn" href="/agendar">
              Escolher meu horário <ArrowUpRight size={17} />
            </a>
          </aside>
        </div>
        <section
          className="sc-section sc-container sc-about"
          id="essencia"
          aria-labelledby="about-title"
        >
          <div>
            <span className="sc-kicker">SANTO CORTE BARBEARIA</span>
            <h2 id="about-title">
              Mais do que um horário.
              <br />
              <span>Um tempo seu.</span>
            </h2>
            <p className="sc-lead">
              No coração do Canaã, um lugar para cuidar do seu visual.
            </p>
            <p>
              A Santo Corte recebe adultos e crianças em Ipatinga. Escolha seu
              horário e venha fazer do cuidado pessoal parte da sua rotina.
            </p>
            <ul className="sc-amenities">
              <li>
                <Check size={16} /> Adulto e infantil
              </li>
              <li>
                <Check size={16} /> Acessibilidade
              </li>
              <li>
                <Check size={16} /> Ambiente com TV
              </li>
              <li>
                <Check size={16} /> Wi-Fi
              </li>
            </ul>
            <a className="sc-inline-link" href="#visite">
              Venha nos conhecer <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="sc-about-visual">
            <Logo />
            <div>
              <span className="sc-kicker">CANAÃ · IPATINGA</span>
              <h3>Seu estilo tem presença.</h3>
              <p>Avenida Galiléia, 496</p>
            </div>
          </div>
        </section>
        <HomeCatalog />
        <section className="sc-section sc-process">
          <div className="sc-container">
            <div className="sc-section-heading sc-centered">
              <span className="sc-kicker">SIMPLES, DO INÍCIO AO FIM</span>
              <h2>Seu próximo momento, em três passos.</h2>
              <p>
                Faça sua reserva aqui no site e acompanhe em Meus agendamentos.
              </p>
            </div>
            <div className="sc-process-grid">
              {[
                [
                  "01",
                  "Escolha o serviço",
                  "Consulte os valores e escolha o cuidado que você procura.",
                ],
                [
                  "02",
                  "Encontre seu horário",
                  "Selecione o profissional, o dia e um dos horários disponíveis.",
                ],
                [
                  "03",
                  "Confirme sua reserva",
                  "Entre com Google, confira os dados e confirme seu agendamento.",
                ],
              ].map(([n, title, copy]) => (
                <article key={n}>
                  <span>{n}</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section
          className="sc-section sc-container sc-visit"
          id="visite"
          aria-labelledby="visit-title"
        >
          <div>
            <span className="sc-kicker">VENHA NOS VISITAR</span>
            <h2 id="visit-title">
              Seu destino.
              <br />
              <span>Canaã, Ipatinga.</span>
            </h2>
            <p>
              Estamos esperando você na Santo Corte. Confira nosso endereço e
              planeje sua visita.
            </p>
            <div className="sc-contact-list">
              <div>
                <MapPin />
                <div>
                  <h3>Nosso endereço</h3>
                  <address>
                    Avenida Galiléia, 496 · Loja
                    <br />
                    Canaã · Ipatinga, MG · CEP 35164-165
                  </address>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Traçar rota ↗
                  </a>
                </div>
              </div>
              <div>
                <Clock3 />
                <div>
                  <h3>Horário de funcionamento</h3>
                  <p>
                    Segunda a sexta: 08h30 às 19h30
                    <br />
                    Sábado: 08h às 18h · Domingo: fechado
                  </p>
                </div>
              </div>
              <div>
                <Phone />
                <div>
                  <h3>Fale com a barbearia</h3>
                  <a href="tel:+5531988871987">(31) 98887-1987</a>
                  <br />
                  <a href="tel:+553138258926">(31) 3825-8926</a>
                </div>
              </div>
            </div>
          </div>
          <div className="sc-map">
            <iframe
              title="Localização da Santo Corte em Canaã, Ipatinga"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <a
              className="sc-inline-link"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir endereço no Google Maps <ArrowUpRight size={16} />
            </a>
          </div>
        </section>
        <div className="sc-container sc-policy">
          <Clock3 size={18} aria-hidden="true" />
          <p>
            Precisou desmarcar? Avise com antecedência. A tolerância para
            atrasos é de 10 minutos.
          </p>
        </div>
      </main>
      <footer className="sc-footer">
        <div className="sc-container sc-footer-grid">
          <div className="sc-footer-brand">
            <a href="#inicio" aria-label="Santo Corte, início">
              <Logo />
            </a>
            <p>
              Seu estilo. Seu momento.
              <br />
              Cuidado com o visual para adultos e crianças em Canaã, Ipatinga.
            </p>
            <small>© {new Date().getFullYear()} Santo Corte Barbearia.</small>
          </div>
          <div>
            <h2>Horários</h2>
            <p>Segunda a sexta: 08h30 às 19h30</p>
            <p>Sábado: 08h às 18h</p>
            <p>Domingo: fechado</p>
            <span className="sc-footer-note">
              Crédito, débito, Pix, dinheiro e transferência.
            </span>
          </div>
          <div>
            <h2>Links rápidos</h2>
            <nav aria-label="Links do rodapé">
              {links.map(([url, name]) => (
                <a href={url} key={url}>
                  {name}
                </a>
              ))}
            </nav>
          </div>
          <div>
            <h2>Acessos</h2>
            <div className="sc-footer-access">
              <a href="/meus-agendamentos">Área do cliente</a>
            </div>
            <p>Gerencie seus horários em um só lugar.</p>
            <a className="sc-inline-link" href="/agendar">
              Fazer agendamento <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
