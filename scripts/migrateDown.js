const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

const migrationsDir = path.join(__dirname, "..", "migrations");

const run = async () => {
  try {
    const { rows } = await pool.query(
      "SELECT filename FROM schema_migrations ORDER BY id DESC LIMIT 1;"
    );

    if (!rows.length) {
      console.log("No migrations to rollback.");
      process.exit(0);
    }

    const filename = rows[0].filename;
    const sql = fs.readFileSync(path.join(migrationsDir, filename), "utf8");

    // Convention: up/down sections in one file, split by marker.
    const marker = "-- //@UNDO";
    if (!sql.includes(marker)) {
      throw new Error(`No undo section found in ${filename}`);
    }

    const downSql = sql.split(marker)[1].trim();
    if (!downSql) {
      throw new Error(`Empty undo SQL in ${filename}`);
    }

    await pool.query("BEGIN");
    await pool.query(downSql);
    await pool.query("DELETE FROM schema_migrations WHERE filename = $1;", [
      filename,
    ]);
    await pool.query("COMMIT");

    console.log(`Rolled back migration: ${filename}`);
    process.exit(0);
  } catch (error) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("Rollback failed:", error.message);
    process.exit(1);
  }
};

run();
