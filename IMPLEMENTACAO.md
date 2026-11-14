# ALITA’S — pedidos online, painel e acompanhamento

Este pacote acrescenta ao site existente:
- gravação de pedidos numa base de dados Supabase;
- painel privado para funcionários em `/admin.html`;
- acompanhamento do pedido em `/acompanhar.html`;
- endpoint para notificação da equipa pela WhatsApp Cloud API.

O site antigo já tinha carrinho e checkout, mas a confirmação apenas abria o WhatsApp. Agora o checkout envia o pedido para `/api/orders`.

## 1. Criar o projecto Supabase
1. Cria um projecto em https://supabase.com/ e guarda a palavra-passe da base de dados.
2. No painel Supabase, abre **SQL Editor**.
3. Abre `sql/schema.sql`, copia tudo e executa.
4. Em **Project Settings > API**, copia o Project URL, a chave pública `anon` e a chave secreta `service_role`.

**Segurança:** a `service_role` é secreta. Nunca a coloques no HTML, no GitHub público ou no campo `SUPABASE_ANON_KEY`. Só deve existir nas variáveis de ambiente da Vercel.

## 2. Criar o primeiro acesso de funcionário
1. No Supabase, abre **Authentication > Users** e cria/invida o email do responsável da ALITA’S.
2. Copia o UUID desse utilizador.
3. No SQL Editor executa, substituindo o UUID:

```sql
insert into public.admin_users (user_id)
values ('UUID-DO-FUNCIONARIO');
```

Só utilizadores nesta tabela podem consultar ou alterar pedidos no painel. Repete para cada funcionário autorizado. Não partilhes uma conta entre toda a equipa; cria uma conta por funcionário.

## 3. Configurar a Vercel
1. Importa a pasta deste projecto para a Vercel, ou envia-a para o repositório Git ligado ao projecto actual.
2. Mantém **Framework Preset: Other** e o output directory `public`.
3. Em **Project Settings > Environment Variables**, adiciona:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Faz redeploy depois de guardar as variáveis.

As funções de servidor estão em `api/`. Não movas essa pasta para dentro de `public/`.

## 4. Configurar o painel dos funcionários
1. Abre `public/admin.html`.
2. Substitui `COLOCA_AQUI_SUPABASE_URL` pelo Project URL.
3. Substitui `COLOCA_AQUI_SUPABASE_ANON_KEY` pela chave pública `anon`.
4. Guarda e publica novamente.
5. A equipa entra em `https://TEU-DOMINIO/admin.html` com o email e palavra-passe criados no Supabase.

A chave `anon` pode estar no navegador; a `service_role` nunca. A autorização real do painel é validada no servidor e na tabela `admin_users`.

## 5. WhatsApp da equipa
A notificação automática usa a **WhatsApp Cloud API oficial da Meta**. Não basta pôr o número normal da loja no código.
1. A empresa precisa de configurar uma conta Meta Business e activar WhatsApp Cloud API.
2. Regista/configura o número empresarial e obtém o Phone Number ID e um token de acesso adequado para produção.
3. Cria e obtém aprovação para um template de mensagem chamado `alitas_new_order`, em português, com três variáveis no corpo:
   - `{{1}}` — referência do pedido;
   - `{{2}}` — nome do cliente;
   - `{{3}}` — total em MT.
4. Adiciona na Vercel `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_STAFF_NUMBER`, `WHATSAPP_TEMPLATE_NAME` e `WHATSAPP_TEMPLATE_LANGUAGE`.
5. Faz redeploy e testa com um pedido real de valor baixo.

O destinatário configurado é um número individual da equipa. A Cloud API não envia automaticamente para grupos normais de WhatsApp. A Meta pode exigir templates aprovados para mensagens iniciadas pela empresa. Até a API estar configurada, os pedidos ficam guardados e aparecem no painel, mas não há alerta automático no WhatsApp.

## 6. Testar o fluxo completo
1. Abre o site público, adiciona um produto e faz um pedido de teste.
2. Confirma que aparece uma referência e um link privado de acompanhamento.
3. Abre `/admin.html`, entra com uma conta autorizada e confirma que o pedido aparece.
4. Altera o estado para **Confirmado** ou **Em preparação**.
5. Abre o link de acompanhamento do cliente e confirma que o estado mudou. A página actualiza a cada 15 segundos.
6. Confirma o alerta WhatsApp depois de configurar e aprovar a integração Meta.

## Notas importantes antes de produção
- Os preços e produtos continuam a vir do HTML existente. Confirma com a ALITA’S se estão correctos.
- As taxas de entrega estão `null` no site original. O cliente verá “a confirmar”; o total guardado não inclui uma taxa ainda não definida.
- A categoria Refrescos continua sem produtos/preços confirmados.
- O painel actualiza por consulta periódica a cada 15 segundos, não por WebSocket instantâneo.
- O cliente acompanha o estado por link privado. O link contém um token aleatório; deve ser tratado como informação privada.
- Antes de receber pagamentos ou dados reais, a ALITA’S deve validar preços, taxas, lojas, política de privacidade, acessos dos funcionários e procedimento de cancelamento.
