const { randomUUID } = require("crypto");
const { db } = require("../config/database");

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
    await db.pool.query(
      `INSERT INTO analyses (id, created_at, target_role, match_score, weighted_match_score, payload_json)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, createdAt, targetRole, result.matchScore, result.weightedMatchScore, payloadJson]
    );
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
