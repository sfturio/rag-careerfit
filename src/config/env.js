const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = {
  port: toInt(process.env.PORT, 3002),
  databaseUrl: process.env.DATABASE_URL || "",
  sqliteDbPath: process.env.SQLITE_DB_PATH || "data/ragflow.db",
  llmProvider: (process.env.LLM_PROVIDER || "groq").toLowerCase(),
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "llama3.1:8b",
  llmTimeoutMs: toInt(process.env.LLM_TIMEOUT_MS, 30000),
  rootDir: path.resolve(__dirname, "..", "..")
};

module.exports = { env };
