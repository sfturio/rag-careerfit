# RAGFlow Engine

Ferramenta gratuita da **AI Career Suite** para análise semântica de currículo versus vaga.  
Projeto de portfólio com foco em clareza de arquitetura, utilidade prática e explicabilidade.

## O que o app entrega
- Match score entre currículo e vaga
- Skills aderentes e skills em lacuna
- Insights de melhoria de posicionamento
- Plano de estudo resumido
- Relatório em Markdown
- Histórico local das análises

## Princípios do projeto
- Sem microserviços
- Sem autenticação
- Sem billing
- Sem filas
- Estrutura limpa e fácil de explicar em entrevista

## Stack
- Node.js + Express
- SQLite por padrão
- Postgres/Supabase via `DATABASE_URL`
- Parser de PDF
- Frontend leve servido pelo backend

## Arquitetura
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

Responsabilidades:
- `controllers`: entrada HTTP e validação básica
- `services`: orquestração do fluxo principal
- `engines`: matching semântico + regras determinísticas
- `repositories`: persistência isolada
- `lib/llm`: provider único com fallback

## LLM (com fallback resiliente)
Ordem de execução:
1. Groq (`llama-3.1-8b-instant`)
2. Ollama local (`llama3.1:8b`)
3. Fluxo determinístico

Se o LLM falhar, a análise principal continua.

## Endpoints
- `GET /health`
- `GET /`
- `POST /api/v1/analyze`
- `POST /api/v1/analyze/pdf`
- `GET /api/v1/analyses`
- `GET /api/v1/analyses/:id`
- `GET /api/v1/analyses/:id/report`
- `POST /api/v1/feedback`

## Rodar localmente
```bash
npm install
npm run dev
```

Padrão: `http://localhost:3002`

## Variáveis de ambiente
Use `.env.example` como base:

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

### Supabase (opcional)
Se definir `DATABASE_URL`, o app usa Postgres/Supabase.  
Sem `DATABASE_URL`, usa SQLite local.

Exemplo:
```env
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

## Deploy (Render)
- Build command: `npm install`
- Start command: `npm start`
- Configurar no serviço:
  - `DATABASE_URL` (opcional)
  - `GROQ_API_KEY` (opcional)

`render.yaml` já incluído no repositório.

## Limitações conhecidas
- Não garante aprovação em vagas
- Qualidade da análise depende da qualidade dos dados de entrada
- A camada de IA é assistiva, não substitui revisão humana

## Licença de uso do projeto
Projeto de portfólio para demonstração e uso gratuito.
