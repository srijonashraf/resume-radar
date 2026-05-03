import pool from "../config/database.js";
import type { Rewrite } from "@resumetra/shared";

interface SaveRewritesInput {
  analysisId: string;
  rewrites: Rewrite[];
}

export async function saveRewrites(input: SaveRewritesInput): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Look up section DB UUIDs for this analysis
    const sectionRows = await client.query(
      "SELECT id, section_data FROM public.resume_sections WHERE analysis_id = $1 ORDER BY display_order",
      [input.analysisId],
    );

    // Map section_data item IDs to DB UUIDs
    const sectionIdMap = new Map<string, string>();
    for (const row of sectionRows.rows) {
      const items = row.section_data as { id?: string }[];
      if (items?.[0]?.id) {
        sectionIdMap.set(items[0].id, row.id);
      }
    }

    // Delete existing rewrites (upsert pattern)
    await client.query(
      "DELETE FROM public.resume_tailor_rewrites WHERE analysis_id = $1",
      [input.analysisId],
    );

    // Insert rewrites
    for (const rewrite of input.rewrites) {
      const dbSectionId = sectionIdMap.get(rewrite.sectionId);
      if (!dbSectionId) continue;

      await client.query(
        `INSERT INTO public.resume_tailor_rewrites
          (analysis_id, section_id, item_id, field, before_text, after_text, rationale, keywords_added, gap_classification, accepted)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          input.analysisId,
          dbSectionId,
          rewrite.itemId,
          rewrite.field,
          rewrite.before,
          rewrite.after,
          rewrite.rationale,
          rewrite.keywordsAdded,
          rewrite.gapClassification,
          rewrite.accepted,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function loadRewrites(analysisId: string): Promise<Rewrite[]> {
  const result = await pool.query(
    `SELECT rtr.id, rtr.item_id, rtr.field, rtr.before_text, rtr.after_text,
            rtr.rationale, rtr.keywords_added, rtr.gap_classification, rtr.accepted,
            rs.section_data
     FROM public.resume_tailor_rewrites rtr
     JOIN public.resume_sections rs ON rtr.section_id = rs.id
     WHERE rtr.analysis_id = $1`,
    [analysisId],
  );

  return result.rows.map((row) => {
    const sectionData = row.section_data as { id?: string }[];
    const sectionId = sectionData?.[0]?.id ?? "unknown";

    return {
      id: row.id,
      sectionId,
      itemId: row.item_id,
      field: row.field,
      before: row.before_text ?? "",
      after: row.after_text ?? "",
      rationale: row.rationale ?? "",
      keywordsAdded: row.keywords_added ?? [],
      gapClassification: row.gap_classification,
      accepted: row.accepted,
    };
  });
}

export async function updateRewriteAcceptance(
  rewriteId: string,
  accepted: boolean,
): Promise<{ id: string; accepted: boolean }> {
  const result = await pool.query(
    `UPDATE public.resume_tailor_rewrites
     SET accepted = $1
     WHERE id = $2
     RETURNING id, accepted`,
    [accepted, rewriteId],
  );

  return {
    id: result.rows[0].id,
    accepted: result.rows[0].accepted,
  };
}
