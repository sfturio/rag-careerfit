const { env } = require("./env");

const llmConfig = {
  provider: env.llmProvider,
  timeoutMs: env.llmTimeoutMs,
  groq: {
    apiKey: env.groqApiKey,
    model: env.groqModel
  },
  ollama: {
    baseUrl: env.ollamaBaseUrl,
    model: env.ollamaModel
  }
};

module.exports = { llmConfig };
