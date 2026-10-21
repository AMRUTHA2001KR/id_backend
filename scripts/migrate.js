const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

const migrationsDir = path.join(__dirname, "..", "migrations");

const ensureMigrationsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
};

const run = async () => {
  try {
    await ensureMigrationsTable();

    const { rows } = await pool.query("SELECT filename FROM schema_migrations;");
    const applied = new Set(rows.map((row) => row.filename));

    const files = fs
      .readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8").split("-- //@UNDO")[0];
      await pool.query("BEGIN");
      await pool.query(sql);
      await pool.query(
        "INSERT INTO schema_migrations(filename) VALUES($1);",
        [file]
      );
      await pool.query("COMMIT");
      console.log(`Applied migration: ${file}`);
    }

    console.log("Migrations are up to date.");
    process.exit(0);
  } catch (error) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("Migration failed:", error.message);
    process.exit(1);
  }
};

run();
