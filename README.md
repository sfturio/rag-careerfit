# RAGFlow Engine

Projeto de portfólio e ferramenta gratuita para análise de aderência entre currículo e vaga com foco semântico e contextual, mantendo o backend simples e explicável.

## Princípios
- Não promete precisão perfeita.
- Separa camada determinística da camada generativa.
- Usa LLM para síntese e sugestões, sem dependência total do modelo.
- Sem microserviços, sem autenticação, sem billing, sem filas.

## Stack
- Node.js + Express
- SQLite por padrão
- Postgres/Supabase por `DATABASE_URL`
- Parser de PDF para upload de currículo
- Relatórios em Markdown

## Estrutura
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
  views/
data/
reports/
uploads/
```

## Como rodar localmente
```bash
npm install
npm run dev
```

Servidor padrão: `http://localhost:3002`

## Endpoints principais
- `GET /health`
- `GET /`
- `POST /api/v1/analyze`
- `POST /api/v1/analyze/pdf`
- `GET /api/v1/analyses`
- `GET /api/v1/analyses/:id`
- `GET /api/v1/analyses/:id/report`

## Exemplo de payload
`POST /api/v1/analyze`
```json
{
  "resume_text": "resume content...",
  "job_description": "job description content...",
  "target_role": "Backend Engineer"
}
```

## LLM padrão com fallback
Ordem:
1. Groq com `llama-3.1-8b-instant`
2. Ollama local com `llama3.1:8b`
3. Fallback determinístico (continua funcionando sem quebrar)

Logs mínimos indicam provider/model usado.

## Variáveis de ambiente
Use `.env.example`:
```env
PORT=3002
DATABASE_URL=
SQLITE_DB_PATH=data/ragflow.db
LLM_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
LLM_TIMEOUT_MS=30000
```

## Limitações conhecidas
- Similaridade semântica local é simplificada para manter custo e complexidade baixos.
- Evidências podem variar conforme qualidade do texto extraído do PDF.
- LLM pode melhorar legibilidade da saída, mas não substitui validação humana.

## Por que arquitetura simples
Foi adotada uma arquitetura em camadas leves (`controllers -> services -> engines/repositories`) para facilitar manutenção, explicação em entrevista e evolução incremental sem over engineering.
