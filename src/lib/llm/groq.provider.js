const { llmConfig } = require("../../config/llm");

async function generateWithGroq({ systemPrompt, userPrompt, temperature, maxTokens }) {
  if (!llmConfig.groq.apiKey) {
    throw new Error("GROQ_API_KEY is missing");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), llmConfig.timeoutMs);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${llmConfig.groq.apiKey}`
      },
      body: JSON.stringify({
        model: llmConfig.groq.model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt || "You are a helpful assistant." },
          { role: "user", content: userPrompt }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Groq request failed: ${response.status} ${details}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("Groq returned an empty response");
    }
    return { text, provider: "groq", model: llmConfig.groq.model };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { generateWithGroq };
