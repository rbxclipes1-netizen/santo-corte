# Santo Corte — sistema de agendamento

Projeto completo para **Supabase + Netlify**, com código-fonte, banco de dados, login Google, agendamento automático, painel administrativo, agenda individual e notificações Web Push.

**Comece pelo arquivo `GUIA-DE-INSTALACAO.html`.** Ele abre no navegador, sem instalar nada. A versão em texto está em `GUIA-DE-INSTALACAO.md`.

## Conteúdo

- `/`: apresentação premium da barbearia, preservando o visual preto/cobre.
- `/agendar`: serviço → profissional/data/horário → Google → confirmação.
- `/meus-agendamentos`: histórico e cancelamento do próprio cliente.
- `/painel`: agenda, reservas manuais, bloqueios e conclusão/cancelamento.
- Administrador: catálogo, profissionais, preços, duração e expediente semanal.
- Profissional: somente sua agenda, com acesso associado ao e-mail cadastrado.
- PWA: instalação na tela inicial de Android/iPhone.
- Push: aviso de nova reserva e cancelamento, teste de entrega e fila com retentativas.
- Som no painel aberto: alerta após ativação pelo profissional; consulta novos agendamentos a cada 15 segundos.

## Comandos

```bash
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run vapid:generate
```

Use Node.js 22 ou posterior. `npm ci` instala as versões do `package-lock.json`. Não é preciso enviar `node_modules` para GitHub ou Netlify.

## Configuração externa obrigatória

Este pacote não contém suas credenciais nem cria automaticamente contas. Configure Supabase, Google Cloud e as variáveis da Netlify conforme o guia. Os serviços iniciais são inseridos por `supabase/02-servicos.sql`. Não há barbeiros fictícios nem contas/senhas padrão.

O serviço “Corte + Barba + S...” está desativado porque o print não informa o nome completo. O administrador pode corrigir e ativar depois. A foto de apresentação é ilustrativa, com fonte em `ASSET-SOURCES.md`.

## Organização

- `app/`: páginas e rotas de servidor Next.js.
- `lib/supabase/`: clientes e sessões Supabase.
- `lib/push/`: envio de notificações no servidor.
- `supabase/`: schema, funções, permissões e dados iniciais.
- `netlify/functions/push-dispatch.mjs`: processamento periódico da fila.
- `public/sw.js`: recebimento de push no aparelho.
- `public/manifest.webmanifest`: instalação da aplicação no celular.
- `tests/`: testes de segurança e banco PostgreSQL via PGlite.

## Limites e operação

Push depende de internet, permissão e suporte do navegador/SO. Não é um alarme garantido, não ignora silencioso/Não Perturbe e não pode forçar som personalizado em segundo plano. iPhone requer iOS 16.4+ e instalação pela tela inicial. A agenda precisa de internet; não há cache offline dos dados de clientes.

A reserva é salva antes da tentativa de push. A indisponibilidade da notificação não desfaz o agendamento. A fila é reprocessada pela função agendada, somente em publicação de produção. Até seis tentativas por dispositivo; falhas ficam registradas. O provedor aceitar uma notificação não garante que o sistema operacional a exibirá com som.

O pacote foi compilado e testado localmente. A validação de login Google, deploy na sua conta e notificações reais deve ser feita após conectar as contas. Veja `VALIDACAO.md`.
