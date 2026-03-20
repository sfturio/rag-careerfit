const { llmConfig } = require("../../config/llm");

async function generateWithOllama({ systemPrompt, userPrompt, temperature, maxTokens }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), llmConfig.timeoutMs);

  try {
    const prompt = `${systemPrompt || "You are a helpful assistant."}\n\n${userPrompt}`;
    const response = await fetch(`${llmConfig.ollama.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: llmConfig.ollama.model,
        prompt,
        stream: false,
        options: {
          temperature,
          num_predict: maxTokens
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Ollama request failed: ${response.status} ${details}`);
    }

    const data = await response.json();
    const text = data?.response?.trim();
    if (!text) {
      throw new Error("Ollama returned an empty response");
    }
    return { text, provider: "ollama", model: llmConfig.ollama.model };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { generateWithOllama };
