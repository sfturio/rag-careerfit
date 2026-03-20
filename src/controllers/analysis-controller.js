const { extractTextFromPdf } = require("../helpers/pdf-helper");
const { createReportPdfBuffer } = require("../helpers/report-pdf-helper");
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

    const extractedResumeText = await extractTextFromPdf(req.file.buffer);
    const manualResumeText = (req.body.resume_text || "").trim();
    const resumeText =
      extractedResumeText.length >= 80
        ? extractedResumeText
        : `${extractedResumeText}\n${manualResumeText}`.trim();

    if (resumeText.length < 30) {
      return res.status(400).json({
        error:
          "Nao foi possivel extrair texto suficiente do PDF. Envie um PDF com texto selecionavel ou preencha o campo de curriculo em texto."
      });
    }

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
    const safeRole = String(result.targetRole || "career-report")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    const filename = `ragflow-${safeRole || "career-report"}-${String(result.analysisId || "report").slice(0, 8)}.pdf`;
    const pdfBuffer = await createReportPdfBuffer({
      title: `RAGFlow Report - ${result.targetRole || "Career Analysis"}`,
      markdown: result.reportMarkdown || ""
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
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
