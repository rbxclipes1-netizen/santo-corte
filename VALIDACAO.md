# Validação e limites da entrega

## Verificado no ambiente de desenvolvimento

- Compilação Next.js para produção e checagem TypeScript.
- Schema e funções executados no motor PostgreSQL do PGlite, com extensão btree_gist.
- 37 operações de integração: criação dos dados, permissões RLS, bloqueio de promoção indevida para administrador, agenda de cada profissional, criação de reservas, impedimento de sobreposição, repetição idempotente da confirmação, cancelamento e liberação de horário.
- Fila de notificações criada pela transação da reserva; reivindicação de trabalhos, confirmação do envio e restrições de acesso.
- Worker de push testado com serviços simulados: sucesso, falha temporária, remoção de dispositivo expirado e rejeição de destinos de rede não autorizados.
- Validação dos destinos do OAuth e dos identificadores de reserva.

Os testes estão em `tests/`. Execute `npm ci` e `npm test` para repetir.

## Exige suas contas e aparelhos para verificar

- Login Google e retorno ao domínio final.
- Aplicação dos scripts no projeto Supabase real e cadastro do administrador.
- Deploy e execução periódica das Functions na Netlify.
- Notificações reais com tela bloqueada, app fechado, som e permissões em Android/iPhone.
- Revisão visual e de uso nos celulares reais da equipe.

O pacote não contém credenciais de produção. Não foi publicado nas contas do usuário, pois elas ainda não foram conectadas. O sucesso dos testes locais não equivale à validação dessas integrações externas.

## Limites funcionais

- Agendamento online e painel requerem internet.
- Não processa pagamento, não envia WhatsApp/SMS e não sincroniza com Trinks.
- Bloqueios são intervalos de um dia. Não há recorrência automática de férias/almoço; adicione os intervalos necessários.
- Clientes consultam até 100 registros mais recentes em Meus agendamentos.
- Horários podem ser reservados nos próximos 90 dias, com passos de 15 minutos.
- Preços e duração ficam registrados como estavam na criação da reserva; editar o catálogo não altera reservas antigas.
- Avisos Web Push dependem do provedor, navegador e sistema operacional. O som não é garantido em modo silencioso/Não Perturbe.
- Push tem entrega com retentativas: pode repetir em caso de falha na confirmação do envio. Isso não duplica o agendamento.

## Atualização visual com logo oficial

Build de produção e TypeScript aprovados. Rotas /, /entrar, /agendar e /painel responderam HTTP 200 com a referência da logo. A revisão visual em navegador não foi concluída neste ambiente: o download do Chromium ficou indisponível. Conferir desktop e celular ao iniciar os testes.
