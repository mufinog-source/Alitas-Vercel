# ALITA’S — segurança e login

## O que foi reforçado
- Login do painel dos funcionários com Supabase Auth.
- O servidor verifica a sessão e confirma o funcionário na tabela `admin_users` antes de permitir ver/alterar pedidos.
- A sessão do painel termina após 30 minutos sem actividade.
- A chave `service_role` só é usada nas funções de servidor; nunca a publiques no HTML.
- Preços e nomes dos produtos são recalculados no servidor a partir de `lib/catalog.js`; o browser não consegue definir o preço.
- Validação de telefone, loja, zona, quantidades, produtos e campos de texto.
- Limite de 5 submissões por IP em cada janela de 10 minutos, guardando apenas um hash do IP.
- Cabeçalhos de segurança, política de conteúdo, protecção contra framing e cache desactivada nas APIs.
- O acompanhamento exige ID e token aleatório de 256 bits.

## Instalação
1. Faz backup do projecto actual.
2. Publica esta pasta na Vercel com Framework Preset `Other` e Output Directory `public`. Mantém `api/` e `lib/` na raiz.
3. No Supabase SQL Editor, executa o ficheiro completo `sql/schema.sql`. Se já tinhas executado a versão antiga, executa novamente o ficheiro actualizado.
4. Na Vercel, define `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` em Environment Variables. A chave service role é segredo absoluto e só pode ficar no servidor.
5. Em `public/admin.html`, coloca o Project URL e a chave pública anon nas duas constantes `SUPABASE_URL` e `SUPABASE_ANON_KEY`. A chave anon é pública; nunca coloques a service role nesse ficheiro.
6. Em Supabase Authentication > Users, cria o utilizador do responsável. Copia o UUID e executa: `insert into public.admin_users (user_id) values ('UUID-AQUI');`
7. Cria contas individuais para os funcionários autorizados. Não partilhes palavras-passe. Activa confirmação de email e MFA no Supabase quando disponível.
8. Faz redeploy e testa login, pedido, actualização e acompanhamento.

## Login
O login é o painel de funcionários em `/admin.html`. O site dos clientes continua a permitir pedidos sem criar conta, usando um link privado de acompanhamento. Não existe ainda uma área de conta/perfil para clientes.

## WhatsApp
A integração continua dependente da configuração oficial WhatsApp Cloud API e das variáveis `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_STAFF_NUMBER`, `WHATSAPP_TEMPLATE_NAME` e `WHATSAPP_TEMPLATE_LANGUAGE`.

## Muito importante antes de produção
- Os preços estão duplicados em `public/index.html` e `lib/catalog.js`; quando alterares preços, actualiza ambos. O servidor usa `lib/catalog.js` como fonte de verdade.
- Taxas de entrega ainda não foram confirmadas. O servidor ignora qualquer taxa enviada pelo browser e deixa a taxa de delivery como `null` até ser configurada.
- Refrescos não têm produtos confirmados.
- O limite de pedidos usa uma função SQL no Supabase; executa o schema actualizado antes de testar.
- Esta é uma base de segurança, não uma auditoria profissional. Antes de receber pagamentos/dados reais, pede revisão técnica e valida as políticas de privacidade e operação com a ALITA’S.
