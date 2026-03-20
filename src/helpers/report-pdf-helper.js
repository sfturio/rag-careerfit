const PDFDocument = require("pdfkit");

function cleanLine(line = "") {
  return String(line).replace(/\r/g, "").trim();
}

function addMarkdownLine(doc, line) {
  const text = cleanLine(line);
  if (!text) {
    doc.moveDown(0.5);
    return;
  }

  if (text.startsWith("# ")) {
    doc.font("Helvetica-Bold").fontSize(18).text(text.replace(/^#\s+/, ""));
    doc.moveDown(0.3);
    return;
  }

  if (text.startsWith("## ")) {
    doc.font("Helvetica-Bold").fontSize(14).text(text.replace(/^##\s+/, ""));
    doc.moveDown(0.2);
    return;
  }

  if (text.startsWith("### ")) {
    doc.font("Helvetica-Bold").fontSize(12).text(text.replace(/^###\s+/, ""));
    doc.moveDown(0.15);
    return;
  }

  if (text.startsWith("- ")) {
    doc.font("Helvetica").fontSize(11).text(`• ${text.replace(/^-+\s*/, "")}`, {
      indent: 10
    });
    return;
  }

  doc.font("Helvetica").fontSize(11).text(text);
}

function createReportPdfBuffer({ title, markdown }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 48, bottom: 48, left: 48, right: 48 },
      info: {
        Title: title || "RAGFlow Report",
        Author: "RAGFlow Engine"
      }
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(16).text(title || "RAGFlow Report");
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(10).fillColor("#6B7280").text(new Date().toISOString());
    doc.fillColor("#111827");
    doc.moveDown(0.8);

    const lines = String(markdown || "")
      .split("\n")
      .map((line) => line.replace(/\*\*/g, ""))
      .map((line) => line.replace(/`/g, ""));

    for (const line of lines) {
      addMarkdownLine(doc, line);
    }

    doc.end();
  });
}

module.exports = { createReportPdfBuffer };

