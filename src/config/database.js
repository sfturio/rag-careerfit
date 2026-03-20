const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { Pool } = require("pg");
const { env } = require("./env");

const isPostgres = /^postgres(ql)?:\/\//i.test(env.databaseUrl);

let sqlite = null;
let pool = null;

if (isPostgres) {
  pool = new Pool({ connectionString: env.databaseUrl });
} else {
  const absolutePath = path.isAbsolute(env.sqliteDbPath)
    ? env.sqliteDbPath
    : path.resolve(env.rootDir, env.sqliteDbPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  sqlite = new DatabaseSync(absolutePath);
  sqlite.exec("PRAGMA journal_mode = WAL;");
}

const db = { isPostgres, sqlite, pool };

module.exports = { db };


