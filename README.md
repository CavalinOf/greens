# Amigo Secreto GREENS

## Como publicar na Vercel
1. Suba esta pasta para um repositório no GitHub (ou use `vercel` na pasta).
2. Na Vercel, importe o projeto.
3. Em **Storage / Marketplace**, adicione **Upstash Redis** (plano grátis) e conecte ao projeto.
   Isso cria sozinho as variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN`.
4. Em **Settings > Environment Variables**, crie `ADMIN_PASSWORD` com a senha que só você vai usar.
5. Faça o deploy (ou Redeploy, se já tinha feito).

## Como usar
- Mande o link para o grupo: cada um digita nome + PIN e entra na lista.
- Quando todos entrarem, clique em "organizador" no rodapé, digite sua senha e sorteie.
- Cada um volta ao site, digita nome + PIN e clica em "Ver meu amigo secreto".
