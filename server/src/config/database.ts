import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase
  },
});

pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle client", err);
  process.exit(-1);
});

/**
 * Tests database connection once at startup
 */
export const testConnection = async (): Promise<void> => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Connected to PostgreSQL database");
  } catch (error) {
    console.error("❌ Failed to connect to PostgreSQL database", error);
    process.exit(-1);
  }
};

export default pool;
