const { analyzeResumeVsJob } = require("../engines/rag-engine");
const {
  getAnalysisById,
  listAnalyses,
  saveAnalysis,
  saveFeedback
} = require("../repositories/analysis-repository");
const { generateText } = require("../lib/llm");
const {
  RAG_FEEDBACK_SYSTEM_PROMPT,
  buildRagFeedbackPrompt
} = require("../prompts/rag-feedback.prompt");

function applyLlmAssist(baseResult, llmText) {
  if (!llmText) return baseResult;

  const normalizeSummary = (value) =>
    String(value || "")
      .replace(/[*_`>#]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const isMeaningfulSummary = (value) => {
    const clean = normalizeSummary(value).replace(/:$/, "").trim();
    if (!clean) return false;
    if (/^s[ií]ntese$/i.test(clean)) return false;
    if (/^resumo$/i.test(clean)) return false;
    return true;
  };

  const lines = llmText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^#{1,6}\s/.test(line));
  if (!lines.length) return baseResult;

  const summaryLine = lines.find((line) => !line.startsWith("-") && isMeaningfulSummary(line)) || "";
  return {
    ...baseResult,
    synthesizedSummary: summaryLine || null
  };
}

async function runAnalysis({ resumeText, jobDescription, targetRole }) {
  const deterministic = analyzeResumeVsJob({ resumeText, jobDescription, targetRole });

  const llmResponse = await generateText({
    systemPrompt: RAG_FEEDBACK_SYSTEM_PROMPT,
    userPrompt: buildRagFeedbackPrompt({
      targetRole,
      matchedSkills: deterministic.matchedSkills,
      missingSkills: deterministic.missingSkills,
      weightedMatchScore: deterministic.weightedMatchScore
    }),
    temperature: 0.2,
    maxTokens: 500
  });

  const finalResult = applyLlmAssist(deterministic, llmResponse.text);
  finalResult.llm = {
    provider: llmResponse.provider,
    model: llmResponse.model
  };

  const analysisId = await saveAnalysis(finalResult, targetRole || null);
  return getAnalysisById(analysisId);
}

async function getAnalyses(limit = 20) {
  return listAnalyses(limit);
}

async function createFeedback(message) {
  return saveFeedback(message);
}

module.exports = {
  getAnalysisById,
  getAnalyses,
  runAnalysis,
  createFeedback
};
