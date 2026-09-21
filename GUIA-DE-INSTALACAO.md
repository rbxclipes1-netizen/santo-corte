# Santo Corte — instalação do zero

Este guia acompanha todos os arquivos do sistema para publicar na sua conta da Netlify, usando Supabase e login Google. Não use o endereço antigo da prévia para configurar esta instalação.

## 1. O que você precisa

- Conta no GitHub para guardar os arquivos.
- Conta na Netlify para publicar o site.
- Conta no Supabase para banco e autenticação.
- Acesso ao Google Cloud para configurar “Entrar com Google”.
- Node.js 22 ou posterior e VS Code no computador.

URLs: https://github.com • https://app.netlify.com • https://supabase.com/dashboard • https://console.cloud.google.com

As contas e o domínio podem ficar no nome da barbearia, com você como colaborador, para facilitar a entrega comercial. Serviços externos possuem limites e cobranças próprios; confira o plano escolhido nas respectivas contas.

## 2. Preparar os arquivos no computador

1. Extraia o ZIP.
2. Abra a pasta `santo-corte-supabase` no VS Code. Ela deve conter `package.json`, `netlify.toml`, `app` e `supabase`.
3. No terminal dessa pasta, execute:

```bash
npm ci
```

4. Para gerar as chaves dos avisos, execute uma única vez:

```bash
npm run vapid:generate
```

Será criado `.env.vapid`. Guarde essas chaves. Trocar a chave depois exige reativar as notificações em todos os celulares. O arquivo está excluído do Git; não publique a chave privada.

## 3. Criar o projeto no Supabase

1. No painel do Supabase, crie um novo projeto. Escolha uma região adequada ao público brasileiro e guarde a senha do banco.
2. Aguarde o projeto ficar disponível.
3. Abra **SQL Editor → New query**.
4. Copie todo o conteúdo de `supabase/01-schema.sql` e execute. Use um projeto novo: esse arquivo cria tabelas, permissões e funções e deve ser executado uma vez.
5. Em outra consulta, copie `supabase/02-servicos.sql` e execute. Este arquivo pode ser repetido sem sobrescrever alterações dos serviços.
6. Em **Connect** ou nas configurações de API, copie a URL do projeto e a chave **Publishable** (ou a chave pública `anon`, se esse for o formato disponibilizado).
7. Copie também a chave secreta de servidor **secret key** ou **service_role**. Ela será usada somente pelo servidor para enviar notificações. Nunca use essa chave em uma variável que comece com `NEXT_PUBLIC_`.

Não desligue RLS. As permissões e funções já foram preparadas para separar administrador, barbeiros e clientes. Não conceda acesso público às tabelas de agendamentos ou dispositivos.

## 4. Subir para o GitHub e criar o site na Netlify

Crie um repositório vazio no GitHub. No terminal da pasta do projeto:

```bash
git init
git add .
git commit -m "Sistema Santo Corte"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

Se o VS Code solicitar autenticação, entre na sua conta do GitHub. Os arquivos `.env` com valores reais não devem ser incluídos no commit.

Na Netlify:

1. Escolha adicionar/importar projeto a partir do GitHub.
2. Selecione o repositório criado.
3. Use a pasta do projeto como base. Se os arquivos estão na raiz do repositório, deixe Base directory vazio.
4. O `netlify.toml` já define **Build command: `npm run build`**, **Publish directory: `.next`** e Node 22.
5. A Netlify deve detectar Next.js. Não publique a pasta como HTML estático e não use o antigo ZIP da prévia.
6. Escolha o nome/endereço final do site, por exemplo `santo-corte-exemplo.netlify.app`.

O primeiro deploy pode exibir mensagens de configuração pendente. Isso é esperado antes de conectar Supabase e Google.

## 5. Variáveis de ambiente na Netlify

Nas configurações do projeto, abra **Environment variables** e adicione:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL final do site, como `https://santo-corte-exemplo.netlify.app`, sem barra no final |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública Publishable/anon do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta de servidor secret/service_role do Supabase |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Chave pública gerada em `.env.vapid` |
| `VAPID_PRIVATE_KEY` | Chave privada gerada em `.env.vapid` |
| `VAPID_SUBJECT` | `mailto:SEU_EMAIL_REAL` |

Garanta que as variáveis estejam disponíveis no build e nas Functions conforme necessário. As três variáveis privadas — service role, VAPID private e subject — são lidas pelo servidor. As variáveis `NEXT_PUBLIC_` são incorporadas no build do navegador; alterar esses valores exige novo deploy.

Após salvar, faça novo deploy. Não coloque aspas em volta dos valores no painel. Não compartilhe prints contendo chaves secretas.

## 6. Configurar o Google

No Google Cloud / Google Auth Platform:

1. Crie ou selecione um projeto.
2. Configure nome da aplicação, e-mail de suporte e público da tela de consentimento.
3. Use somente os escopos de identificação: `openid`, e-mail e perfil. Não é necessário pedir acesso ao Gmail ou Google Calendar.
4. Crie um **OAuth Client ID** do tipo **Web application**.
5. Em **Authorized JavaScript origins**, adicione a URL final da Netlify (ou seu domínio).
6. Em **Authorized redirect URIs**, adicione exatamente a URL de callback exibida em **Supabase → Authentication → Sign In / Providers → Google**. Geralmente é:

```text
https://SEU-PROJETO.supabase.co/auth/v1/callback
```

7. Copie o Client ID e Client Secret para a configuração do provedor Google no Supabase e ative-o. O segredo do Google fica no Supabase; não precisa ir ao código.
8. Enquanto o aplicativo estiver em modo de teste no Google, cadastre os e-mails de teste. Para aceitar clientes em geral, ajuste o público/publicação conforme a orientação do Google.

No **Supabase → Authentication → URL Configuration**:

- **Site URL:** URL final da Netlify.
- **Redirect URLs:** adicione `https://SEU-SITE.netlify.app/auth/callback**` (permite o parâmetro interno `next`). Em produção mantenha a origem exata; não autorize domínios genéricos.
- Para desenvolvimento, adicione separadamente `http://localhost:3000/auth/callback**`.

O callback do Google é o endereço do **Supabase**. O callback de retorno do aplicativo é o endereço **/auth/callback do seu site**. São dois endereços distintos.

## 7. Criar o administrador

1. Abra `https://SEU-SITE.netlify.app/entrar`.
2. Entre com a conta Google que será a administradora.
3. No arquivo `supabase/03-administrador.sql`, substitua `SEU_EMAIL_GOOGLE` pelo mesmo e-mail.
4. Execute esse arquivo no SQL Editor do Supabase.
5. Acesse `/painel` ou atualize a página. As abas **Agenda**, **Serviços** e **Equipe** aparecerão.

Não existe senha padrão ou cadastro público de administrador. Para promover outro administrador, repita esse procedimento com uma conta que já tenha entrado no site. Para remover um administrador, remova somente a linha correspondente de `admin_users` pelo painel do Supabase.

## 8. Cadastrar os barbeiros e revisar o catálogo

No painel → **Equipe → Novo profissional**:

- Nome real.
- E-mail da conta Google que ele usará.
- Serviços atendidos.
- Dias e horários de trabalho.
- Profissional ativo.

Peça ao barbeiro para entrar em `/painel` com esse e-mail. O sistema associa a conta e mostra somente sua agenda. Se você alterar o e-mail, o acesso passa para a nova conta confirmada.

Em **Serviços**, confira preço e duração. O catálogo inicial contém:

| Serviço | Duração | Preço |
|---|---|---|
| Corte | 30 min | Sob consulta |
| Corte + Barba | 60 min | A partir de R$ 80 |
| Barba | 30 min | Sob consulta |
| 2 Cortes | 60 min | A partir de R$ 80 |
| Escova Progressiva | 90 min | A partir de R$ 100 |
| Corte + Barba + S... | 60 min | A partir de R$ 100 — desativado até confirmar o nome |

Os horários são oferecidos em intervalos de 15 minutos, respeitando a duração inteira do serviço e o expediente. Para almoço, folga, férias ou compromissos, use **Agenda → Adicionar à agenda → Bloqueio / intervalo**. Um bloqueio corresponde a um intervalo de um dia; repita em outras datas quando necessário.

## 9. Avisos no celular do barbeiro

**Android:** abra o site no Chrome, entre no painel com a conta do barbeiro e use o menu **Instalar app** ou **Adicionar à tela inicial**, se disponível.

**iPhone (iOS 16.4 ou superior):** abra no Safari → Compartilhar → **Adicionar à Tela de Início**. Abra pelo ícone instalado e entre no painel.

Em cada aparelho:

1. Toque em **Ativar avisos neste celular**.
2. Permita as notificações solicitadas pelo sistema.
3. Toque em **Testar aviso**. O teste é limitado a um por minuto para evitar repetições.
4. Confira se o telefone exibiu a notificação e se o som está habilitado nas configurações.
5. Se quiser alerta com o painel aberto, toque em **Ativar som do painel**. O navegador exige esse toque para liberar áudio.

O aplicativo não consegue tocar por cima do silencioso, Não Perturbe ou restrições do sistema. Economia de bateria, conexão e configurações do navegador podem atrasar os avisos. A notificação em segundo plano usa o som padrão permitido pelo telefone; um toque personalizado não é garantido.

O som do painel depende da página aberta. O Web Push pode chegar com a página fechada nos aparelhos compatíveis. Fechar à força o navegador, revogar permissões ou remover o app pode interromper a entrega.

**Mantenha o barbeiro conectado no aparelho:** “Sair da conta” também desativa os avisos nesse dispositivo. Depois de entrar novamente, reative-os. Isso evita expor avisos em aparelhos compartilhados.

## 10. Conferir a fila de notificações

Na Netlify, abra **Functions** e confirme a função `push-dispatch` com indicação **Scheduled**. Ela tenta processar a fila a cada minuto. Use **Run now** para um teste manual, se necessário.

A primeira tentativa também ocorre ao confirmar a reserva. Se o provedor não responder, a reserva continua salva e a fila tenta novamente. As tentativas seguintes usam espera progressiva, até seis tentativas. As funções agendadas só rodam automaticamente no deploy de produção, não em previews de branches.

No Supabase:

- `push_subscriptions`: dispositivos que ativaram os avisos.
- `push_jobs`: avisos, com estados `pending`, `sending`, `sent` ou `failed`.
- `sent`: o provedor aceitou o envio; não é confirmação de que houve som no aparelho.
- `failed`: esgotou tentativas. Confira logs, chaves e permissões. Depois de corrigir a causa, um administrador técnico pode recolocar o aviso na fila pelo SQL Editor; isso poderá gerar um aviso repetido.

Em falhas de conexão, um aviso pode se repetir; o sistema usa uma chave por confirmação para evitar duplicar a reserva ao repetir a mesma solicitação.

Não exponha essas tabelas publicamente. O painel informa a quantidade de avisos pendentes/falhos dos dispositivos da própria conta.

## 11. Testar antes de usar com clientes

1. Entre como cliente em uma conta Google diferente da conta administradora.
2. Escolha serviço, profissional, data e horário e confirme.
3. Confira “Meus agendamentos”.
4. Confira se o horário apareceu na agenda do barbeiro correto.
5. Feche o painel no celular e faça outra reserva pelo computador para testar o push real.
6. Tente reservar o mesmo intervalo em dois navegadores: apenas uma reserva deve ser aceita.
7. Cancele uma reserva e confira se o horário ficou disponível.
8. Entre como outro barbeiro: ele não deve ver a agenda alheia.
9. Teste um serviço de 60/90 minutos perto do fim do expediente.
10. Verifique os nomes, preços, contatos, endereço, foto e identidade da barbearia antes de divulgar.

O sistema está preparado para substituir a agenda do Trinks, mas não importa automaticamente os compromissos que já existem lá. Antes da troca, registre os horários futuros ou bloqueie-os aqui. Não mantenha duas agendas independentes aceitando reservas sem sincronização.

## 12. Usar localmente

Copie `.env.example` para `.env.local`, preencha os valores reais e use `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Mantenha as URLs locais autorizadas no Supabase e no Google quando aplicável.

```bash
npm run dev
```

Abra http://localhost:3000. As funções agendadas da Netlify não disparam nesse modo; a primeira tentativa de push continua sendo executada pelo servidor ao confirmar reservas, desde que as chaves estejam configuradas.

Para verificar o projeto:

```bash
npm run typecheck
npm test
npm run build
```

## 13. Resolver problemas comuns

| Problema | Conferência |
|---|---|
| Google retorna erro de redirect | Compare exatamente callback do Supabase no Google e callback do site na lista do Supabase |
| Login funciona, painel não abre | Faça o cadastro de administrador via SQL ou confira o e-mail do barbeiro |
| Catálogo vazio | Execute `02-servicos.sql` no projeto correto |
| Sem horários | Confira serviços do barbeiro, expediente, data, duração e bloqueios |
| Erro “Origem inválida” | `NEXT_PUBLIC_SITE_URL` precisa ser a URL pela qual você abriu o site; refaça deploy após alteração |
| Reserva salva, celular não avisa | Teste permissão, app instalado no iPhone, VAPID, chave de servidor e função agendada |
| Push falha após troca de chaves | Reative notificações nos aparelhos com as novas chaves |
| Netlify exibe página estática/404 | Publique pelo repositório com build Next.js, não por arrastar arquivos HTML |
| Banco informa que tabela já existe | Não reexecute `01-schema.sql` em um projeto já configurado; use migrações para mudanças futuras |

## 14. Entrega ao dono da barbearia

Entregue acesso às contas, domínio, repositório e instruções para administrar a agenda. Combine quem cuidará de suporte, custos de hospedagem, backups e mudanças de preços. Não prometa que notificações tocarão em 100% dos aparelhos: demonstre e teste nos celulares reais da equipe.

## Referências oficiais

- Supabase Google: https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase SSR: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Netlify Next.js: https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- Netlify funções agendadas: https://docs.netlify.com/build/functions/scheduled-functions/
- Apple Web Push: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
