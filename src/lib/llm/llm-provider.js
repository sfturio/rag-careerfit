const { llmConfig } = require("../../config/llm");
const { generateWithGroq } = require("./groq.provider");
const { generateWithOllama } = require("./ollama.provider");

const providers = {
  groq: generateWithGroq,
  ollama: generateWithOllama
};

function getProviderOrder() {
  const primary = llmConfig.provider === "ollama" ? "ollama" : "groq";
  return primary === "groq" ? ["groq", "ollama"] : ["ollama", "groq"];
}

async function generateText({
  systemPrompt = "You are a helpful assistant.",
  userPrompt,
  temperature = 0.2,
  maxTokens = 600
}) {
  if (!userPrompt) {
    throw new Error("userPrompt is required");
  }

  const attempted = [];
  for (const providerName of getProviderOrder()) {
    try {
      const generator = providers[providerName];
      const response = await generator({ systemPrompt, userPrompt, temperature, maxTokens });
      console.info(`[llm] provider=${response.provider} model=${response.model}`);
      return { ...response, attempted };
    } catch (error) {
      attempted.push({ provider: providerName, error: error.message });
    }
  }

  console.warn("[llm] all providers failed, using deterministic fallback");
  return {
    text: null,
    provider: "none",
    model: "none",
    attempted
  };
}

module.exports = { generateText };
