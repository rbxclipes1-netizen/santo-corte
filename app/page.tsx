import TeamShowcase from "@/components/team-showcase";
export default function Home() {
  return (
    <div className="landing">
      <a className="skip" href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className="header">
        <a className="brand" href="#inicio" aria-label="Santo Corte, início">
          <span className="official-logo">
            <img
              src="/logo-santo-corte.png"
              alt="Santo Corte Barbearia"
              width="1450"
              height="1088"
            />
          </span>
        </a>
        <nav aria-label="Menu principal">
          <a href="#essencia">A barbearia</a>
          <a href="#equipe">Equipe</a>
          <a href="/agendar">Agendamento</a>
          <a href="#visite">Onde estamos</a>
        </nav>
        <a className="button small" href="/agendar">
          AGENDAR HORÁRIO <span>↗</span>
        </a>
      </header>
      <nav className="mobile-quick-nav" aria-label="Acesso rápido">
        <a href="#equipe">Nossa equipe</a>
        <a href="/agendar">Agendar horário ↗</a>
        <a href="/meus-agendamentos">Meus horários</a>
      </nav>
      <main id="conteudo">
        <section className="hero" id="inicio">
          <div
            className="hero-photo"
            role="img"
            aria-label="Imagem ilustrativa de cuidado com cabelo em uma barbearia"
          ></div>
          <div className="hero-shade"></div>
          <div className="hero-content">
            <div className="eyebrow">
              <span></span> CANAÃ · IPATINGA, MG
            </div>
            <h1>
              SEU ESTILO.
              <br />
              SEU MOMENTO.
              <br />
              <em>SANTO CORTE.</em>
            </h1>
            <p>
              Uma pausa na rotina.
              <br />
              Um novo olhar no espelho.
            </p>
            <a className="button" href="/agendar">
              RESERVE SEU HORÁRIO <span>↗</span>
            </a>
            <div className="rating">
              <span className="stars" aria-label="5 estrelas">
                ★★★★★
              </span>
              <span>
                <strong>5,0</strong> no Trinks <i>·</i> 13 avaliações
              </span>
            </div>
          </div>
          <div className="hero-bottom">
            <span>BARBEARIA MASCULINA · ADULTO & INFANTIL</span>
            <a href="#essencia">
              CONHEÇA A SANTO CORTE <span>↓</span>
            </a>
          </div>
          <span className="photo-note">Imagem ilustrativa</span>
        </section>
        <div className="ribbon" aria-hidden="true">
          <span>ESTILO TEM PRESENÇA</span>
          <b>✦</b>
          <span>SEU TEMPO TEM VALOR</span>
          <b>✦</b>
          <span>SANTO CORTE BARBEARIA</span>
          <b>✦</b>
        </div>
        <section className="essence section" id="essencia">
          <div>
            <div className="eyebrow">01 / A SANTO CORTE</div>
            <h2>
              MAIS DO QUE
              <br />
              UM HORÁRIO.
              <br />
              <span>UM TEMPO SEU.</span>
            </h2>
          </div>
          <div className="essence-copy">
            <p className="lead">
              No coração do Canaã,
              <br />
              um lugar para cuidar do seu visual.
            </p>
            <p>
              A Santo Corte recebe adultos e crianças em Ipatinga. Escolha seu
              horário e venha fazer do cuidado pessoal parte da sua rotina.
            </p>
            <div className="amenities">
              <span>Wi-Fi</span>
              <span>Ambiente com TV</span>
              <span>Acessibilidade</span>
              <span>Adulto e infantil</span>
            </div>
            <a className="text-link" href="#visite">
              VENHA NOS CONHECER <span>↗</span>
            </a>
          </div>
        </section>
        <TeamShowcase />
        <section className="booking section" id="agendamento">
          <div className="booking-top">
            <div>
              <div className="eyebrow">02 / SEU PRÓXIMO HORÁRIO</div>
              <h2>
                O PRÓXIMO PASSO
                <br />É <span>SE CUIDAR.</span>
              </h2>
            </div>
            <p>
              Consulte os serviços, escolha o profissional
              <br className="desktop" /> e encontre o melhor horário para você.
            </p>
          </div>
          <div className="steps">
            <article>
              <span className="step-no">01</span>
              <h3>Escolha seu serviço</h3>
              <p>
                Veja as opções e os valores atualizados na nossa página de
                agendamento.
              </p>
            </article>
            <article>
              <span className="step-no">02</span>
              <h3>Encontre seu horário</h3>
              <p>
                Consulte a disponibilidade e escolha o momento que combina com
                sua rotina.
              </p>
            </article>
            <article>
              <span className="step-no">03</span>
              <h3>Nos vemos na cadeira</h3>
              <p>
                Confirme sua reserva aqui no site. A gente se encontra na Santo
                Corte.
              </p>
            </article>
          </div>
          <div className="booking-action">
            <a className="button" href="/agendar">
              VER SERVIÇOS E AGENDAR <span>↗</span>
            </a>
            <span>Agendamento online na Santo Corte</span>
          </div>
        </section>
        <section className="reputation">
          <div className="reputation-score">
            5,0
            <span className="stars" aria-label="5 estrelas">
              ★★★★★
            </span>
          </div>
          <div>
            <div className="eyebrow">QUEM SENTA NA CADEIRA, AVALIA.</div>
            <h2>
              A CONFIANÇA COMEÇA
              <br />
              COM QUEM JÁ VEIO.
            </h2>
            <a className="text-link" href="/agendar">
              VER SERVIÇOS E HORÁRIOS <span>↗</span>
            </a>
          </div>
        </section>
        <section className="visit section" id="visite">
          <div>
            <div className="eyebrow">03 / ENCONTRE A SANTO CORTE</div>
            <h2>
              SEU DESTINO.
              <br />
              <span>CANAÃ, IPATINGA.</span>
            </h2>
            <address>
              Avenida Galiléia, 496 · Loja
              <br />
              Canaã · Ipatinga, MG
              <br />
              CEP 35164-165
            </address>
            <a
              className="text-link"
              href="https://www.google.com/maps/search/?api=1&query=Santo+Corte+Barbearia+Avenida+Galileia+496+Ipatinga"
              target="_blank"
              rel="noopener"
            >
              TRAÇAR ROTA NO MAPA <span>↗</span>
            </a>
          </div>
          <div className="visit-details">
            <div className="detail-title">PORTAS ABERTAS PARA VOCÊ</div>
            <dl className="hours">
              <div>
                <dt>Segunda a sexta</dt>
                <dd>08h30 — 19h30</dd>
              </div>
              <div>
                <dt>Sábado</dt>
                <dd>08h00 — 18h00</dd>
              </div>
              <div>
                <dt>Domingo</dt>
                <dd>Fechado</dd>
              </div>
            </dl>
            <div className="contact">
              <span>FALE COM A BARBEARIA</span>
              <a href="tel:+5531988871987">(31) 98887-1987 ↗</a>
              <a href="tel:+553138258926">(31) 3825-8926 ↗</a>
            </div>
            <p className="payment">
              Aceitamos crédito, débito, Pix, dinheiro e transferência.
            </p>
          </div>
        </section>
        <div className="policy">
          <span>UM CUIDADO COM O SEU HORÁRIO</span>
          <p>
            Precisou desmarcar? Avise com antecedência.
            <br />A tolerância para atrasos é de 10 minutos.
          </p>
        </div>
        <section className="closing">
          <span className="official-logo">
            <img
              src="/logo-santo-corte.png"
              alt="Santo Corte Barbearia"
              width="1450"
              height="1088"
            />
          </span>
          <div className="eyebrow">A GENTE SE VÊ NA SANTO CORTE.</div>
          <h2>
            MARQUE SEU
            <br />
            <span>PRÓXIMO MOMENTO.</span>
          </h2>
          <a className="button" href="/agendar">
            AGENDAR MEU HORÁRIO <span>↗</span>
          </a>
        </section>
      </main>
      <footer>
        <a className="footer-brand" href="#inicio">
          <span className="official-logo">
            <img
              src="/logo-santo-corte.png"
              alt="Santo Corte Barbearia"
              width="1450"
              height="1088"
            />
          </span>
        </a>
        <p>Canaã, Ipatinga · MG</p>
        <span>
          © <span id="year">2026</span> Santo Corte Barbearia
        </span>
        <a href="/painel">Área da equipe ↗</a>
      </footer>
    </div>
  );
}
