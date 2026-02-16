import pg from "pg";
const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    pool.on("error", (err) => {
      console.error("Unexpected database error:", err);
    });
  }
  return pool;
}

// Get all active member names
export async function getMemberNames() {
  const pool = getPool();
  try {
    const result = await pool.query(
      "SELECT name FROM members WHERE status = 'active' ORDER BY name"
    );
    return result.rows.map(row => row.name);
  } catch (err) {
    console.warn("Could not fetch member names from database:", err);
    return [];
  }
}