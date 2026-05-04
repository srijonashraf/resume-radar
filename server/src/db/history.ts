import pool from "../config/database.js";

// ── Types ──────────────────────────────────────────────────

export interface HistoryListItem {
  id: string;
  originalFileName: string | null;
  sourceType: string;
  sectionCount: number;
  hasTailoring: boolean;
  createdAt: string;
}

export interface HistoryListResult {
  items: HistoryListItem[];
  total: number;
  page: number;
  limit: number;
}

// ── List ───────────────────────────────────────────────────

export async function getHistoryList(
  userId: string,
  page = 1,
  limit = 10,
): Promise<HistoryListResult> {
  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    "SELECT COUNT(*)::int AS count FROM public.resume_analyses WHERE user_id = $1",
    [userId],
  );

  const total = countResult.rows[0].count;

  const result = await pool.query(
    `SELECT
       ra.id,
       ra.original_file_name,
       ra.source_type,
       ra.created_at,
       (SELECT COUNT(*)::int FROM public.resume_sections rs WHERE rs.analysis_id = ra.id) AS section_count,
       EXISTS (SELECT 1 FROM public.resume_tailor_rewrites rtr WHERE rtr.analysis_id = ra.id LIMIT 1) AS has_tailoring
     FROM public.resume_analyses ra
     WHERE ra.user_id = $1
     ORDER BY ra.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );

  const items: HistoryListItem[] = result.rows.map((row) => ({
    id: row.id,
    originalFileName: row.original_file_name,
    sourceType: row.source_type,
    sectionCount: row.section_count,
    hasTailoring: row.has_tailoring,
    createdAt: row.created_at,
  }));

  return { items, total, page, limit };
}

// ── Detail ─────────────────────────────────────────────────

export async function getHistoryDetail(
  analysisId: string,
  userId: string,
): Promise<{ id: string; originalFileName: string | null; sourceType: string; createdAt: string } | null> {
  const result = await pool.query(
    "SELECT id, original_file_name, source_type, created_at FROM public.resume_analyses WHERE id = $1 AND user_id = $2",
    [analysisId, userId],
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    originalFileName: row.original_file_name,
    sourceType: row.source_type,
    createdAt: row.created_at,
  };
}

// ── Delete ─────────────────────────────────────────────────

export async function deleteHistoryEntry(
  analysisId: string,
  userId: string,
): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM public.resume_analyses WHERE id = $1 AND user_id = $2 RETURNING id",
    [analysisId, userId],
  );
  return result.rowCount !== null && result.rowCount > 0;
}
