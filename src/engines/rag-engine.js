const { normalizeText, clampScore } = require("../utils/text-utils");

const SKILL_PATTERNS = {
  "c#": [/(\b|^)c#(\b|$)/i, /\bcsharp\b/i],
  ".net": [/\b\.net\b/i, /\bdotnet\b/i, /\basp\.net\b/i],
  "asp.net core": [/\basp\.net core\b/i, /\baspnet core\b/i],
  "entity framework": [/\bentity framework\b/i, /\bef core\b/i],
  sql: [/\bsql\b/i],
  postgresql: [/\bpostgresql\b/i, /\bpostgres\b/i],
  python: [/\bpython\b/i],
  fastapi: [/\bfastapi\b/i],
  docker: [/\bdocker\b/i],
  kubernetes: [/\bkubernetes\b/i, /\bk8s\b/i],
  aws: [/\baws\b/i, /\bamazon web services\b/i],
  azure: [/\bazure\b/i],
  "github actions": [/\bgithub actions\b/i],
  "ci/cd": [/\bci\/cd\b/i, /\bcontinuous integration\b/i],
  "rest api": [/\brest api\b/i, /\bapi rest\b/i],
  microservices: [/\bmicroservices\b/i],
  redis: [/\bredis\b/i],
  rag: [/\brag\b/i, /\bretrieval augmented generation\b/i],
  nlp: [/\bnlp\b/i]
};

const SECTION_WEIGHTS = {
  requisitos: { normalized: "requisitos", weight: 1.0 },
  requirements: { normalized: "requisitos", weight: 1.0 },
  responsabilidades: { normalized: "atribuicoes", weight: 0.85 },
  atribuicoes: { normalized: "atribuicoes", weight: 0.85 },
  diferenciais: { normalized: "diferenciais", weight: 0.55 },
  "nice to have": { normalized: "diferenciais", weight: 0.55 }
};

const RESOURCES_BY_SKILL = {
  ".net": ["Microsoft Learn - .NET", ".NET documentation"],
  "asp.net core": ["ASP.NET Core docs", "Minimal APIs and MVC tutorials"],
  "entity framework": ["EF Core docs", "EF Core in Action"],
  aws: ["AWS Skill Builder", "AWS Well-Architected Framework"],
  azure: ["Microsoft Learn - Azure", "Azure Architecture Center"],
  docker: ["Docker Docs", "Play with Docker"],
  kubernetes: ["Kubernetes Docs", "Kubernetes Basics"],
  "ci/cd": ["GitHub Actions Docs", "CI/CD Best Practices"],
  rag: ["Pinecone Learn - RAG", "OpenAI cookbook (RAG patterns)"]
};

function hasSkill(text, skill) {
  const patterns = SKILL_PATTERNS[skill] || [new RegExp(`\\b${skill}\\b`, "i")];
  return patterns.some((pattern) => pattern.test(text));
}

function extractSkills(text = "") {
  const normalized = normalizeText(text);
  return Object.keys(SKILL_PATTERNS).filter((skill) => hasSkill(normalized, skill));
}

function extractWeightedJobSkills(jobDescription = "") {
  const lines = jobDescription.split("\n").map((line) => line.trim()).filter(Boolean);
  const weighted = new Map();
  let sectionName = "geral";
  let sectionWeight = 0.75;

  for (const line of lines) {
    const normalized = normalizeText(line);
    for (const [sectionKey, data] of Object.entries(SECTION_WEIGHTS)) {
      if (normalized.includes(sectionKey)) {
        sectionName = data.normalized;
        sectionWeight = data.weight;
      }
    }

    const lineSkills = extractSkills(line);
    for (const skill of lineSkills) {
      const current = weighted.get(skill);
      if (!current || sectionWeight > current.weight) {
        weighted.set(skill, { weight: sectionWeight, section: sectionName });
      }
    }
  }

  if (!weighted.size) {
    for (const skill of extractSkills(jobDescription).slice(0, 8)) {
      weighted.set(skill, { weight: 1.0, section: "geral" });
    }
  }

  return [...weighted.entries()].map(([skill, value]) => ({
    skill,
    weight: value.weight,
    sourceSection: value.section
  }));
}

function chunkText(text, chunkSize = 420, overlap = 90) {
  const cleaned = text.replace(/\r\n/g, "\n");
  if (!cleaned.trim()) return [];
  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(cleaned.length, start + chunkSize);
    chunks.push(cleaned.slice(start, end).replace(/\s+/g, " ").trim());
    if (end === cleaned.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter(Boolean);
}

function tokenSet(text) {
  return new Set((normalizeText(text).match(/[a-z0-9+#.]{2,}/g) || []).slice(0, 250));
}

function jaccardSimilarity(aText, bText) {
  const a = tokenSet(aText);
  const b = tokenSet(bText);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union ? intersection / union : 0;
}

function searchEvidence(resumeText, skill) {
  const chunks = chunkText(resumeText).map((chunk, index) => ({
    chunkId: `c${index + 1}`,
    text: chunk,
    score: jaccardSimilarity(chunk, `${skill} backend project experience`)
  }));

  chunks.sort((a, b) => b.score - a.score);
  const best = chunks.find((item) => hasSkill(normalizeText(item.text), skill)) || chunks[0] || null;
  if (!best) return null;
  return {
    evidence: best.text.length > 220 ? `${best.text.slice(0, 220).trim()}...` : best.text,
    evidenceChunk: best.chunkId,
    evidenceScore: Number(best.score.toFixed(2))
  };
}

function buildSkillBreakdown(requiredSkills, resumeText) {
  const normalizedResume = normalizeText(resumeText);
  return requiredSkills.map((item) => {
    const present = hasSkill(normalizedResume, item.skill);
    const evidence = present ? searchEvidence(resumeText, item.skill) : null;

    return {
      skill: item.skill,
      presentInResume: present,
      weight: item.weight,
      sourceSection: item.sourceSection,
      evidence: evidence ? evidence.evidence : present ? `Mention found for ${item.skill}.` : null,
      evidenceChunk: evidence ? evidence.evidenceChunk : null,
      evidenceScore: evidence ? evidence.evidenceScore : null
    };
  });
}

function buildStudyPlan(prioritizedMissing) {
  if (!prioritizedMissing.length) {
    return [
      {
        week: 1,
        focus: "Portfolio and interview readiness",
        actions: [
          "Prepare two concise case studies with measurable outcomes.",
          "Rehearse STAR-based answers for technical interviews."
        ],
        resources: ["STAR Method Guide", "Pramp"]
      }
    ];
  }

  const top = prioritizedMissing.map((item) => item.skill).slice(0, 3);
  const [s1, s2 = top[0], s3 = s2] = top;

  const resourcesFor = (skills) => {
    const resources = [];
    for (const skill of skills) {
      resources.push(...(RESOURCES_BY_SKILL[skill] || [`Official docs for ${skill}`]));
    }
    return [...new Set(resources)].slice(0, 4);
  };

  return [
    {
      week: 1,
      focus: `Critical gap baseline: ${s1}`,
      actions: [
        `Review core concepts and practical patterns for ${s1}.`,
        `Complete two exercises directly using ${s1}.`,
        "Document learnings in a public GitHub note."
      ],
      resources: resourcesFor([s1])
    },
    {
      week: 2,
      focus: `Hands-on project with ${s1} and ${s2}`,
      actions: [
        `Build a small backend feature combining ${s1} and ${s2}.`,
        "Write architecture notes and tradeoff decisions.",
        "Publish a short demo and project summary."
      ],
      resources: resourcesFor([s1, s2])
    },
    {
      week: 3,
      focus: `Quality and integration with ${s2}/${s3}`,
      actions: [
        "Add testing and validation around the feature.",
        `Integrate with a realistic backend flow that uses ${s3}.`,
        "Track quality indicators (errors, latency, test pass rate)."
      ],
      resources: resourcesFor([s2, s3])
    },
    {
      week: 4,
      focus: "Resume and interview packaging",
      actions: [
        `Update resume with concrete outcomes linked to ${s1} and ${s2}.`,
        "Prepare five interview stories using STAR format.",
        "Apply to target roles and track recruiter feedback."
      ],
      resources: ["LinkedIn Jobs", "STAR Method Guide", "GitHub"]
    }
  ];
}

function buildDeterministicSuggestions(targetRole, missingSkills) {
  const base = [
    `Rewrite your summary to align with ${targetRole || "the target role"} outcomes.`,
    "Add projects with measurable impact and business context.",
    "Organize the technical stack by category (languages, cloud, data, testing)."
  ];
  if (missingSkills.length) {
    base.push(`Prioritize missing competencies: ${missingSkills.slice(0, 5).join(", ")}.`);
  }
  return base;
}

function buildReport({
  targetRole,
  matchScore,
  weightedMatchScore,
  matchedSkills,
  missingSkills,
  skillBreakdown,
  studyPlan
}) {
  const lines = [
    `# Career Fit Report - ${targetRole || "Backend Developer"}`,
    "",
    `- Match score: **${matchScore}%**`,
    `- Weighted match score: **${weightedMatchScore}%**`,
    `- Matched skills: **${matchedSkills.length}**`,
    `- Missing skills: **${missingSkills.length}**`,
    "",
    "## Matched skills",
    ...(matchedSkills.length ? matchedSkills.map((skill) => `- ${skill}`) : ["- None"]),
    "",
    "## Missing skills",
    ...(missingSkills.length ? missingSkills.map((skill) => `- ${skill}`) : ["- None"]),
    "",
    "## Evidence (RAG-like retrieval)"
  ];

  const evidenceItems = skillBreakdown.filter((item) => item.presentInResume && item.evidence);
  for (const item of evidenceItems.slice(0, 10)) {
    const meta = [];
    if (item.evidenceChunk) meta.push(`chunk ${item.evidenceChunk}`);
    if (item.evidenceScore !== null && item.evidenceScore !== undefined) {
      meta.push(`score ${item.evidenceScore}`);
    }
    lines.push(`- ${item.skill}${meta.length ? ` (${meta.join(" | ")})` : ""}: ${item.evidence}`);
  }
  if (!evidenceItems.length) lines.push("- No relevant evidence found.");

  lines.push("", "## Study plan");
  for (const week of studyPlan) {
    lines.push(`### Week ${week.week} - ${week.focus}`);
    for (const action of week.actions) lines.push(`- ${action}`);
  }

  return lines.join("\n");
}

function analyzeResumeVsJob({ resumeText, jobDescription, targetRole }) {
  const requiredSkills = extractWeightedJobSkills(jobDescription);
  const skillBreakdown = buildSkillBreakdown(requiredSkills, resumeText);
  const matchedSkills = skillBreakdown.filter((item) => item.presentInResume).map((item) => item.skill);
  const missingSkills = skillBreakdown.filter((item) => !item.presentInResume).map((item) => item.skill);
  const matchScore = requiredSkills.length
    ? clampScore((matchedSkills.length / requiredSkills.length) * 100)
    : 0;
  const totalWeight = requiredSkills.reduce((sum, item) => sum + item.weight, 0) || 1;
  const matchedWeight = skillBreakdown
    .filter((item) => item.presentInResume)
    .reduce((sum, item) => sum + item.weight, 0);
  const weightedMatchScore = clampScore((matchedWeight / totalWeight) * 100);

  const prioritizedMissing = skillBreakdown
    .filter((item) => !item.presentInResume)
    .sort((a, b) => b.weight - a.weight)
    .map((item) => ({ skill: item.skill, weight: item.weight, section: item.sourceSection }));

  const studyPlan = buildStudyPlan(prioritizedMissing);
  const suggestions = buildDeterministicSuggestions(targetRole, missingSkills);
  const reportMarkdown = buildReport({
    targetRole,
    matchScore,
    weightedMatchScore,
    matchedSkills,
    missingSkills,
    skillBreakdown,
    studyPlan
  });

  return {
    matchScore,
    weightedMatchScore,
    matchedSkills,
    missingSkills,
    skillBreakdown,
    studyPlan,
    resumeOptimizationSuggestions: suggestions,
    reportMarkdown
  };
}

module.exports = { analyzeResumeVsJob };
