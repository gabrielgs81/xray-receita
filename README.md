# Gym X-Ray Receita

Produto independente do ecossistema Gym X-Ray para diagnosticar oportunidades de receita em academias.

## Escopo do MVP

- Funil financeiro em cinco etapas, com persistência e rastreamento de abandono.
- Cálculo determinístico de ticket realizado, churn e oportunidades de preço, retenção e inadimplência.
- Pesquisa regional com fontes públicas, preços anunciados e presença pública no Wellhub.
- Prévia do diagnóstico e área bloqueada preparada para monetização.

## Ambiente

Copie `.env.example` para `.env.local` e informe as credenciais públicas do Supabase.

```bash
npm install
npm run dev
```

O segredo da OpenAI permanece somente no Supabase Edge Functions.
