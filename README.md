# RAGFlow Engine

RAGFlow Engine e um projeto de portfolio da AI Career Suite para analise semantica e contextual de curriculo vs vaga.
A ferramenta e gratuita e combina regras deterministicas com assistencia opcional de LLM.

## Posicionamento
- Projeto de portfolio + uso gratuito
- Nao promete precisao perfeita
- Sem microservicos, sem autenticacao, sem billing, sem filas

## Stack
- Node.js + Express
- SQLite por padrao
- Postgres/Supabase por `DATABASE_URL`
- Frontend web simples (baseado no Stitch)
- Upload de PDF e relatorio em Markdown

## Frontend
Telas implementadas com base no Stitch:
- Match Analysis
- Career Result
- History

## Backend e arquitetura
Estrutura principal:
```txt
src/
  app.js
  server.js
  config/
  controllers/
  routes/
  services/
  engines/
  repositories/
  helpers/
  utils/
  middlewares/
  prompts/
  lib/llm/
  public/
```

Fluxo:
- controllers recebem request/response
- services orquestram
- engines aplicam matching semantico/contextual
- repositories isolam persistencia

## Endpoints
- `GET /health`
- `GET /`
- `POST /api/v1/analyze`
- `POST /api/v1/analyze/pdf`
- `GET /api/v1/analyses`
- `GET /api/v1/analyses/:id`
- `GET /api/v1/analyses/:id/report`

## LLM padrao com fallback
Ordem de execucao:
1. Groq (`llama-3.1-8b-instant`)
2. Ollama local (`llama3.1:8b`)
3. Fallback deterministico

Se o LLM falhar, o fluxo principal continua funcionando.

## Rodar localmente
```bash
npm install
npm run dev
```

Padrao: `http://localhost:3002`

## Variaveis de ambiente
Use `.env.example`:
```env
PORT=3002
DATABASE_URL=
# Supabase example (session pooler):
# DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
SQLITE_DB_PATH=data/ragflow.db
LLM_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
LLM_TIMEOUT_MS=30000
```

## Usar Supabase
1. Copie a connection string Postgres do Supabase (pooler).
2. Garanta `?sslmode=require`.
3. Defina `DATABASE_URL`.
4. Reinicie o app.

## Deploy no Render
- O projeto inclui `render.yaml`
- Build: `npm install`
- Start: `npm start`
- Configure no Render:
  - `DATABASE_URL` (Supabase)
  - `GROQ_API_KEY` (se usar Groq)

## Limitacoes conhecidas
- Similaridade semantica local e simplificada para manter custo baixo.
- Evidencias podem variar com a qualidade do texto extraido.
- LLM melhora legibilidade, mas nao substitui validacao humana.
