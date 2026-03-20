const pdfParse = require("pdf-parse");

async function extractTextFromPdf(buffer) {
  const parsed = await pdfParse(buffer);
  return (parsed.text || "").replace(/\s+\n/g, "\n").trim();
}

module.exports = { extractTextFromPdf };
