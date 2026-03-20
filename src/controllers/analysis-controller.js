const { extractTextFromPdf } = require("../helpers/pdf-helper");
const {
  createFeedback,
  getAnalyses,
  getAnalysisById,
  runAnalysis
} = require("../services/analysis-service");

function validateAnalyzeInput(body) {
  const resumeText = (body.resume_text || "").trim();
  const jobDescription = (body.job_description || "").trim();
  const targetRole = (body.target_role || "").trim();

  if (resumeText.length < 30) return { error: "resume_text must have at least 30 characters" };
  if (jobDescription.length < 30) return { error: "job_description must have at least 30 characters" };

  return { data: { resumeText, jobDescription, targetRole: targetRole || null } };
}

async function analyze(req, res, next) {
  try {
    const { error, data } = validateAnalyzeInput(req.body);
    if (error) return res.status(400).json({ error });
    const result = await runAnalysis(data);
    return res.json(result);
  } catch (errorCaught) {
    return next(errorCaught);
  }
}

async function analyzePdf(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "resume_pdf is required" });

    const resumeText = await extractTextFromPdf(req.file.buffer);
    const payload = {
      resume_text: resumeText,
      job_description: req.body.job_description,
      target_role: req.body.target_role
    };
    const { error, data } = validateAnalyzeInput(payload);
    if (error) return res.status(400).json({ error });
    const result = await runAnalysis(data);
    return res.json(result);
  } catch (errorCaught) {
    return next(errorCaught);
  }
}

async function listHistory(req, res, next) {
  try {
    const limitRaw = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;
    const items = await getAnalyses(limit);
    return res.json(items);
  } catch (errorCaught) {
    return next(errorCaught);
  }
}

async function getHistoryItem(req, res, next) {
  try {
    const result = await getAnalysisById(req.params.id);
    if (!result) return res.status(404).json({ error: "Analysis not found" });
    return res.json(result);
  } catch (errorCaught) {
    return next(errorCaught);
  }
}

async function getReport(req, res, next) {
  try {
    const result = await getAnalysisById(req.params.id);
    if (!result) return res.status(404).json({ error: "Analysis not found" });
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    return res.send(result.reportMarkdown);
  } catch (errorCaught) {
    return next(errorCaught);
  }
}

async function submitFeedback(req, res, next) {
  try {
    const message = (req.body?.message || "").trim();
    if (message.length < 3) {
      return res.status(400).json({ error: "message deve ter pelo menos 3 caracteres" });
    }
    const saved = await createFeedback(message);
    return res.status(201).json({ ok: true, feedbackId: saved.id, createdAt: saved.createdAt });
  } catch (errorCaught) {
    return next(errorCaught);
  }
}

module.exports = {
  analyze,
  analyzePdf,
  getHistoryItem,
  getReport,
  listHistory,
  submitFeedback
};
