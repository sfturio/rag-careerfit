const { randomUUID } = require("crypto");
const { db } = require("../config/database");
let postgresAnalysesSchemaCache = null;

function safeParsePayload(row) {
  if (!row?.payload_json) return null;
  try {
    return JSON.parse(row.payload_json);
  } catch {
    return null;
  }
}

async function ensurePostgresColumns() {
  const analysesColumns = [
    { name: "target_role", type: "TEXT" },
    { name: "match_score", type: "DOUBLE PRECISION" },
    { name: "weighted_match_score", type: "DOUBLE PRECISION" },
    { name: "payload_json", type: "TEXT" }
  ];
  for (const column of analysesColumns) {
    await db.pool.query(`ALTER TABLE analyses ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
  }

  const feedbackColumns = [
    { name: "created_at", type: "TEXT" },
    { name: "message", type: "TEXT" }
  ];
  for (const column of feedbackColumns) {
    await db.pool.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
  }

  await db.pool.query(`
    UPDATE analyses
    SET
      weighted_match_score = COALESCE(weighted_match_score, match_score, 0),
      payload_json = COALESCE(payload_json, '{}')
  `);
}

function ensureSqliteColumns() {
  const analysesColumns = new Set(
    db.sqlite.prepare("PRAGMA table_info(analyses)").all().map((col) => col.name)
  );
  const analysesMissing = [
    { name: "target_role", type: "TEXT" },
    { name: "match_score", type: "REAL" },
    { name: "weighted_match_score", type: "REAL" },
    { name: "payload_json", type: "TEXT" }
  ].filter((col) => !analysesColumns.has(col.name));
  for (const col of analysesMissing) {
    db.sqlite.exec(`ALTER TABLE analyses ADD COLUMN ${col.name} ${col.type}`);
  }

  const feedbackColumns = new Set(
    db.sqlite.prepare("PRAGMA table_info(feedback)").all().map((col) => col.name)
  );
  const feedbackMissing = [
    { name: "created_at", type: "TEXT" },
    { name: "message", type: "TEXT" }
  ].filter((col) => !feedbackColumns.has(col.name));
  for (const col of feedbackMissing) {
    db.sqlite.exec(`ALTER TABLE feedback ADD COLUMN ${col.name} ${col.type}`);
  }

  db.sqlite.exec(`
    UPDATE analyses
    SET
      weighted_match_score = COALESCE(weighted_match_score, match_score, 0),
      payload_json = COALESCE(payload_json, '{}')
  `);
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function getPostgresAnalysesSchema() {
  if (postgresAnalysesSchemaCache) return postgresAnalysesSchemaCache;
  const result = await db.pool.query(
    `SELECT column_name, is_nullable, data_type, udt_name, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'analyses'
     ORDER BY ordinal_position`
  );
  postgresAnalysesSchemaCache = result.rows;
  return postgresAnalysesSchemaCache;
}

function baseAnalysisRow({ id, createdAt, targetRole, payloadJson, result }) {
  return {
    id,
    created_at: createdAt,
    target_role: targetRole,
    match_score: result.matchScore ?? 0,
    weighted_match_score: result.weightedMatchScore ?? result.matchScore ?? 0,
    payload_json: payloadJson,
    matched_skills_json: JSON.stringify(result.matchedSkills || []),
    missing_skills_json: JSON.stringify(result.missingSkills || []),
    study_plan_json: JSON.stringify(result.studyPlan || []),
    resume_optimization_suggestions_json: JSON.stringify(result.resumeOptimizationSuggestions || []),
    skill_breakdown_json: JSON.stringify(result.skillBreakdown || []),
    report_markdown: result.reportMarkdown || "",
    metadata_json: JSON.stringify(result.metadata || {}),
    llm_json: JSON.stringify(result.llm || { provider: "none", model: "none" }),
    synthesized_summary: result.synthesizedSummary || null
  };
}

function fallbackValueForRequiredColumn(column, context) {
  const colName = String(column.column_name || "");
  const dataType = String(column.data_type || "").toLowerCase();
  const udtName = String(column.udt_name || "").toLowerCase();
  if (colName === "id") return context.id;
  if (colName === "created_at") return context.createdAt;
  if (colName === "target_role") return context.targetRole || "";

  if (dataType.includes("json") || udtName.includes("json")) return "{}";
  if (dataType.includes("character") || dataType === "text") return "";
  if (dataType.includes("timestamp") || dataType === "date") return context.createdAt;
  if (dataType === "boolean") return false;
  if (dataType.includes("int") || dataType.includes("numeric") || dataType.includes("double") || dataType.includes("real")) return 0;
  if (udtName === "uuid") return context.id;
  return null;
}

async function initAnalysisRepository() {
  const analysesDdl = `
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      target_role TEXT,
      match_score REAL NOT NULL,
      weighted_match_score REAL NOT NULL,
      payload_json TEXT NOT NULL
    )
  `;
  const feedbackDdl = `
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      message TEXT NOT NULL
    )
  `;

  if (db.isPostgres) {
    await db.pool.query(analysesDdl);
    await db.pool.query(feedbackDdl);
    await ensurePostgresColumns();
  } else {
    db.sqlite.exec(analysesDdl);
    db.sqlite.exec(feedbackDdl);
    ensureSqliteColumns();
  }
}

async function saveAnalysis(result, targetRole = null) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const payloadJson = JSON.stringify(result);

  if (db.isPostgres) {
    const schema = await getPostgresAnalysesSchema();
    const rowData = baseAnalysisRow({ id, createdAt, targetRole, payloadJson, result });

    for (const column of schema) {
      const name = column.column_name;
      if (Object.prototype.hasOwnProperty.call(rowData, name)) continue;
      const isRequired = column.is_nullable === "NO" && !column.column_default;
      if (!isRequired) continue;
      rowData[name] = fallbackValueForRequiredColumn(column, { id, createdAt, targetRole });
    }

    const insertColumns = schema.map((col) => col.column_name).filter((name) => Object.prototype.hasOwnProperty.call(rowData, name));
    const insertValues = insertColumns.map((name) => rowData[name]);
    const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(", ");
    const sql = `INSERT INTO analyses (${insertColumns.map(quoteIdentifier).join(", ")}) VALUES (${placeholders})`;
    await db.pool.query(sql, insertValues);
  } else {
    db.sqlite
      .prepare(
        `INSERT INTO analyses (id, created_at, target_role, match_score, weighted_match_score, payload_json)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, createdAt, targetRole, result.matchScore, result.weightedMatchScore, payloadJson);
  }

  return id;
}

async function getAnalysisById(id) {
  let row = null;
  if (db.isPostgres) {
    const result = await db.pool.query(`SELECT * FROM analyses WHERE id = $1`, [id]);
    row = result.rows[0] || null;
  } else {
    row = db.sqlite.prepare(`SELECT * FROM analyses WHERE id = ?`).get(id) || null;
  }
  if (!row) return null;

  const parsedPayload = safeParsePayload(row);
  const payload = parsedPayload || {
    matchScore: row.match_score ?? 0,
    weightedMatchScore: row.weighted_match_score ?? row.match_score ?? 0,
    reportMarkdown: row.report_markdown || "",
    llm: { provider: "none", model: "none" }
  };

  return {
    analysisId: row.id,
    createdAt: row.created_at,
    targetRole: row.target_role,
    ...payload
  };
}

async function listAnalyses(limit = 20) {
  let rows = [];
  if (db.isPostgres) {
    const result = await db.pool.query(
      `SELECT id, created_at, target_role, match_score, weighted_match_score
       FROM analyses
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    rows = result.rows;
  } else {
    rows = db.sqlite
      .prepare(
        `SELECT id, created_at, target_role, match_score, weighted_match_score
         FROM analyses
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .all(limit);
  }

  return rows.map((row) => ({
    analysisId: row.id,
    createdAt: row.created_at,
    targetRole: row.target_role,
    matchScore: row.match_score,
    weightedMatchScore: row.weighted_match_score
  }));
}

async function saveFeedback(message) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  if (db.isPostgres) {
    await db.pool.query(
      `INSERT INTO feedback (id, created_at, message)
       VALUES ($1, $2, $3)`,
      [id, createdAt, message]
    );
  } else {
    db.sqlite
      .prepare(
        `INSERT INTO feedback (id, created_at, message)
         VALUES (?, ?, ?)`
      )
      .run(id, createdAt, message);
  }

  return { id, createdAt };
}

module.exports = {
  getAnalysisById,
  initAnalysisRepository,
  listAnalyses,
  saveAnalysis,
  saveFeedback
};
